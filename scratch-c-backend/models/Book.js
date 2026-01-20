const mongoose = require('mongoose');

const ChapterSchema = new mongoose.Schema({
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
    default: 1
  }
});

const BookSchema = new mongoose.Schema({
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
  genre: {
    type: String,
    required: true,
    enum: ['drama', 'novel', 'poetry', 'prose', 'romance', 'action', 'fantasy', 'mystery']
  },
  coverImage: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  chapters: [ChapterSchema],
  totalPages: {
    type: Number,
    default: 0
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
  reads: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  isFeatured: {
    type: Boolean,
    default: false
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

// Calculate total pages before saving
BookSchema.pre('save', function(next) {
  if (this.chapters && this.chapters.length > 0) {
    this.totalPages = this.chapters.reduce((total, chapter) => total + chapter.pageCount, 0);
  }
  this.likesCount = this.likes.length;
  next();
});

const Book = mongoose.model('Book', BookSchema);
module.exports = Book;
