const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        unique: true,
        required: true
    },
    telegramUsername: String,
    telegramPhotoUrl: String,
    username: {
        type: String,
        required: true
    },
    displayName: String,
    firstName: String,
    lastName: String,
    profilePic: String,
    balance: {
        type: Number,
        default: 50
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'active'
    },
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
