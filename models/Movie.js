const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    
    // Media
    googleDriveLink: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        default: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    trailerUrl: String,
    subtitles: [{
        language: String,
        url: String
    }],
    quality: {
        type: String,
        enum: ['SD', 'HD', 'FHD', '4K'],
        default: 'HD'
    },
    duration: {
        type: Number, // in minutes
        default: 120
    },
    
    // Metadata
    genre: [String],
    director: String,
    cast: [String],
    releaseYear: Number,
    language: {
        type: String,
        default: 'English'
    },
    ageRating: {
        type: String,
        enum: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
        default: 'PG-13'
    },
    country: String,
    
    // Added by
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addedByName: String,
    
    // Voting System
    voteCount: {
        type: Number,
        default: 0
    },
    votedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Watching System
    status: {
        type: String,
        enum: ['voting', 'scheduled', 'playing', 'completed', 'cancelled'],
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
    averageWatchTime: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    
    // Earnings
    totalEarnings: {
        type: Number,
        default: 0
    },
    earningsPerMinute: {
        type: Number,
        default: 0.3
    },
    
    // Comments
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        comment: String,
        likes: {
            type: Number,
            default: 0
        },
        likedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        replies: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            username: String,
            reply: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // SEO
    slug: String,
    metaTitle: String,
    metaDescription: String,
    
    // Flags
    isFeatured: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    requiresSubscription: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
movieSchema.index({ status: 1 });
movieSchema.index({ voteCount: -1 });
movieSchema.index({ watchCount: -1 });
movieSchema.index({ scheduledTime: 1 });
movieSchema.index({ addedBy: 1 });
movieSchema.index({ genre: 1 });
movieSchema.index({ isFeatured: 1 });

// Virtuals
movieSchema.virtual('isPlaying').get(function() {
    return this.status === 'playing' && 
           this.scheduledTime && 
           this.scheduledTime <= new Date();
});

movieSchema.virtual('timeUntilPlay').get(function() {
    if (this.scheduledTime && this.scheduledTime > new Date()) {
        return this.scheduledTime - new Date();
    }
    return 0;
});

// Methods
movieSchema.methods.vote = async function(userId) {
    if (!this.votedBy.includes(userId)) {
        this.votedBy.push(userId);
        this.voteCount += 1;
        return this.save();
    }
    throw new Error('User already voted');
};

movieSchema.methods.recordWatch = async function(userId, watchTime) {
    this.watchCount += 1;
    this.totalWatchTime += watchTime;
    this.averageWatchTime = this.totalWatchTime / this.watchCount;
    
    const earnings = watchTime * this.earningsPerMinute;
    this.totalEarnings += earnings;
    
    return { movie: await this.save(), earnings };
};

movieSchema.methods.addComment = function(userId, username, comment) {
    this.comments.push({
        user: userId,
        username,
        comment,
        createdAt: new Date()
    });
    return this.save();
};

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
