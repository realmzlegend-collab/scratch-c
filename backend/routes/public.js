const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const axios = require('axios');
const crypto = require('crypto');

// Initialize Paystack subscription
router.post('/subscribe-reading', authMiddleware, async (req, res) => {
    try {
        const { email, amount } = req.body;
        const user = await User.findById(req.user._id);
        
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: email || user.email,
            amount: amount * 100, // Paystack uses kobo
            metadata: { userId: user._id, subscriptionType: 'reading_upload' }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ success: true, data: response.data.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; // Essential for server.js
