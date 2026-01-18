const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || '83223668db45ae24af4481d9bcbfe1d9';

// 1. MANUAL SIGNUP
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ success: false, error: 'User already exists' });

        user = new User({ username, password, status: 'active', balance: 50 });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. MANUAL LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. TELEGRAM AUTH
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        const telegramUser = JSON.parse(params.get('user'));

        // Validation Logic
        const dataCheckString = Array.from(params.entries())
            .filter(([key]) => key !== 'hash')
            .sort().map(([key, value]) => `${key}=${value}`).join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) return res.status(401).json({ success: false, error: 'Auth failed' });

        let user = await User.findOne({ telegramId: telegramUser.id.toString() });
        if (!user) {
            user = new User({ telegramId: telegramUser.id.toString(), username: telegramUser.username, status: 'active', balance: 50 });
            await user.save();
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
