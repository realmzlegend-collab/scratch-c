const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Helper to generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/signup
// @desc    Register a new user manually
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ error: 'User already exists' });

        user = new User({
            username,
            password, // Note: In production, hash this using bcrypt
            status: 'active',
            balance: 0,
            scratchCards: 0
        });

        await user.save();
        const token = generateToken(user._id);

        res.status(201).json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Manual login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/auth/telegram
// @desc    Telegram Web App Auth
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ error: 'No data provided' });

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        const userDate = JSON.parse(urlParams.get('user'));

        // Verify Telegram Hash
        const dataCheckString = Array.from(urlParams.entries())
            .filter(([key]) => key !== 'hash')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN || '').digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            return res.status(401).json({ error: 'Invalid Telegram authentication' });
        }

        let user = await User.findOne({ telegramId: userDate.id.toString() });

        if (!user) {
            user = new User({
                telegramId: userDate.id.toString(),
                username: userDate.username || userDate.first_name,
                status: 'active'
            });
            await user.save();
        }

        const token = generateToken(user._id);
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/auth/profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
