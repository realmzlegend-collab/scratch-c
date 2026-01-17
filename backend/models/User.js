const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
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
    balance: {
        type: Number,
        default: 0
    },
    profilePic: {
        type: String,
        default: 'default-profile.png'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned'],
        default: 'active'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    readBooks: [{
        bookId: mongoose.Schema.Types.ObjectId,
        lastRead: Date,
        progress: Number
    }],
    votedMovies: [{
        movieId: mongoose.Schema.Types.ObjectId,
        votedAt: Date
    }],
    purchasedItems: [{
        itemId: mongoose.Schema.Types.ObjectId,
        purchasedAt: Date
    }],
    totalEarned: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
