const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  page: {
    type: String,
    enum: ['all', 'dashboard', 'reading', 'cinema', 'marketplace'],
    default: 'all'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});

const Announcement = mongoose.model('Announcement', AnnouncementSchema);
module.exports = Announcement;
