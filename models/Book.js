const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
    chapterNumber: {
        type: Number,
        required: true
    },
    chapterTitle: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    pageCount: {
        type: Number,
        default: 1,
        min: 1
    },
    readCount: {
        type: Number,
        default: 0
    },
    wordCount: Number,
    audioUrl: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    genre: {
        type: String,
        required: true,
        enum: [
            'fiction', 'non-fiction', 'drama', 'poetry', 'romance', 
            'action', 'fantasy', 'mystery', 'thriller', 'horror',
            'sci-fi', 'biography', 'history', 'self-help', 'business',
            'children', 'young-adult', 'comedy', 'other'
        ]
    },
    subGenre: [String],
    
    // Content
    coverImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    summary: {
        type: String,
        required: true,
        maxlength: [2000, 'Summary cannot exceed 2000 characters']
    },
    chapters: [chapterSchema],
    
    // Metadata
    language: {
        type: String,
        default: 'English'
    },
    tags: [String],
    ageRating: {
        type: String,
        enum: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
        default: 'PG-13'
    },
    contentType: {
        type: String,
        enum: ['book', 'novel', 'short-story', 'poem', 'article'],
        default: 'book'
    },
    
    // Stats
    totalPages: {
        type: Number,
        default: 0
    },
    totalWords: {
        type: Number,
        default: 0
    },
    readCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    favoriteCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    averageRating: {
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
    earningsPerPage: {
        type: Number,
        default: 0.5
    },
    earningsPerMinute: {
        type: Number,
        default: 0.2
    },
    price: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'flagged', 'deleted'],
        default: 'published'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    
    // SEO
    slug: {
        type: String,
        unique: true,
        sparse: true
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    
    // Timestamps
    publishedAt: Date,
    featuredAt: Date,
    
    // Social
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    favoritedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
bookSchema.index({ author: 1, createdAt: -1 });
bookSchema.index({ genre: 1, readCount: -1 });
bookSchema.index({ status: 1 });
bookSchema.index({ isFeatured: 1 });
bookSchema.index({ 'tags': 1 });
bookSchema.index({ totalEarnings: -1 });
bookSchema.index({ createdAt: -1 });

// Virtuals
bookSchema.virtual('chaptersCount').get(function() {
    return this.chapters.length;
});

bookSchema.virtual('readingTime').get(function() {
    return Math.ceil(this.totalWords / 200); // Average reading speed: 200 words per minute
});

// Pre-save middleware
bookSchema.pre('save', function(next) {
    // Calculate total pages and words
    if (this.chapters && this.chapters.length > 0) {
        this.totalPages = this.chapters.reduce((sum, chapter) => sum + (chapter.pageCount || 1), 0);
        this.totalWords = this.chapters.reduce((sum, chapter) => {
            if (chapter.content) {
                return sum + chapter.content.split(/\s+/).length;
            }
            return sum;
        }, 0);
    }
    
    // Generate slug if not exists
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);
    }
    
    next();
});

// Methods
bookSchema.methods.incrementReadCount = async function() {
    this.readCount += 1;
    return this.save();
};

bookSchema.methods.calculateEarnings = function(readTime) {
    const pageEarnings = (readTime / 60) * this.earningsPerMinute;
    return pageEarnings;
};

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
