const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    // Authentication
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    
    // Profile
    fullName: String,
    phone: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^\+?[\d\s\-()]+$/.test(v);
            },
            message: 'Please provide a valid phone number'
        }
    },
    profilePic: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    country: String,
    city: String,
    
    // Account
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned', 'inactive'],
        default: 'active'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Balance & Earnings
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    totalWithdrawn: {
        type: Number,
        default: 0
    },
    
    // Stats
    booksRead: { type: Number, default: 0 },
    moviesWatched: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    itemsSold: { type: Number, default: 0 },
    itemsBought: { type: Number, default: 0 },
    totalReadingTime: { type: Number, default: 0 }, // in minutes
    totalWatchTime: { type: Number, default: 0 }, // in minutes
    
    // Subscription
    subscriptionType: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
    },
    subscriptionExpiry: Date,
    freeTrialUsed: { type: Boolean, default: false },
    freeTrialExpiry: Date,
    
    // Referral System
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
    
    // Social
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    
    // Settings
    notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        chat: { type: Boolean, default: true },
        marketing: { type: Boolean, default: true }
    },
    privacy: {
        profile: { type: String, enum: ['public', 'private', 'friends'], default: 'public' },
        activity: { type: Boolean, default: true },
        balance: { type: Boolean, default: false }
    },
    
    // Activity
    lastLogin: Date,
    lastActivity: Date,
    loginCount: { type: Number, default: 0 },
    consecutiveLoginDays: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    
    // Device Info
    deviceInfo: {
        type: Map,
        of: String
    },
    ipAddresses: [String],
    
    // Metadata
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

// Indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
userSchema.index({ status: 1 });
userSchema.index({ balance: -1 });
userSchema.index({ totalEarned: -1 });

// Virtuals
userSchema.virtual('isPremium').get(function() {
    return this.subscriptionType !== 'free' && 
           (!this.subscriptionExpiry || this.subscriptionExpiry > new Date());
});

userSchema.virtual('isTrialActive').get(function() {
    return this.freeTrialUsed && this.freeTrialExpiry && this.freeTrialExpiry > new Date();
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
    // Update updatedAt timestamp
    this.updatedAt = new Date();
    
    // Generate referral code if not exists
    if (!this.referralCode) {
        this.referralCode = 'SC' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
    
    // Hash password if modified
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    
    next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateBalance = async function(amount, type = 'add', description = '') {
    const oldBalance = this.balance;
    
    if (type === 'add') {
        this.balance += amount;
        this.totalEarned += amount;
    } else if (type === 'subtract') {
        if (this.balance < amount) {
            throw new Error('Insufficient balance');
        }
        this.balance -= amount;
        this.totalSpent += amount;
    } else if (type === 'withdraw') {
        if (this.balance < amount) {
            throw new Error('Insufficient balance for withdrawal');
        }
        this.balance -= amount;
        this.totalWithdrawn += amount;
    }
    
    await this.save();
    return { oldBalance, newBalance: this.balance };
};

userSchema.methods.toProfileJSON = function() {
    return {
        id: this._id,
        username: this.username,
        fullName: this.fullName,
        profilePic: this.profilePic,
        bio: this.bio,
        country: this.country,
        city: this.city,
        role: this.role,
        balance: this.privacy.balance ? undefined : this.balance,
        booksRead: this.booksRead,
        moviesWatched: this.moviesWatched,
        followersCount: this.followersCount,
        followingCount: this.followingCount,
        isPremium: this.isPremium,
        createdAt: this.createdAt
    };
};

// Static methods
userSchema.statics.findByEmailOrUsername = function(identifier) {
    return this.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
        ]
    });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
