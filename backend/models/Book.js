const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    genre: {
        type: String,
        enum: ['drama', 'novel', 'prose', 'poetry', 'romance', 'action', 'fantasy', 'mystery'],
        required: true
    },
    coverImage: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    tags: [String],
    chapters: [{
        chapterNumber: Number,
        chapterTitle: String,
        content: String,
        pageCount: Number
    }],
    totalPages: {
        type: Number,
        required: true
    },
    earningsPerPage: {
        type: Number,
        default: 1
    },
    likes: [{
        userId: mongoose.Schema.Types.ObjectId,
        likedAt: Date
    }],
    comments: [{
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        comment: String,
        createdAt: Date
    }],
    donations: [{
        userId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        donatedAt: Date
    }],
    totalDonations: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Book', bookSchema);
