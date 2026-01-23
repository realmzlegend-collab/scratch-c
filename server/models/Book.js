const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter book title'],
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
        required: [true, 'Please select genre'],
        enum: ['drama', 'novel', 'poetry', 'prose', 'romance', 'action', 'fantasy', 'mystery', 'sci-fi', 'horror', 'comedy']
    },
    coverImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    summary: {
        type: String,
        required: [true, 'Please enter book summary'],
        maxlength: [1000, 'Summary cannot exceed 1000 characters']
    },
    content: {
        type: String,
        required: [true, 'Please enter book content']
    },
    chapters: [{
        chapterNumber: {
            type: Number,
            required: true
        },
        chapterTitle: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        pageCount: {
            type: Number,
            default: 10
        }
    }],
    totalPages: {
        type: Number,
        default: 0
    },
    totalWords: {
        type: Number,
        default: 0
    },
    readingTime: {
        type: Number, // in minutes
        default: 0
    },
    price: {
        type: Number,
        default: 0
    },
    earningsPerPage: {
        type: Number,
        default: 5 // Credits per page
    },
    earningsPerMinute: {
        type: Number,
        default: 2 // Credits per minute of reading
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'featured', 'archived', 'banned'],
        default: 'published'
    },
    tags: [{
        type: String,
        trim: true
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    favoritesCount: {
        type: Number,
        default: 0
    },
    reads: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    authorEarnings: {
        type: Number,
        default: 0
    },
    platformEarnings: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPremium: {
        type: Boolean,
        default: false
    },
    requiresSubscription: {
        type: Boolean,
        default: false
    },
    language: {
        type: String,
        default: 'english'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Calculate totals before saving
bookSchema.pre('save', function(next) {
    // Calculate total pages from chapters
    if (this.chapters && this.chapters.length > 0) {
        this.totalPages = this.chapters.reduce((total, chapter) => total + (chapter.pageCount || 10), 0);
    }
    
    // Calculate total words
    if (this.content) {
        this.totalWords = this.content.split(/\s+/).length;
    }
    
    // Calculate reading time (average 200 words per minute)
    this.readingTime = Math.ceil(this.totalWords / 200);
    
    // Update likes count
    this.likesCount = this.likes ? this.likes.length : 0;
    
    // Update favorites count
    this.favoritesCount = this.favorites ? this.favorites.length : 0;
    
    next();
});

// Indexes for better query performance
bookSchema.index({ title: 'text', summary: 'text', tags: 'text' });
bookSchema.index({ author: 1 });
bookSchema.index({ genre: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ createdAt: -1 });
bookSchema.index({ likesCount: -1 });
bookSchema.index({ reads: -1 });
bookSchema.index({ rating: -1 });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
