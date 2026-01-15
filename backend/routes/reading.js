const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all books
router.get('/books', auth, async (req, res) => {
    try {
        const { genre, search, sort } = req.query;
        let query = { isPublished: true };
        
        // Genre filter
        if (genre && genre !== 'all') {
            query.genre = genre;
        }
        
        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Sort options
        let sortOption = { createdAt: -1 };
        if (sort === 'popular') sortOption = { reads: -1 };
        if (sort === 'rating') sortOption = { rating: -1 };
        if (sort === 'donations') sortOption = { totalDonations: -1 };
        
        const books = await Book.find(query)
            .populate('author', 'username')
            .sort(sortOption)
            .limit(50);
        
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single book
router.get('/book/:id', auth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate('author', 'username profilePic')
            .populate('donations.userId', 'username')
            .populate('reviews.userId', 'username profilePic');
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Increment view count
        book.views += 1;
        await book.save();
        
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get genres
router.get('/genres', auth, async (req, res) => {
    try {
        const genres = await Book.aggregate([
            { $match: { isPublished: true } },
            { $group: { 
                _id: '$genre', 
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
        ]);
        
        // Add "All" genre
        const totalBooks = await Book.countDocuments({ isPublished: true });
        const allGenre = {
            _id: 'all',
            name: 'All',
            icon: '📚',
            count: totalBooks
        };
        
        // Map genre IDs to names and icons
        const genreMap = {
            'novel': { name: 'Novel', icon: '📖' },
            'poetry': { name: 'Poetry', icon: '✍️' },
            'drama': { name: 'Drama', icon: '🎭' },
            'prose': { name: 'Prose', icon: '📝' },
            'short-story': { name: 'Short Story', icon: '📖' },
            'non-fiction': { name: 'Non-Fiction', icon: '📊' },
            'biography': { name: 'Biography', icon: '👤' },
            'fantasy': { name: 'Fantasy', icon: '🐉' },
            'romance': { name: 'Romance', icon: '❤️' },
            'mystery': { name: 'Mystery', icon: '🕵️' },
            'others': { name: 'Others', icon: '📚' }
        };
        
        const formattedGenres = genres.map(genre => ({
            _id: genre._id,
            name: genreMap[genre._id]?.name || genre._id,
            icon: genreMap[genre._id]?.icon || '📚',
            count: genre.count
        }));
        
        res.json([allGenre, ...formattedGenres]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Upload book
router.post('/upload', auth, async (req, res) => {
    try {
        const { title, genre, description, coverImage, content, tags } = req.body;
        
        if (!content || content.trim().length < 100) {
            return res.status(400).json({ message: 'Book content must be at least 100 characters' });
        }
        
        const book = new Book({
            title,
            genre,
            description,
            coverImage,
            content,
            tags: tags || [],
            author: req.user.id
        });
        
        await book.save();
        
        res.status(201).json({ 
            message: 'Book published successfully',
            book 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Save book to library
router.post('/save', auth, async (req, res) => {
    try {
        const { bookId } = req.body;
        
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Check if already saved
        const alreadySaved = book.saves.some(save => 
            save.userId.toString() === req.user.id
        );
        
        if (!alreadySaved) {
            book.saves.push({
                userId: req.user.id,
                savedAt: new Date()
            });
            await book.save();
        }
        
        // Add to user's reading history
        const alreadyInHistory = req.user.readingHistory.some(item => 
            item.bookId.toString() === bookId
        );
        
        if (!alreadyInHistory) {
            req.user.readingHistory.push({
                bookId: bookId,
                lastPage: 0,
                lastRead: new Date()
            });
            await req.user.save();
        }
        
        res.json({ message: 'Book saved to library' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user library
router.get('/library', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate({
                path: 'readingHistory.bookId',
                select: 'title author genre coverImage pages',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            });
        
        res.json(user.readingHistory || []);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Save reading progress
router.post('/progress', auth, async (req, res) => {
    try {
        const { bookId, chapter, page } = req.body;
        
        // Update user's reading history
        const historyIndex = req.user.readingHistory.findIndex(
            item => item.bookId.toString() === bookId
        );
        
        if (historyIndex >= 0) {
            req.user.readingHistory[historyIndex].lastPage = page;
            req.user.readingHistory[historyIndex].lastChapter = chapter;
            req.user.readingHistory[historyIndex].lastRead = new Date();
        } else {
            req.user.readingHistory.push({
                bookId,
                lastPage: page,
                lastChapter: chapter,
                lastRead: new Date()
            });
        }
        
        await req.user.save();
        
        // Update book reads count
        await Book.findByIdAndUpdate(bookId, {
            $inc: { reads: 1 }
        });
        
        res.json({ message: 'Progress saved' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Donate to book
router.post('/donate', auth, async (req, res) => {
    try {
        const { bookId, amount } = req.body;
        
        if (amount < 100) {
            return res.status(400).json({ message: 'Minimum donation is ₦100' });
        }
        
        if (req.user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        
        // Deduct from user balance
        req.user.balance -= amount;
        req.user.donationsMade = (req.user.donationsMade || 0) + amount;
        await req.user.save();
        
        // Add to book donations
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        book.donations.push({
            userId: req.user.id,
            amount,
            donatedAt: new Date()
        });
        
        book.totalDonations += amount;
        await book.save();
        
        // Add to author's balance (80% of donation, 20% platform fee)
        const authorAmount = amount * 0.80;
        const platformFee = amount * 0.20;
        
        await User.findByIdAndUpdate(book.author, {
            $inc: { balance: authorAmount }
        });
        
        res.json({ 
            message: 'Donation successful',
            donated: amount,
            authorReceived: authorAmount,
            platformFee: platformFee
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add review
router.post('/review', auth, async (req, res) => {
    try {
        const { bookId, rating, comment } = req.body;
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Check if already reviewed
        const existingReview = book.reviews.find(
            review => review.userId.toString() === req.user.id
        );
        
        if (existingReview) {
            // Update existing review
            existingReview.rating = rating;
            existingReview.comment = comment;
            existingReview.createdAt = new Date();
        } else {
            // Add new review
            book.reviews.push({
                userId: req.user.id,
                rating,
                comment,
                createdAt: new Date()
            });
        }
        
        // Calculate new average rating
        const totalRating = book.reviews.reduce((sum, review) => sum + review.rating, 0);
        book.rating = totalRating / book.reviews.length;
        
        await book.save();
        
        res.json({ message: 'Review submitted', rating: book.rating });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's uploaded books
router.get('/my-books', auth, async (req, res) => {
    try {
        const books = await Book.find({ author: req.user.id })
            .sort({ createdAt: -1 });
        
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;