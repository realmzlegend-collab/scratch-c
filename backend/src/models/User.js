const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    sparse: true
  },
  
  // Profile Information
  fullName: String,
  profileImage: {
    type: String,
    default: 'default-avatar.png'
  },
  bio: String,
  location: String,
  
  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Subscription
  subscription: {
    type: String,
    enum: ['free', 'premium_viewer', 'premium_uploader', 'vip'],
    default: 'free'
  },
  subscriptionExpires: Date,
  
  // Balance & Earnings
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  
  // Referral System
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  
  // Gamification
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  achievements: [{
    achievementId: String,
    unlockedAt: Date
  }],
  badges: [{
    badgeId: String,
    purchasedAt: Date
  }],
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Preferences
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  
  // Timestamps
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate level based on experience
userSchema.methods.calculateLevel = function() {
  const exp = this.experience;
  if (exp < 100) return 1;
  if (exp < 300) return 2;
  if (exp < 600) return 3;
  if (exp < 1000) return 4;
  return Math.floor(Math.sqrt(exp / 100));
};

module.exports = mongoose.model('User', userSchema);
