const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: { type: String, enum: ['book', 'article', 'video', 'movie'] },
  category: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  earningsPerView: Number,
  views: { type: Number, default: 0 },
  earningsGenerated: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Content', contentSchema);
