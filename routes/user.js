const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Movie = require('../models/Movie');
const MarketplaceItem = require('../models/MarketplaceItem');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile with stats
router.get('/profile', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Get recent transactions
        const recentTransactions = await Transaction.find({ 
            user: user._id,
            status: 'completed'
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('relatedUser', 'username')
        .populate('book', 'title')
        .populate('movie', 'title')
        .populate('marketplaceItem', 'title');

        // Get user's books
        const userBooks = await Book.find({ author: user._id })
            .select('title genre readCount totalEarnings')
            .limit(5)
            .sort({ readCount: -1 });

        // Get user's marketplace items
        const userItems = await MarketplaceItem.find({ seller: user._id })
            .select('title price status viewCount')
            .limit(5)
            .sort({ createdAt: -1 });

        // Calculate total earnings from different sources
        const earningsStats = await Transaction.aggregate([
            { $match: { user: user._id, status: 'completed', amount: { $gt: 0 } } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const earningsByType = {};
        earningsStats.forEach(stat => {
            earningsByType[stat._id] = stat.total;
        });

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                profilePic: user.profilePic,
                bio: user.bio,
                country: user.country,
                city: user.city,
                role: user.role,
                balance: user.balance,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent,
                totalWithdrawn: user.totalWithdrawn,
                booksRead: user.booksRead,
                moviesWatched: user.moviesWatched,
                tasksCompleted: user.tasksCompleted,
                itemsSold: user.itemsSold,
                itemsBought: user.itemsBought,
                totalReadingTime: user.totalReadingTime,
                totalWatchTime: user.totalWatchTime,
                subscriptionType: user.subscriptionType,
                isPremium: user.isPremium,
                isTrialActive: user.isTrialActive,
                freeTrialExpiry: user.freeTrialExpiry,
                referralCode: user.referralCode,
                referralCount: user.referralCount,
                referralEarnings: user.referralEarnings,
                followersCount: user.followersCount,
                followingCount: user.followingCount,
                streak: user.streak,
                consecutiveLoginDays: user.consecutiveLoginDays,
                createdAt: user.createdAt,
                privacy: user.privacy
            },
            stats: {
                totalBooks: userBooks.length,
                totalItems: userItems.length,
                earningsByType
            },
            recentActivity: recentTransactions.map(trans => ({
                id: trans._id,
                type: trans.type,
                description: trans.description,
                amount: trans.amount,
                netAmount: trans.netAmount,
                currency: trans.currency,
                formattedAmount: trans.formattedAmount,
                createdAt: trans.createdAt,
                relatedUser: trans.relatedUser ? { username: trans.relatedUser.username } : null,
                book: trans.book ? { title: trans.book.title } : null,
                movie: trans.movie ? { title: trans.movie.title } : null,
                item: trans.marketplaceItem ? { title: trans.marketplaceItem.title } : null
            })),
            recentBooks: userBooks,
            recentItems: userItems
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
        const { 
            fullName, 
            phone, 
            bio, 
            country, 
            city,
            profilePic,
            notifications,
            privacy
        } = req.body;
        
        const user = req.user;
        
        const updates = {};
        
        if (fullName !== undefined) updates.fullName = fullName;
        if (phone !== undefined) updates.phone = phone;
        if (bio !== undefined) updates.bio = bio;
        if (country !== undefined) updates.country = country;
        if (city !== undefined) updates.city = city;
        if (profilePic !== undefined) updates.profilePic = profilePic;
        if (notifications !== undefined) updates.notifications = notifications;
        if (privacy !== undefined) updates.privacy = privacy;
        
        // Update user
        Object.keys(updates).forEach(key => {
            user[key] = updates[key];
        });
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePic: user.profilePic,
                bio: user.bio,
                country: user.country,
                city: user.city
            }
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
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Please provide current and new password'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }
        
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
// @desc    Search users
router.get('/search/:query', auth, async (req, res) => {
    try {
        const { query } = req.params;
        const currentUserId = req.user._id;
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                users: []
            });
        }
        
        const users = await User.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { fullName: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                },
                { _id: { $ne: currentUserId } },
                { status: 'active' }
            ]
        })
        .select('username fullName profilePic country city followersCount')
        .limit(20);
        
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePic: user.profilePic,
                country: user.country,
                city: user.city,
                followersCount: user.followersCount
            }))
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/user/follow/:userId
// @desc    Follow/Unfollow user
router.post('/follow/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user;
        
        if (userId === currentUser._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot follow yourself'
            });
        }
        
        const userToFollow = await User.findById(userId);
        if (!userToFollow) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const isFollowing = currentUser.following.includes(userId);
        
        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
            userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== currentUser._id.toString());
            
            currentUser.followingCount = Math.max(0, currentUser.followingCount - 1);
            userToFollow.followersCount = Math.max(0, userToFollow.followersCount - 1);
        } else {
            // Follow
            currentUser.following.push(userId);
            userToFollow.followers.push(currentUser._id);
            
            currentUser.followingCount += 1;
            userToFollow.followersCount += 1;
        }
        
        await Promise.all([currentUser.save(), userToFollow.save()]);
        
        res.json({
            success: true,
            message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
            following: !isFollowing,
            followersCount: userToFollow.followersCount,
            followingCount: currentUser.followingCount
        });
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/user/notifications
// @desc    Get user notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        // Get transactions as notifications
        const notifications = await Transaction.find({
            user: req.user._id,
            status: 'completed'
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('type amount description createdAt');
        
        // Mark as read (in a real app, you'd have a Notification model)
        
        res.json({
            success: true,
            notifications: notifications.map(notif => ({
                id: notif._id,
                type: notif.type,
                amount: notif.amount,
                description: notif.description,
                time: notif.createdAt,
                isRead: true,
                icon: getNotificationIcon(notif.type)
            }))
        });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

function getNotificationIcon(type) {
    const icons = {
        'reading_earnings': '📚',
        'watching_earnings': '🎬',
        'task_completion': '✅',
        'referral_bonus': '👥',
        'signup_bonus': '🎁',
        'transfer_received': '💰',
        'item_sale': '🛒',
        'withdrawal': '🏦',
        'deposit': '💳'
    };
    return icons[type] || '🔔';
}

// @route   GET /api/user/leaderboard
// @desc    Get user leaderboard
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const { type = 'earnings', limit = 20 } = req.query;
        
        let sortBy = {};
        switch(type) {
            case 'earnings':
                sortBy = { totalEarned: -1 };
                break;
            case 'reading':
                sortBy = { booksRead: -1, totalReadingTime: -1 };
                break;
            case 'watching':
                sortBy = { moviesWatched: -1, totalWatchTime: -1 };
                break;
            case 'streak':
                sortBy = { streak: -1, consecutiveLoginDays: -1 };
                break;
            case 'referrals':
                sortBy = { referralCount: -1, referralEarnings: -1 };
                break;
            default:
                sortBy = { totalEarned: -1 };
        }
        
        const leaderboard = await User.find({ 
            status: 'active',
            privacy: { $ne: { profile: 'private' } }
        })
        .select('username profilePic country')
        .sort(sortBy)
        .limit(parseInt(limit));
        
        // Add ranking and stats
        const rankedLeaderboard = await Promise.all(leaderboard.map(async (user, index) => {
            const stats = {};
            
            switch(type) {
                case 'earnings':
                    stats.value = user.totalEarned;
                    stats.label = 'Earnings';
                    break;
                case 'reading':
                    stats.value = user.booksRead;
                    stats.label = 'Books Read';
                    break;
                case 'watching':
                    stats.value = user.moviesWatched;
                    stats.label = 'Movies Watched';
                    break;
                case 'streak':
                    stats.value = user.streak;
                    stats.label = 'Day Streak';
                    break;
                case 'referrals':
                    stats.value = user.referralCount;
                    stats.label = 'Referrals';
                    break;
            }
            
            return {
                rank: index + 1,
                id: user._id,
                username: user.username,
                profilePic: user.profilePic,
                country: user.country,
                stats
            };
        }));
        
        res.json({
            success: true,
            type,
            leaderboard: rankedLeaderboard
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/user/:username
// @desc    Get public user profile
router.get('/:username', auth, async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ 
            username,
            status: 'active'
        }).select('username fullName profilePic bio country city followersCount followingCount createdAt');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Check if current user is following
        const isFollowing = req.user.following.includes(user._id);
        
        // Get user's public books
        const books = await Book.find({ 
            author: user._id,
            status: 'published'
        })
        .select('title genre coverImage readCount likeCount')
        .limit(6)
        .sort({ readCount: -1 });
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePic: user.profilePic,
                bio: user.bio,
                country: user.country,
                city: user.city,
                followersCount: user.followersCount,
                followingCount: user.followingCount,
                createdAt: user.createdAt
            },
            isFollowing,
            books
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

module.exports = router;
