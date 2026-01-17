const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to validate email
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Helper function to validate username
const validateUsername = (username) => {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
};

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required' 
            });
        }

        if (!validateUsername(username)) {
            return res.status(400).json({
                success: false,
                error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
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
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Email already registered' 
                });
            }
            if (existingUser.username === username.toLowerCase()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Username already taken' 
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            balance: 0,
            profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FFD700&color=000&bold=true`,
            status: 'active',
            createdAt: new Date()
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Registration failed. Please try again.' 
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email and password are required' 
            });
        }

        // Find user by email or username
        const user = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: email.toLowerCase() }
            ]
        });

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
                error: 'Account is deactivated. Please contact support.' 
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login successful!',
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.' 
        });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired' 
            });
        }
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch profile' 
        });
    }
});

// Update profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { username, email } = req.body;

        // Validation
        if (username && !validateUsername(username)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid username format'
            });
        }

        if (email && !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Check if new username/email already exists
        if (username) {
            const existingUser = await User.findOne({ 
                username: username.toLowerCase(),
                _id: { $ne: decoded.userId }
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Username already taken'
                });
            }
        }

        if (email) {
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: decoded.userId }
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }
        }

        const updateData = {};
        if (username) updateData.username = username.toLowerCase();
        if (email) updateData.email = email.toLowerCase();

        const user = await User.findByIdAndUpdate(
            decoded.userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to update profile' 
        });
    }
});

// Upload profile picture
router.post('/upload-profile-pic', upload.single('profilePic'), async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image uploaded' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'Only JPG, PNG, and GIF images are allowed'
            });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'scratch_c/profiles',
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto:good',
            format: 'jpg'
        });

        // Update user profile
        const user = await User.findByIdAndUpdate(
            decoded.userId,
            { profilePic: result.secure_url },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            data: {
                profilePic: result.secure_url,
                user
            }
        });
    } catch (error) {
        console.error('Upload profile pic error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        
        if (error.http_code === 400) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image file'
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload profile picture' 
        });
    }
});

// Change password
router.put('/change-password', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        // Get user with password
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to change password' 
        });
    }
});

// Logout (client-side only)
router.post('/logout', async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
