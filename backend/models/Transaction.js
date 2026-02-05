const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'withdrawal', 'referral', 'ad_view', 'task'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  reference: {
    type: String,
    unique: true
  },
  paymentMethod: {
    type: String,
    enum: ['paystack', 'manual', 'system']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
