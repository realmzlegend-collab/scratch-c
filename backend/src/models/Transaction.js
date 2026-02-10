const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Transaction Details
  type: {
    type: String,
    enum: [
      'deposit', 'withdrawal', 'transfer', 
      'earning', 'purchase', 'subscription',
      'referral', 'bonus', 'refund'
    ],
    required: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  currency: {
    type: String,
    default: 'NGN'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Payment Gateway Info (for deposits/withdrawals)
  gateway: {
    type: String,
    enum: ['paystack', 'bank', 'wallet', null],
    default: null
  },
  
  gatewayReference: String,
  gatewayResponse: Object,
  
  // For transfers
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // For purchases
  itemType: String, // 'theme', 'badge', 'content', 'service'
  itemId: mongoose.Schema.Types.ObjectId,
  itemName: String,
  
  // Fees
  platformFee: {
    type: Number,
    default: 0
  },
  
  netAmount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  description: String,
  metadata: Object,
  
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

// Indexes for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
