const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Cinema = require('../models/Cinema');
const Marketplace = require('../models/Marketplace');
const Transaction = require('../models/Transaction');

// Admin verification
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { pin, command } = req.body;

        if (pin !== process.env.ADMIN_PIN) {
            return res.status(401).json({ error: 'Invalid admin pin' });
        }

        if (command !== 'MENU BOUNCER 0 REAL TO 1') {
            return res.status(401).json({ error: 'Invalid command' });
        }

        // Update user to admin
        await User.findByIdAndUpdate(req.user._id, { isAdmin: true });

        res.json({ message: 'Admin access granted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const totalBooks = await Book.countDocuments();
        const totalMovies = await Cinema.countDocuments();
        const totalTransactions = await Transaction.countDocuments();

        // Calculate total platform earnings (20% from all transactions)
        const platformEarnings = await Transaction.aggregate([
            { $match: { platformFee: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$platformFee' } } }
        ]);

        // Recent transactions
        const recentTransactions = await Transaction.find()
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            totalUsers,
            activeUsers,
            totalBooks,
            totalMovies,
            totalTransactions,
            platformEarnings: platformEarnings[0]?.total || 0,
            recentTransactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User management
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user status
router.put('/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');

        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user balance
router.put('/users/:id/balance', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { amount, operation } = req.body; // operation: 'add' or 'subtract'
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let newBalance;
        if (operation === 'add') {
            newBalance = user.balance + amount;
        } else if (operation === 'subtract') {
            newBalance = user.balance - amount;
        }

        user.balance = newBalance;
        await user.save();

        res.json({ 
            user: user.toObject(),
            newBalance 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cinema management
router.post('/cinema/voting', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const movieData = {
            ...req.body,
            category: 'voting',
            addedBy: req.user._id
        };

        const movie = new Cinema(movieData);
        await movie.save();

        res.status(201).json({ movie });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/cinema/watching', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const movieData = {
            ...req.body,
            category: 'watching',
            addedBy: req.user._id
        };

        const movie = new Cinema(movieData);
        await movie.save();

        res.status(201).json({ movie });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set movie as now playing
router.put('/cinema/:id/set-playing', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { scheduledTime } = req.body;
        const movie = await Cinema.findByIdAndUpdate(
            req.params.id,
            { 
                category: 'watching',
                scheduledTime: new Date(scheduledTime),
                isActive: true
            },
            { new: true }
        );

        res.json({ movie });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Book management
router.delete('/books/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.json({ message: 'Book deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Marketplace management
router.delete('/marketplace/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Marketplace.findByIdAndDelete(req.params.id);
        res.json({ message: 'Marketplace item deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Execute admin command
router.post('/command', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { command } = req.body;
        
        // Parse and execute command
        // Example commands:
        // "ADD_ANNOUNCEMENT:Welcome to Scratch C!"
        // "CLOSE_CINEMA"
        // "OPEN_CINEMA"
        // "SET_VOTING_TIME:24h"
        
        let response = { message: 'Command executed' };
        
        if (command.startsWith('ADD_ANNOUNCEMENT:')) {
            const announcement = command.split(':')[1];
            // Save announcement to database or send to all users
            response.announcement = announcement;
        } else if (command === 'CLOSE_CINEMA') {
            await Cinema.updateMany({}, { isActive: false });
            response.message = 'Cinema closed';
        } else if (command === 'OPEN_CINEMA') {
            await Cinema.updateMany({}, { isActive: true });
            response.message = 'Cinema opened';
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
