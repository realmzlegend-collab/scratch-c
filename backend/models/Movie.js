const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  googleDriveLink: {
    type: String,
    required: true
  },
  thumbnail: String,
  description: String,
  category: {
    type: String,
    enum: ['voting', 'now-playing', 'scheduled', 'premium'],
    default: 'voting'
  },
  voteCount: {
    type: Number,
    default: 0
  },
  votedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  scheduledTime: Date,
  isPlaying: {
    type: Boolean,
    default: false
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Movie', movieSchema);
