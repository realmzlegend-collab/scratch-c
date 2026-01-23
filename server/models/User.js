const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    username: {
        type: String,
        required: [true, 'Please enter a username'],
        unique: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    balance: {
        type: Number,
        default: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalWithdrawn: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'super_admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'banned'],
        default: 'active'
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    referralCount: {
        type: Number,
        default: 0
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date
    },
    loginCount: {
        type: Number,
        default: 0
    },
    booksRead: {
        type: Number,
        default: 0
    },
    tasksCompleted: {
        type: Number,
        default: 0
    },
    videosWatched: {
        type: Number,
        default: 0
    },
    subscriptionActive: {
        type: Boolean,
        default: false
    },
    freeTrialUsed: {
        type: Boolean,
        default: false
    },
    freeTrialExpiry: {
        type: Date
    },
    subscriptionExpiry: {
        type: Date
    },
    paymentMethods: [{
        type: {
            type: String,
            enum: ['bank', 'mobile_money', 'crypto']
        },
        details: {
            bankName: String,
            accountNumber: String,
            accountName: String,
            network: String,
            phoneNumber: String,
            walletAddress: String
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    settings: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        privacyMode: {
            type: Boolean,
            default: false
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Generate referral code before saving
userSchema.pre('save', function(next) {
    if (!this.referralCode) {
        this.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    next();
});

// Update updatedAt timestamp
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            id: this._id, 
            role: this.role,
            username: this.username,
            email: this.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// Check if trial is active
userSchema.methods.isTrialActive = function() {
    if (!this.freeTrialExpiry) return false;
    return this.freeTrialExpiry > new Date();
};

// Check if subscription is active
userSchema.methods.isSubscriptionActive = function() {
    if (!this.subscriptionExpiry) return false;
    return this.subscriptionExpiry > new Date();
};

// Add earnings to user
userSchema.methods.addEarnings = async function(amount, type = 'task') {
    this.balance += amount;
    this.totalEarned += amount;
    
    // Add to specific earnings field based on type
    if (type === 'reading') {
        this.booksRead += 1;
    } else if (type === 'task') {
        this.tasksCompleted += 1;
    } else if (type === 'video') {
        this.videosWatched += 1;
    }
    
    await this.save();
    return this;
};

// Deduct from user balance
userSchema.methods.deductBalance = async function(amount, reason = 'purchase') {
    if (this.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    this.balance -= amount;
    await this.save();
    return this;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return this.name;
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
    return `@${this.username}`;
});

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ balance: -1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
