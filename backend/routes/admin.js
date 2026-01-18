const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get Admin Stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            activeUsers: await User.countDocuments({ status: 'active' }),
            totalBalance: await User.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
            recentTransactions: await Transaction.find().sort({ createdAt: -1 }).limit(5)
        };
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
