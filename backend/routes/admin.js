const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Cinema = require('../models/Cinema');
const Book = require('../models/Book');
const Marketplace = require('../models/Marketplace');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// ==================== ADMIN AUTHENTICATION ====================

// Verify admin access
router.get('/verify', auth, adminAuth, (req, res) => {
    res.json({ message: 'Admin access granted', user: req.user });
});

// ==================== DASHBOARD STATS ====================

// Get dashboard stats
router.get('/stats', auth, adminAuth, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            activeUsers: await User.countDocuments({ isActive: true }),
            pendingVerification: await User.countDocuments({ isVerified: false }),
            totalEarnings: await User.aggregate([
                { $group: { _id: null, total: { $sum: "$totalEarned" } } }
            ]).then(result => result[0]?.total || 0),
            platformEarnings: await User.aggregate([
                { $group: { _id: null, total: { $sum: "$totalEarned" } } }
            ]).then(result => (result[0]?.total || 0) * 0.20), // 20% platform cut
            totalMovies: await Cinema.countDocuments(),
            totalBooks: await Book.countDocuments(),
            activeListings: await Marketplace.countDocuments({ status: 'active' }),
            tasksCompleted: await User.aggregate([
                { $unwind: "$tasksCompleted" },
                { $group: { _id: null, total: { $sum: 1 } } }
            ]).then(result => result[0]?.total || 0),
            pendingWithdrawals: await User.aggregate([
                { $unwind: "$withdrawals" },
                { $match: { "withdrawals.status": "pending" } },
                { $group: { _id: null, total: { $sum: 1 } } }
            ]).then(result => result[0]?.total || 0),
            recentUsers: await User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== USER MANAGEMENT ====================

// Get all users
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (search) {
            query = {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);
        
        res.json({
            users,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single user
router.get('/users/:id', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('readingHistory.bookId', 'title')
            .populate('marketplaceListings', 'title')
            .populate('tasksCompleted');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user verification
router.post('/users/:id/verify', auth, adminAuth, async (req, res) => {
    try {
        const { verify } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.isVerified = verify;
        await user.save();
        
        res.json({ 
            message: `User ${verify ? 'verified' : 'unverified'} successfully`,
            user: {
                id: user._id,
                username: user.username,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user status
router.post('/users/:id/status', auth, adminAuth, async (req, res) => {
    try {
        const { activate } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.isActive = activate;
        await user.save();
        
        res.json({ 
            message: `User ${activate ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user._id,
                username: user.username,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add balance to user
router.post('/users/:id/balance', auth, adminAuth, async (req, res) => {
    try {
        const { amount, reason } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Add to user's balance and total earned
        user.balance += parseFloat(amount);
        user.totalEarned += parseFloat(amount);
        
        // Add transaction record
        user.transactions = user.transactions || [];
        user.transactions.push({
            type: 'admin_add',
            amount: parseFloat(amount),
            reason: reason || 'Admin added balance',
            date: new Date(),
            adminId: req.user.id
        });
        
        await user.save();
        
        res.json({ 
            message: `₦${amount} added to user balance`,
            newBalance: user.balance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if trying to delete self
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        
        await user.deleteOne();
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== CINEMA MANAGEMENT ====================

// Get all movies
router.get('/movies', auth, adminAuth, async (req, res) => {
    try {
        const movies = await Cinema.find()
            .sort({ votes: -1, createdAt: -1 });
        
        res.json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add movie
router.post('/movies', auth, adminAuth, async (req, res) => {
    try {
        const { title, genre, description, duration, director, googleDriveLink, thumbnail, scheduleDate } = req.body;
        
        const movie = new Cinema({
            title,
            genre,
            description,
            duration,
            director,
            googleDriveLink,
            thumbnail,
            scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
            addedBy: req.user.id
        });
        
        await movie.save();
        
        res.status(201).json({ 
            message: 'Movie added successfully',
            movie 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update cinema status
router.post('/cinema/status', auth, adminAuth, async (req, res) => {
    try {
        const { status } = req.body; // 'open' or 'closed'
        
        // In a real app, you would save this to a settings collection
        // For now, we'll just return success
        
        res.json({ 
            message: `Cinema ${status === 'open' ? 'opened' : 'closed'} successfully`,
            status 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ANNOUNCEMENTS ====================

// Get announcements
router.get('/announcements', auth, adminAuth, async (req, res) => {
    try {
        // In a real app, you would have an Announcement model
        // For now, return empty array or mock data
        const announcements = [];
        
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Send announcement
router.post('/announcements', auth, adminAuth, async (req, res) => {
    try {
        const { title, message, target, page, priority, specificUsers } = req.body;
        
        // In a real app, you would:
        // 1. Save announcement to database
        // 2. Send notifications to target users
        // 3. Possibly send emails
        
        const announcement = {
            title,
            message,
            target,
            page,
            priority,
            specificUsers,
            sentBy: req.user.id,
            sentAt: new Date(),
            reach: 0 // Estimated users reached
        };
        
        // Mock sending to users
        let userQuery = {};
        if (target === 'verified') userQuery = { isVerified: true };
        if (target === 'unverified') userQuery = { isVerified: false };
        if (target === 'active') {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            userQuery = { lastActive: { $gte: weekAgo } };
        }
        
        if (target === 'specific' && specificUsers) {
            userQuery = { _id: { $in: specificUsers } };
        }
        
        const estimatedUsers = await User.countDocuments(userQuery);
        announcement.reach = estimatedUsers;
        
        res.json({ 
            message: 'Announcement sent successfully',
            announcement,
            estimatedReach: estimatedUsers
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== TEXT COMMANDS ====================

// Get commands
router.get('/commands', auth, adminAuth, async (req, res) => {
    try {
        // In a real app, you would have a Command model
        // For now, return mock data
        const commands = [
            {
                _id: '1',
                trigger: '/help',
                action: 'message',
                message: 'Welcome to Scratch C! Available commands: /balance, /tasks, /support',
                access: 'all',
                active: true,
                createdAt: new Date('2024-01-01')
            },
            {
                _id: '2',
                trigger: '!bonus',
                action: 'reward',
                reward: 100,
                access: 'admin',
                active: true,
                createdAt: new Date('2024-01-15')
            }
        ];
        
        res.json(commands);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create command
router.post('/commands', auth, adminAuth, async (req, res) => {
    try {
        const { trigger, action, access, active, message, reward, url, balance, customCode } = req.body;
        
        // Validate trigger
        if (!trigger || trigger.trim() === '') {
            return res.status(400).json({ message: 'Command trigger is required' });
        }
        
        // In a real app, you would save to Command model
        const command = {
            trigger,
            action,
            access,
            active: active !== false,
            createdAt: new Date(),
            createdBy: req.user.id
        };
        
        // Add action-specific data
        switch(action) {
            case 'message':
                command.message = message;
                break;
            case 'reward':
                command.reward = reward;
                break;
            case 'redirect':
                command.url = url;
                break;
            case 'add_balance':
                command.balance = balance;
                break;
            case 'custom':
                command.customCode = customCode;
                break;
        }
        
        res.status(201).json({ 
            message: 'Command created successfully',
            command 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== SYSTEM LOGS ====================

// Get logs
router.get('/logs', auth, adminAuth, async (req, res) => {
    try {
        // In a real app, you would have a Log model
        // For now, return mock data
        const logs = [
            {
                timestamp: new Date(Date.now() - 5 * 60 * 1000),
                module: 'User Registration',
                type: 'info',
                message: 'New user registered: john_doe',
                userId: '123'
            },
            {
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                module: 'Withdrawal',
                type: 'info',
                message: 'Withdrawal processed: ₦5,000 to user jane_smith',
                userId: '456'
            },
            {
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                module: 'Security',
                type: 'warning',
                message: 'User mike123 reported for suspicious activity',
                userId: '789'
            },
            {
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                module: 'Earnings',
                type: 'info',
                message: 'Platform earnings: ₦12,500 from 50 tasks'
            }
        ];
        
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Clear logs
router.delete('/logs', auth, adminAuth, async (req, res) => {
    try {
        // In a real app, you would clear logs from database
        // Log this action
        console.log(`Admin ${req.user.username} cleared system logs`);
        
        res.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== MISCELLANEOUS ====================

// Get system info
router.get('/system-info', auth, adminAuth, async (req, res) => {
    try {
        const systemInfo = {
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            database: 'Connected',
            lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000),
            totalStorage: '5 GB',
            usedStorage: '2.3 GB'
        };
        
        res.json(systemInfo);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Backup database
router.post('/backup', auth, adminAuth, async (req, res) => {
    try {
        // In a real app, you would trigger a database backup
        // This is a mock response
        
        res.json({ 
            message: 'Backup initiated successfully',
            backupId: `backup_${Date.now()}`,
            estimatedTime: '2 minutes'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;