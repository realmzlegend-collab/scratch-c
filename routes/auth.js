const express = require('express');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Generate referral code
const generateReferralCode = () => {
    return 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase();
};

// @route   POST /api/auth/signup
// @desc    Register new user
router.post('/signup', async (req, res) => {
    try {
        const { email, username, password, referralCode } = req.body;

        // Validation
        if (!email || !username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide all required fields' 
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide a valid email address' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 6 characters' 
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: existingUser.email === email.toLowerCase() 
                    ? 'Email already registered' 
                    : 'Username already taken'
            });
        }

        // Handle referral
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                referredBy = referrer._id;
            }
        }

        // Create new user with 7-day free trial
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 7);

        const user = await User.create({
            email: email.toLowerCase(),
            username,
            password,
            referredBy,
            freeTrialExpiry: trialExpiry,
            freeTrialUsed: true,
            deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {},
            ipAddresses: [req.ip]
        });

        // Generate token
        const token = generateToken(user._id);

        // Give signup bonus
        await user.updateBalance(100, 'add', 'Signup bonus');
        
        // Record transaction
        const transaction = new Transaction({
            reference: `SIGNUP-${Date.now()}`,
            user: user._id,
            type: 'signup_bonus',
            amount: 100,
            description: 'Welcome bonus for new account',
            status: 'completed',
            previousBalance: 0,
            newBalance: 100
        });
        await transaction.save();

        // Update referrer if exists
        if (referredBy) {
            const referrer = await User.findById(referredBy);
            if (referrer) {
                await referrer.updateBalance(50, 'add', 'Referral bonus');
                referrer.referralCount += 1;
                referrer.referralEarnings += 50;
                await referrer.save();
                
                // Record referral transaction
                const referralTransaction = new Transaction({
                    reference: `REF-${Date.now()}`,
                    user: referrer._id,
                    type: 'referral_bonus',
                    amount: 50,
                    description: `Referral bonus for ${username}`,
                    status: 'completed',
                    relatedUser: user._id
                });
                await referralTransaction.save();
            }
        }

        res.status(201).json({
            success: true,
            message: 'Account created successfully! Welcome bonus credited.',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                balance: user.balance,
                profilePic: user.profilePic,
                freeTrialExpiry: user.freeTrialExpiry,
                subscriptionActive: user.subscriptionActive,
                referralCode: user.referralCode
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Server error during registration' 
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide email/username and password' 
            });
        }

        // Find user by email or username with password
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier }
            ]
        }).select('+password +loginCount +lastLogin');

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Check if account is active
        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false, 
                error: `Account is ${user.status}. Please contact support.` 
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Update login stats
        user.lastLogin = new Date();
        user.loginCount += 1;
        
        // Update streak
        const lastLogin = user.lastLogin;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (lastLogin) {
            const lastLoginDate = new Date(lastLogin);
            lastLoginDate.setHours(0, 0, 0, 0);
            
            const diffDays = Math.floor((today - lastLoginDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                user.consecutiveLoginDays += 1;
                user.streak = Math.max(user.streak, user.consecutiveLoginDays);
                
                // Give daily login bonus
                if (user.consecutiveLoginDays % 7 === 0) {
                    const weeklyBonus = 50 * (user.consecutiveLoginDays / 7);
                    await user.updateBalance(weeklyBonus, 'add', 'Weekly streak bonus');
                    
                    const transaction = new Transaction({
                        reference: `STREAK-${Date.now()}`,
                        user: user._id,
                        type: 'streak_bonus',
                        amount: weeklyBonus,
                        description: `Weekly streak bonus (${user.consecutiveLoginDays} days)`,
                        status: 'completed'
                    });
                    await transaction.save();
                }
            } else if (diffDays > 1) {
                user.consecutiveLoginDays = 1; // Reset streak
            }
        } else {
            user.consecutiveLoginDays = 1;
        }
        
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                balance: user.balance,
                profilePic: user.profilePic,
                freeTrialExpiry: user.freeTrialExpiry,
                subscriptionActive: user.subscriptionActive,
                referralCode: user.referralCode,
                booksRead: user.booksRead,
                moviesWatched: user.moviesWatched,
                tasksCompleted: user.tasksCompleted,
                streak: user.streak,
                consecutiveLoginDays: user.consecutiveLoginDays
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error during login' 
        });
    }
});

// @route   GET /api/auth/validate
// @desc    Validate token
router.get('/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ 
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

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email address'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // For security, don't reveal if email exists
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.'
            });
        }

        // Generate reset token (in production, use crypto.randomBytes)
        const resetToken = Math.random().toString(36).substr(2, 20);
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // In production, send email here
        // await sendResetEmail(user.email, resetToken);

        res.json({
            success: true,
            message: 'Password reset link sent to your email',
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Please provide token and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @route   GET /api/auth/check-username/:username
// @desc    Check if username is available
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ username });
        
        res.json({
            success: true,
            available: !user,
            suggestion: user ? `${username}${Math.floor(Math.random() * 1000)}` : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

module.exports = router;
