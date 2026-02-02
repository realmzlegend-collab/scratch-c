const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
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
        enum: ['drama', 'novel', 'poetry', 'prose', 'romance', 'action', 'fantasy', 'mystery', 'other']
    },
    coverImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    summary: {
        type: String,
        required: true
    },
    tags: [String],
    
    // Chapters
    chapters: [{
        chapterNumber: Number,
        chapterTitle: String,
        content: String,
        pageCount: Number,
        readCount: { type: Number, default: 0 }
    }],
    
    // Stats
    totalPages: {
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
    averageRating: {
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
        default: 0.5 // 0.5 credits per page
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    
    // Metadata
    views: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Calculate total pages before saving
bookSchema.pre('save', function(next) {
    if (this.chapters && this.chapters.length > 0) {
        this.totalPages = this.chapters.reduce((total, chapter) => total + (chapter.pageCount || 1), 0);
    }
    next();
});

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;
