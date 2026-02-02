const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    googleDriveLink: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        default: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Voting
    voteCount: {
        type: Number,
        default: 0
    },
    votedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Watching
    status: {
        type: String,
        enum: ['voting', 'playing', 'scheduled', 'completed'],
        default: 'voting'
    },
    scheduledTime: Date,
    startedAt: Date,
    endedAt: Date,
    
    // Stats
    watchCount: {
        type: Number,
        default: 0
    },
    totalWatchTime: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0
    },
    
    // Comments
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;
