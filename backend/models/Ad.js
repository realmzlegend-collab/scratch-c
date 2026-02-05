const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['video', 'survey', 'install', 'offerwall'],
    required: true
  },
  provider: {
    type: String,
    enum: ['adgem', 'adsense', 'custom'],
    required: true
  },
  reward: {
    type: Number,
    required: true,
    min: 0
  },
  link: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  requirements: {
    minLevel: {
      type: Number,
      default: 0
    },
    maxViewsPerDay: {
      type: Number,
      default: 3
    },
    duration: {
      type: Number, // in seconds
      default: 30
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalViews: {
    type: Number,
    default: 0
  },
  totalPayout: {
    type: Number,
    default: 0
  },
  dailyLimit: {
    type: Number,
    default: 1000
  },
  currentDailyViews: {
    type: Number,
    default: 0
  },
  resetDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Reset daily views at midnight
adSchema.methods.resetDailyViews = function() {
  const now = new Date();
  const reset = new Date(this.resetDate);
  
  if (now.getDate() !== reset.getDate() || now.getMonth() !== reset.getMonth() || now.getFullYear() !== reset.getFullYear()) {
    this.currentDailyViews = 0;
    this.resetDate = now;
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Ad', adSchema);
