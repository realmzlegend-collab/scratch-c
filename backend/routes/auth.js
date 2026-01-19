const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || '83223668db45ae24af4481d9bcbfe1d9';

// 1. SIMPLE SIGNUP
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Please provide both username and password' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }

        const user = new User({ username, password });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        
        res.status(201).json({ 
            success: true, 
            token, 
            user: { id: user._id, username: user.username, balance: user.balance } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. SIMPLE LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({ 
            success: true, 
            token, 
            user: { id: user._id, username: user.username, balance: user.balance, isAdmin: user.isAdmin } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. GET PROFILE (Used by Dashboard)
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, error: 'No token' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

module.exports = router;
