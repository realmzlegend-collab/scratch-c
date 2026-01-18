const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Standardized payment route example
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const history = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; // Essential for server.js
