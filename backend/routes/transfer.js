const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { receiverUsername, amount, description } = req.body;
        const sender = await User.findById(req.user._id);
        const receiver = await User.findOne({ username: receiverUsername });

        if (!receiver) return res.status(404).json({ success: false, error: 'Receiver not found' });
        if (sender.balance < amount) return res.status(400).json({ success: false, error: 'Insufficient balance' });

        // Update balances
        sender.balance -= amount;
        receiver.balance += (amount * 0.98); // 2% platform fee

        await sender.save();
        await receiver.save();

        res.json({ success: true, message: 'Transfer successful' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; // Essential for server.js
