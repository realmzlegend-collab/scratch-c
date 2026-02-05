const express = require('express');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Movie = require('../models/Movie');
const MarketplaceItem = require('../models/MarketplaceItem');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        // Get basic counts
        const [
            totalUsers,
            activeUsers,
            totalBooks,
            totalMovies,
            totalItems,
            totalTransactions
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ 
                lastActivity: { $gte: lastWeek },
                status: 'active'
            }),
            Book.countDocuments({ status: 'published' }),
            Movie.countDocuments(),
            MarketplaceItem.countDocuments({ status: 'active' }),
            Transaction.countDocuments({ status: 'completed' })
        ]);
        
        // Get platform earnings
        const earningsResult = await Transaction.aggregate([
            { 
                $match: { 
                    type: 'platform_fee',
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        
        // Get today's earnings
        const todayEarnings = await Transaction.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: today },
                    status: 'completed',
                    amount: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        
        // Get user growth
        const userGrowth = await User.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
        ]);
        
        // Get recent transactions
        const recentTransactions = await Transaction.find({ status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'username')
            .populate('relatedUser', 'username')
            .populate('book', 'title')
            .populate('movie', 'title')
            .populate('marketplaceItem', 'title');
        
        // Get top earners
        const topEarners = await User.find({ status: 'active' })
            .select('username profilePic totalEarned balance booksRead moviesWatched')
            .sort({ totalEarned: -1 })
            .limit(10);
        
        // Get recent signups
        const recentSignups = await User.find({ status: 'active' })
            .select('username email createdAt lastLogin')
            .sort({ createdAt: -1 })
            .limit(10);
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalBooks,
                totalMovies,
                totalItems,
                totalTransactions,
                platformEarnings: earningsResult[0]?.total || 0,
                todayEarnings: todayEarnings[0]?.total || 0,
                averageEarningsPerUser: totalUsers > 0 ? (earningsResult[0]?.total || 0) / totalUsers : 0
            },
            charts: {
                userGrowth: userGrowth.map(item => ({
                    date: `${item._id.year}-${item._id.month}-${item._id.day}`,
                    count: item.count
                }))
            },
            recentTransactions: recentTransactions.map(trans => ({
                id: trans._id,
                type: trans.type,
                amount: trans.amount,
                description: trans.description,
                user: trans.user ? { username: trans.user.username } : null,
                relatedUser: trans.relatedUser ? { username: trans.relatedUser.username } : null,
                book: trans.book ? { title: trans.book.title } : null,
                movie: trans.movie ? { title: trans.movie.title } : null,
                item: trans.marketplaceItem ? { title: trans.marketplaceItem.title } : null,
                createdAt: trans.createdAt
            })),
            topEarners: topEarners.map(user => ({
                id: user._id,
                username: user.username,
                profilePic: user.profilePic,
                totalEarned: user.totalEarned,
                balance: user.balance,
                booksRead: user.booksRead,
                moviesWatched: user.moviesWatched
            })),
            recentSignups: recentSignups.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }))
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            search = '',
            status = '',
            role = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
        
        // Build query
        const query = {};
        
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (status) {
            query.status = status;
        }
        
        if (role) {
            query.role = role;
        }
        
        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);
        
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                profilePic: user.profilePic,
                role: user.role,
                status: user.status,
                balance: user.balance,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent,
                booksRead: user.booksRead,
                moviesWatched: user.moviesWatched,
                tasksCompleted: user.tasksCompleted,
                subscriptionType: user.subscriptionType,
                referralCount: user.referralCount,
                followersCount: user.followersCount,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                lastActivity: user.lastActivity,
                ipAddresses: user.ipAddresses
            })),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            hasNextPage: page * limit < total
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/admin/users/:userId
// @desc    Get detailed user information
router.get('/users/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId)
            .select('-password')
            .populate('referredBy', 'username')
            .populate('followers', 'username')
            .populate('following', 'username');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Get user's transactions
        const transactions = await Transaction.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);
        
        // Get user's books
        const books = await Book.find({ author: userId })
            .select('title genre readCount totalEarnings status')
            .limit(20);
        
        // Get user's marketplace items
        const items = await MarketplaceItem.find({ seller: userId })
            .select('title price category status viewCount')
            .limit(20);
        
        // Get user's movies
        const movies = await Movie.find({ addedBy: userId })
            .select('title status voteCount watchCount')
            .limit(20);
        
        res.json({
            success: true,
            user,
            stats: {
                totalTransactions: transactions.length,
                totalBooks: books.length,
                totalItems: items.length,
                totalMovies: movies.length,
                totalEarnings: user.totalEarned,
                totalSpent: user.totalSpent,
                totalWithdrawn: user.totalWithdrawn,
                netEarnings: user.totalEarned - user.totalSpent - user.totalWithdrawn
            },
            recentTransactions: transactions,
            books,
            items,
            movies
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/users/:userId
// @desc    Update user information
router.put('/users/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        
        // Prevent updating sensitive fields
        delete updates.password;
        delete updates.email;
        delete updates.username;
        
        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/users/:userId/balance
// @desc    Adjust user balance
router.put('/users/:userId/balance', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount, operation, reason } = req.body;
        
        if (!amount || !operation || !['add', 'subtract'].includes(operation)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid parameters'
            });
        }
        
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be positive'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const transactionType = operation === 'add' ? 'admin_credit' : 'admin_debit';
        const description = reason || `Admin ${operation}ed balance`;
        
        // Update user balance
        const result = await user.updateBalance(
            amount, 
            operation === 'add' ? 'add' : 'subtract',
            description
        );
        
        // Record transaction
        const transaction = new Transaction({
            reference: `ADMIN-${Date.now()}`,
            user: user._id,
            type: transactionType,
            amount: operation === 'add' ? amount : -amount,
            description,
            status: 'completed',
            admin: req.user._id,
            previousBalance: result.oldBalance,
            newBalance: result.newBalance,
            metadata: { adminId: req.user._id, reason }
        });
        
        await transaction.save();
        
        res.json({
            success: true,
            message: `Balance ${operation}ed successfully`,
            user: {
                id: user._id,
                username: user.username,
                balance: user.balance,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent
            },
            transaction: {
                amount: operation === 'add' ? amount : -amount,
                description,
                previousBalance: result.oldBalance,
                newBalance: result.newBalance
            }
        });
    } catch (error) {
        console.error('Adjust balance error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Server error' 
        });
    }
});

