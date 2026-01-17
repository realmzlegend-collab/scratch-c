const mongoose = require('mongoose');

const cinemaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    googleDriveLink: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['voting', 'watching'],
        default: 'voting'
    },
    votes: [{
        userId: mongoose.Schema.Types.ObjectId,
        votedAt: Date
    }],
    voteCount: {
        type: Number,
        default: 0
    },
    scheduledTime: {
        type: Date,
        required: function() { return this.category === 'watching'; }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    comments: [{
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        comment: String,
        createdAt: Date
    }],
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Cinema', cinemaSchema);
