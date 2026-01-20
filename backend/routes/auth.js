const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Simple working login - no complex validation
router.post('/login', async (req, res) => {
    try {
        console.log('🔑 Login attempt:', req.body.username);
        
        const { username, password } = req.body;
        
        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Username and password are required' 
            });
        }
        
        // Find user
        const user = await User.findOne({ username });
        
        if (!user) {
            // Auto-create user for testing
            const newUser = new User({
                username,
                password, // Will be hashed by middleware
                balance: 100,
                role: 'user'
            });
            
            await newUser.save();
            
            console.log('✅ New user created:', username);
            
            // Generate token
            const token = jwt.sign(
                { userId: newUser._id, username: newUser.username },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '7d' }
            );
            
            return res.json({
                success: true,
                token,
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    balance: newUser.balance,
                    role: newUser.role
                },
                message: 'Account created and logged in!'
            });
        }
        
        // For existing users, check password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid password' 
            });
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                balance: user.balance,
                role: user.role,
                email: user.email,
                profilePic: user.profilePic
            }
        });
        
        console.log('✅ Login successful:', username);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Simple signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Username and password are required' 
            });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: 'Username already exists' 
            });
        }
        
        // Create user
        const user = new User({
            username,
            password,
            balance: 100, // Starting bonus
            role: 'user'
        });
        
        await user.save();
        
        // Generate token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                balance: user.balance,
                role: user.role
            },
            message: 'Account created successfully!'
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Signup failed' 
        });
    }
});

// Simple profile endpoint
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided' 
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            user
        });
        
    } catch (error) {
        res.status(401).json({ 
            success: false,
            error: 'Invalid token' 
        });
    }
});

module.exports = router;
