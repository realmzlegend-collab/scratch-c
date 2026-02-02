const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    balance: {
        type: Number,
        default: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    profilePic: String,
    phone: String,
    country: String,
    
    // Stats
    booksRead: { type: Number, default: 0 },
    moviesWatched: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    itemsSold: { type: Number, default: 0 },
    itemsBought: { type: Number, default: 0 },
    
    // Settings
    notificationsEnabled: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    
    // Subscription
    subscriptionActive: { type: Boolean, default: false },
    subscriptionExpiry: Date,
    freeTrialUsed: { type: Boolean, default: false },
    freeTrialExpiry: Date,
    
    // Social
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Timestamps
    lastLogin: Date,
    lastActivity: Date
}, {
    timestamps: true
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

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update balance
userSchema.methods.updateBalance = async function(amount, type = 'add') {
    if (type === 'add') {
        this.balance += amount;
        this.totalEarned += amount;
    } else if (type === 'subtract') {
        if (this.balance < amount) {
            throw new Error('Insufficient balance');
        }
        this.balance -= amount;
        this.totalSpent += amount;
    }
    return this.save();
};

const User = mongoose.model('User', userSchema);
module.exports = User;