// @route   PUT /api/admin/users/:userId/status
// @desc    Update user status
router.put('/users/:userId/status', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;
        
        if (!status || !['active', 'suspended', 'banned', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Record status change
        const transaction = new Transaction({
            reference: `STATUS-${Date.now()}`,
            user: user._id,
            type: 'system_debit',
            amount: 0,
            description: `Account status changed to ${status}${reason ? `: ${reason}` : ''}`,
            status: 'completed',
            admin: req.user._id
        });
        
        await transaction.save();
        
        res.json({
            success: true,
            message: `User status updated to ${status}`,
            user: {
                id: user._id,
                username: user.username,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/users/:userId/role
// @desc    Update user role
router.put('/users/:userId/role', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        if (!role || !['user', 'admin', 'moderator'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: `User role updated to ${role}`,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user (soft delete)
router.delete('/users/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                status: 'inactive',
                email: `deleted_${Date.now()}_${user.email}`,
                username: `deleted_${Date.now()}_${user.username}`
            },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/admin/transactions
// @desc    Get all transactions with filters
router.get('/transactions', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50,
            type = '',
            status = '',
            userId = '',
            startDate = '',
            endDate = '',
            minAmount = '',
            maxAmount = ''
        } = req.query;
        
        const skip = (page - 1) * limit;
        
        // Build query
        const query = {};
        
        if (type) query.type = type;
        if (status) query.status = status;
        if (userId) query.user = userId;
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }
        
        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('user', 'username')
                .populate('relatedUser', 'username')
                .populate('book', 'title')
                .populate('movie', 'title')
                .populate('marketplaceItem', 'title')
                .populate('admin', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Transaction.countDocuments(query)
        ]);
        
        // Calculate totals
        const totals = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    totalNetAmount: { $sum: '$netAmount' },
                    totalFee: { $sum: '$fee' },
                    totalTax: { $sum: '$tax' }
                }
            }
        ]);
        
        res.json({
            success: true,
            transactions,
            totals: totals[0] || {
                totalAmount: 0,
                totalNetAmount: 0,
                totalFee: 0,
                totalTax: 0
            },
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            hasNextPage: page * limit < total
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/admin/books
// @desc    Get all books with filters
router.get('/books', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50,
            status = '',
            genre = '',
            authorId = '',
            search = '',
            minReadCount = '',
            maxReadCount = ''
        } = req.query;
        
        const skip = (page - 1) * limit;
        
        // Build query
        const query = {};
        
        if (status) query.status = status;
        if (genre) query.genre = genre;
        if (authorId) query.author = authorId;
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { authorName: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (minReadCount || maxReadCount) {
            query.readCount = {};
            if (minReadCount) query.readCount.$gte = parseInt(minReadCount);
            if (maxReadCount) query.readCount.$lte = parseInt(maxReadCount);
        }
        
        const [books, total] = await Promise.all([
            Book.find(query)
                .populate('author', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Book.countDocuments(query)
        ]);
        
        // Calculate total earnings from books
        const earnings = await Book.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$totalEarnings' },
                    totalReadCount: { $sum: '$readCount' }
                }
            }
        ]);
        
        res.json({
            success: true,
            books: books.map(book => ({
                id: book._id,
                title: book.title,
                author: book.author ? {
                    id: book.author._id,
                    username: book.author.username
                } : null,
                authorName: book.authorName,
                genre: book.genre,
                coverImage: book.coverImage,
                summary: book.summary.substring(0, 200) + '...',
                readCount: book.readCount,
                likeCount: book.likeCount,
                totalEarnings: book.totalEarnings,
                status: book.status,
                isFeatured: book.isFeatured,
                chaptersCount: book.chapters.length,
                totalPages: book.totalPages,
                createdAt: book.createdAt,
                publishedAt: book.publishedAt
            })),
            stats: earnings[0] || {
                totalEarnings: 0,
                totalReadCount: 0
            },
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            hasNextPage: page * limit < total
        });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/books/:bookId
// @desc    Update book status
router.put('/books/:bookId', adminAuth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { status, isFeatured, isVerified } = req.body;
        
        const updates = {};
        if (status) updates.status = status;
        if (isFeatured !== undefined) updates.isFeatured = isFeatured;
        if (isVerified !== undefined) updates.isVerified = isVerified;
        if (isFeatured) updates.featuredAt = new Date();
        
        const book = await Book.findByIdAndUpdate(
            bookId,
            updates,
            { new: true }
        ).populate('author', 'username');
        
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Book updated successfully',
            book: {
                id: book._id,
                title: book.title,
                status: book.status,
                isFeatured: book.isFeatured,
                isVerified: book.isVerified,
                author: book.author ? {
                    username: book.author.username
                } : null
            }
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/admin/movies
// @desc    Get all movies with filters
router.get('/movies', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50,
            status = '',
            addedById = '',
            search = '',
            minVoteCount = '',
            minWatchCount = ''
        } = req.query;
        
        const skip = (page - 1) * limit;
        
        // Build query
        const query = {};
        
        if (status) query.status = status;
        if (addedById) query.addedBy = addedById;
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { addedByName: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (minVoteCount) query.voteCount = { $gte: parseInt(minVoteCount) };
        if (minWatchCount) query.watchCount = { $gte: parseInt(minWatchCount) };
        
        const [movies, total] = await Promise.all([
            Movie.find(query)
                .populate('addedBy', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Movie.countDocuments(query)
        ]);
        
        res.json({
            success: true,
            movies: movies.map(movie => ({
                id: movie._id,
                title: movie.title,
                description: movie.description.substring(0, 200) + '...',
                thumbnail: movie.thumbnail,
                addedBy: movie.addedBy ? {
                    id: movie.addedBy._id,
                    username: movie.addedBy.username
                } : null,
                addedByName: movie.addedByName,
                voteCount: movie.voteCount,
                watchCount: movie.watchCount,
                status: movie.status,
                scheduledTime: movie.scheduledTime,
                duration: movie.duration,
                totalEarnings: movie.totalEarnings,
                createdAt: movie.createdAt
            })),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            hasNextPage: page * limit < total
        });
    } catch (error) {
        console.error('Get movies error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/movies/:movieId/set-playing
// @desc    Set movie as now playing
router.put('/movies/:movieId/set-playing', adminAuth, async (req, res) => {
    try {
        const { movieId } = req.params;
        const { scheduledTime } = req.body;
        
        // Clear any currently playing movie
        await Movie.updateMany(
            { status: 'playing' },
            { 
                status: 'completed',
                endedAt: new Date()
            }
        );
        
        // Set new movie as playing
        const movie = await Movie.findByIdAndUpdate(
            movieId,
            {
                status: 'playing',
                scheduledTime: scheduledTime || new Date(),
                startedAt: new Date()
            },
            { new: true }
        ).populate('addedBy', 'username');
        
        if (!movie) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Movie set as now playing',
            movie: {
                id: movie._id,
                title: movie.title,
                status: movie.status,
                scheduledTime: movie.scheduledTime,
                addedBy: movie.addedBy ? {
                    username: movie.addedBy.username
                } : null
            }
        });
    } catch (error) {
        console.error('Set playing movie error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/admin/marketplace
// @desc    Get all marketplace items
router.get('/marketplace', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50,
            status = '',
            category = '',
            sellerId = '',
            search = '',
            minPrice = '',
            maxPrice = ''
        } = req.query;
        
        const skip = (page - 1) * limit;
        
        // Build query
        const query = {};
        
        if (status) query.status = status;
        if (category) query.category = category;
        if (sellerId) query.seller = sellerId;
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { sellerName: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }
        
        const [items, total] = await Promise.all([
            MarketplaceItem.find(query)
                .populate('seller', 'username')
                .populate('buyer', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            MarketplaceItem.countDocuments(query)
        ]);
        
        // Calculate total sales
        const sales = await MarketplaceItem.aggregate([
            { $match: { ...query, status: 'sold' } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$soldPrice' },
                    totalItems: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            success: true,
            items: items.map(item => ({
                id: item._id,
                title: item.title,
                description: item.description.substring(0, 200) + '...',
                price: item.price,
                category: item.category,
                condition: item.condition,
                seller: item.seller ? {
                    id: item.seller._id,
                    username: item.seller.username
                } : null,
                sellerName: item.sellerName,
                buyer: item.buyer ? {
                    id: item.buyer._id,
                    username: item.buyer._username
                } : null,
                status: item.status,
                viewCount: item.viewCount,
                favoriteCount: item.favoriteCount,
                images: item.images.length,
                isFeatured: item.isFeatured,
                createdAt: item.createdAt,
                soldAt: item.soldAt,
                soldPrice: item.soldPrice
            })),
            stats: sales[0] || {
                totalSales: 0,
                totalItems: 0
            },
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            hasNextPage: page * limit < total
        });
    } catch (error) {
        console.error('Get marketplace items error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/marketplace/:itemId
// @desc    Update marketplace item
router.put('/marketplace/:itemId', adminAuth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { status, isFeatured, isVerified } = req.body;
        
        const updates = {};
        if (status) updates.status = status;
        if (isFeatured !== undefined) updates.isFeatured = isFeatured;
        if (isVerified !== undefined) updates.isVerified = isVerified;
        if (isFeatured) updates.featuredAt = new Date();
        
        const item = await MarketplaceItem.findByIdAndUpdate(
            itemId,
            updates,
            { new: true }
        ).populate('seller', 'username');
        
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Item updated successfully',
            item: {
                id: item._id,
                title: item.title,
                status: item.status,
                isFeatured: item.isFeatured,
                isVerified: item.isVerified,
                seller: item.seller ? {
                    username: item.seller.username
                } : null
            }
        });
    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/admin/announcements
// @desc    Create announcement
router.post('/announcements', adminAuth, async (req, res) => {
    try {
        const { title, message, type = 'info', target = 'all', expiryDate } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Title and message are required'
            });
        }
        
        // In a real app, save to Announcement model
        // For now, just return success
        
        res.json({
            success: true,
            message: 'Announcement created successfully',
            announcement: {
                id: `announcement_${Date.now()}`,
                title,
                message,
                type,
                target,
                createdBy: req.user.username,
                createdAt: new Date(),
                expiryDate: expiryDate ? new Date(expiryDate) : null
            }
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/admin/command
// @desc    Execute admin command
router.post('/command', adminAuth, async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }
        
        let message = '';
        
        // Process commands
        if (command.startsWith('CLOSE_CINEMA')) {
            await Movie.updateMany(
                { status: 'playing' },
                { 
                    status: 'completed',
                    endedAt: new Date()
                }
            );
            message = 'Cinema closed successfully';
            
        } else if (command.startsWith('OPEN_CINEMA')) {
            // Find most voted movie and set as playing
            const topMovie = await Movie.findOne({ status: 'voting' })
                .sort({ voteCount: -1 });
            
            if (topMovie) {
                await Movie.updateMany(
                    { status: 'playing' },
                    { 
                        status: 'completed',
                        endedAt: new Date()
                    }
                );
                
                topMovie.status = 'playing';
                topMovie.scheduledTime = new Date();
                topMovie.startedAt = new Date();
                await topMovie.save();
                
                message = `Cinema opened with "${topMovie.title}"`;
            } else {
                message = 'No voting movies available';
            }
            
        } else if (command.startsWith('ADD_ANNOUNCEMENT:')) {
            const announcementText = command.split(':')[1];
            message = `Announcement added: ${announcementText}`;
            
        } else if (command.startsWith('SET_VOTING_TIME:')) {
            const time = command.split(':')[1];
            message = `Voting time set to ${time}`;
            
        } else if (command === 'CLEAR_CACHE') {
            message = 'Cache cleared (placeholder)';
            
        } else if (command === 'UPDATE_STATS') {
            // Recalculate user stats
            const users = await User.find({});
            for (const user of users) {
                const transactions = await Transaction.find({ user: user._id, status: 'completed' });
                const earnings = transactions
                    .filter(t => t.amount > 0)
                    .reduce((sum, t) => sum + t.amount, 0);
                const expenses = transactions
                    .filter(t => t.amount < 0)
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                
                user.totalEarned = earnings;
                user.totalSpent = expenses;
                user.balance = earnings - expenses;
                await user.save();
            }
            message = 'User stats updated successfully';
            
        } else {
            return res.status(400).json({
                success: false,
                error: 'Unknown command'
            });
        }
        
        // Log command execution
        const transaction = new Transaction({
            reference: `CMD-${Date.now()}`,
            user: req.user._id,
            type: 'system_debit',
            amount: 0,
            description: `Admin command executed: ${command}`,
            status: 'completed',
            admin: req.user._id
        });
        await transaction.save();
        
        res.json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Execute command error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

module.exports = router;
