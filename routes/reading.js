const express = require('express');
const { auth } = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/reading/books
// @desc    Get books with pagination and filtering
router.get('/books', auth, async (req, res) => {
    try {
        const { genre = 'all', page = 1, limit = 12, search = '' } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = { status: 'published' };
        
        if (genre !== 'all') {
            query.genre = genre;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { authorName: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const [books, total] = await Promise.all([
            Book.find(query)
                .populate('author', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Book.countDocuments(query)
        ]);

        res.json({
            success: true,
            books: books.map(book => ({
                id: book._id,
                title: book.title,
                author: book.authorName,
                authorId: book.author._id,
                genre: book.genre,
                coverImage: book.coverImage,
                summary: book.summary,
                totalPages: book.totalPages,
                readCount: book.readCount,
                likeCount: book.likeCount,
                averageRating: book.averageRating,
                chapters: book.chapters.length
            })),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/reading/upload
// @desc    Upload a book
router.post('/upload', auth, async (req, res) => {
    try {
        const user = req.user;
        const { title, genre, coverImage, summary, tags, chapters } = req.body;

        // Check if user can upload (subscription or trial)
        const canUpload = user.subscriptionActive || 
                         (user.freeTrialUsed && new Date(user.freeTrialExpiry) > new Date());
        
        if (!canUpload) {
            return res.status(403).json({
                success: false,
                error: 'Please subscribe to upload books'
            });
        }

        // Validate chapters
        if (!chapters || chapters.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one chapter is required'
            });
        }

        // Create book
        const book = new Book({
            title,
            genre,
            coverImage: coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            summary,
            tags: tags || [],
            chapters,
            author: user._id,
            authorName: user.username
        });

        await book.save();

        res.json({
            success: true,
            message: 'Book uploaded successfully',
            book: {
                id: book._id,
                title: book.title,
                totalPages: book.totalPages
            }
        });
    } catch (error) {
        console.error('Upload book error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/reading/complete
// @desc    Complete reading session and earn credits
router.post('/complete', auth, async (req, res) => {
    try {
        const { bookId, pagesRead } = req.body;
        const user = req.user;

        // Find book
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Calculate earnings (0.5 credits per page)
        const earnings = pagesRead * 0.5;

        // Update user balance and stats
        await user.updateBalance(earnings, 'add');
        user.booksRead = (user.booksRead || 0) + 1;
        await user.save();

        // Update book stats
        book.readCount = (book.readCount || 0) + 1;
        book.totalEarnings = (book.totalEarnings || 0) + earnings;
        await book.save();

        // Record transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'reading_earnings',
            amount: earnings,
            description: `Read ${pagesRead} pages of "${book.title}"`,
            bookId: book._id
        });
        await transaction.save();

        res.json({
            success: true,
            message: `You earned ${earnings} credits!`,
            earnings,
            newBalance: user.balance
        });
    } catch (error) {
        console.error('Complete reading error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/reading/books/:bookId/like
// @desc    Like/unlike a book
router.post('/books/:bookId/like', auth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const user = req.user;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Check if already liked
        const alreadyLiked = book.likedBy?.includes(user._id);
        
        if (alreadyLiked) {
            // Unlike
            book.likeCount = Math.max(0, book.likeCount - 1);
            book.likedBy = book.likedBy.filter(id => id.toString() !== user._id.toString());
        } else {
            // Like
            book.likeCount = (book.likeCount || 0) + 1;
            if (!book.likedBy) book.likedBy = [];
            book.likedBy.push(user._id);
        }

        await book.save();

        res.json({
            success: true,
            liked: !alreadyLiked,
            likes: book.likeCount
        });
    } catch (error) {
        console.error('Like book error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

module.exports = router;
