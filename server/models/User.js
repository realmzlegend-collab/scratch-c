// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    booksRead: {
        type: Number,
        default: 0
    },
    moviesWatched: {
        type: Number,
        default: 0
    },
    referrals: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    settings: {
        notifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        privacyMode: { type: Boolean, default: false }
    },
    subscription: {
        active: { type: Boolean, default: false },
        plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
        expiresAt: Date
    },
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
