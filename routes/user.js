const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Get recent transactions
        const recentTransactions = await Transaction.find({ 
            userId: user._id 
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('receiverId', 'username')
        .populate('senderId', 'username');

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent,
                booksRead: user.booksRead,
                moviesWatched: user.moviesWatched,
                tasksCompleted: user.tasksCompleted,
                itemsSold: user.itemsSold,
                subscriptionActive: user.subscriptionActive,
                freeTrialExpiry: user.freeTrialExpiry,
                createdAt: user.createdAt
            },
            recentActivity: recentTransactions.map(transaction => ({
                type: transaction.type,
                description: transaction.description,
                amount: transaction.amount,
                createdAt: transaction.createdAt
            }))
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { username, phone, country } = req.body;
        const user = req.user;

        const updates = {};
        if (username && username !== user.username) {
            // Check if username is taken
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Username already taken'
                });
            }
            updates.username = username;
        }

        if (phone) updates.phone = phone;
        if (country) updates.country = country;

        await User.findByIdAndUpdate(user._id, updates);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/user/change-password
// @desc    Change password
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/user/search/:query
// @desc    Search users for transfer
router.get('/search/:query', auth, async (req, res) => {
    try {
        const { query } = req.params;
        const currentUserId = req.user._id;

        const users = await User.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                },
                { _id: { $ne: currentUserId } }
            ]
        })
        .select('username email profilePic')
        .limit(10);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

module.exports = router;
