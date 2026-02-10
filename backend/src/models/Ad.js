const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ['banner', 'featured', 'sponsored', 'notification'] },
  position: String,
  content: String,
  imageUrl: String,
  link: String,
  budget: Number,
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);
