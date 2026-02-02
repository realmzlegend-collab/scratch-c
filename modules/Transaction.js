const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'reading_earnings',
            'watching_earnings',
            'task_completion',
            'transfer',
            'purchase',
            'sale',
            'withdrawal',
            'deposit',
            'referral_bonus',
            'voting_reward',
            'admin_adjustment',
            'platform_fee'
        ],
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
    
    // Related entities
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    taskId: String,
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem' },
    
    // For transfers
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // For admin actions
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'completed'
    },
    
    // Metadata
    reference: String,
    paymentMethod: String,
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

// Index for faster queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
