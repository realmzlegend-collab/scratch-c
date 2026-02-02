const express = require('express');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Movie = require('../models/Movie');
const MarketplaceItem = require('../models/MarketplaceItem');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalBooks,
            totalMovies,
            totalTransactions,
            totalEarnings
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            Book.countDocuments(),
            Movie.countDocuments(),
            Transaction.countDocuments(),
            Transaction.aggregate([
                { $match: { type: 'platform_fee' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        // Get recent transactions
        const recentTransactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'username')
            .populate('receiverId', 'username')
            .populate('senderId', 'username');

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalBooks,
                totalMovies,
                totalTransactions,
                platformEarnings: totalEarnings[0]?.total || 0
            },
            recentTransactions: recentTransactions.map(t => ({
                id: t._id,
                type: t.type,
                description: t.description,
                amount: t.amount,
                userId: t.userId ? { username: t.userId.username } : null,
                sender: t.senderId ? { username: t.senderId.username } : null,
                receiver: t.receiverId ? { username: t.receiverId.username } : null,
                createdAt: t.createdAt
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
// @desc    Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const query = search ? {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            users,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/users/:userId/status
// @desc    Update user status
router.put('/users/:userId/status', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

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

        res.json({
            success: true,
            message: 'User status updated',
            user
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/users/:userId/balance
// @desc    Update user balance
router.put('/users/:userId/balance', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount, operation } = req.body;

        if (!['add', 'subtract'].includes(operation)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation'
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

        // Update balance
        if (operation === 'add') {
            user.balance += amount;
            user.totalEarned += amount;
        } else {
            if (user.balance < amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient balance'
                });
            }
            user.balance -= amount;
            user.totalSpent += amount;
        }

        await user.save();

        // Record transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'admin_adjustment',
            amount: operation === 'add' ? amount : -amount,
            description: `Admin ${operation}ed balance`,
            adminId: req.user._id
        });
        await transaction.save();

        res.json({
            success: true,
            message: `Balance ${operation}ed successfully`,
            user: {
                id: user._id,
                username: user.username,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/admin/cinema/voting
// @desc    Add movie to voting
router.post('/cinema/voting', adminAuth, async (req, res) => {
    try {
        const { title, googleDriveLink, thumbnail, description } = req.body;

        const movie = new Movie({
            title,
            googleDriveLink,
            thumbnail,
            description,
            addedBy: req.user._id,
            status: 'voting'
        });

        await movie.save();

        res.json({
            success: true,
            message: 'Movie added to voting',
            movie
        });
    } catch (error) {
        console.error('Add voting movie error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/admin/cinema/:movieId/set-playing
// @desc    Set movie as now playing
router.put('/cinema/:movieId/set-playing', adminAuth, async (req, res) => {
    try {
        const { movieId } = req.params;
        const { scheduledTime } = req.body;

        // Clear any currently playing movie
        await Movie.updateMany(
            { status: 'playing' },
            { status: 'completed' }
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
        );

        res.json({
            success: true,
            message: 'Movie set as now playing',
            movie
        });
    } catch (error) {
        console.error('Set playing movie error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/admin/announcements
// @desc    Send announcement
router.post('/announcements', adminAuth, async (req, res) => {
    try {
        const { text, page } = req.body;

        // In a real app, you would save this to database and broadcast via WebSocket
        // For now, we'll just return success

        res.json({
            success: true,
            message: `Announcement sent to ${page} page`,
            announcement: {
                text,
                page,
                sentAt: new Date(),
                sentBy: req.user.username
            }
        });
    } catch (error) {
        console.error('Send announcement error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

module.exports = router;
