const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Basic Info
    reference: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            // Earnings
            'reading_earnings',
            'watching_earnings',
            'task_completion',
            'referral_bonus',
            'signup_bonus',
            'daily_reward',
            'streak_bonus',
            'achievement_bonus',
            'content_upload',
            'content_sale',
            
            // Transfers
            'transfer_sent',
            'transfer_received',
            'gift_sent',
            'gift_received',
            
            // Marketplace
            'item_purchase',
            'item_sale',
            'auction_win',
            'auction_bid',
            
            // Withdrawals & Deposits
            'withdrawal',
            'deposit',
            'refund',
            
            // System
            'admin_credit',
            'admin_debit',
            'system_credit',
            'system_debit',
            'platform_fee',
            'subscription_payment',
            'penalty'
        ]
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'NGN'
    },
    
    // Parties Involved
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Related Entities
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie'
    },
    marketplaceItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MarketplaceItem'
    },
    task: {
        type: mongoose.Schema.Types.ObjectId
    },
    
    // Description
    description: {
        type: String,
        required: true
    },
    notes: String,
    metadata: Map,
    
    // Status
    status: {
        type: String,
        enum: [
            'pending',
            'processing',
            'completed',
            'failed',
            'cancelled',
            'refunded',
            'reversed'
        ],
        default: 'pending'
    },
    failureReason: String,
    
    // Payment Gateway
    gateway: {
        type: String,
        enum: ['paystack', 'flutterwave', 'stripe', 'manual', 'system']
    },
    gatewayReference: String,
    gatewayResponse: Map,
    
    // Balances
    previousBalance: Number,
    newBalance: Number,
    
    // Fees
    fee: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    netAmount: Number,
    
    // Security
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    
    // Timestamps
    processedAt: Date,
    completedAt: Date,
    cancelledAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ gatewayReference: 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ amount: 1 });

// Pre-save middleware
transactionSchema.pre('save', function(next) {
    // Generate reference if not exists
    if (!this.reference) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.reference = `TX${timestamp}${random}`;
    }
    
    // Calculate net amount
    this.netAmount = this.amount - this.fee - this.tax;
    
    next();
});

// Virtuals
transactionSchema.virtual('isIncome').get(function() {
    const incomeTypes = [
        'reading_earnings',
        'watching_earnings',
        'task_completion',
        'referral_bonus',
        'signup_bonus',
        'daily_reward',
        'streak_bonus',
        'achievement_bonus',
        'content_upload',
        'content_sale',
        'transfer_received',
        'gift_received',
        'item_sale',
        'auction_win',
        'deposit',
        'refund',
        'admin_credit',
        'system_credit'
    ];
    return incomeTypes.includes(this.type);
});

transactionSchema.virtual('isExpense').get(function() {
    const expenseTypes = [
        'transfer_sent',
        'gift_sent',
        'item_purchase',
        'auction_bid',
        'withdrawal',
        'admin_debit',
        'system_debit',
        'platform_fee',
        'subscription_payment',
        'penalty'
    ];
    return expenseTypes.includes(this.type);
});

transactionSchema.virtual('formattedAmount').get(function() {
    const sign = this.isIncome ? '+' : '-';
    return `${sign}${this.currency} ${Math.abs(this.amount).toLocaleString()}`;
});

// Static methods
transactionSchema.statics.getUserBalance = async function(userId) {
    const result = await this.aggregate([
        { $match: { user: userId, status: 'completed' } },
        {
            $group: {
                _id: null,
                totalIncome: {
                    $sum: {
                        $cond: [
                            { $in: ['$type', [
                                'reading_earnings',
                                'watching_earnings',
                                'task_completion',
                                'referral_bonus',
                                'signup_bonus',
                                'daily_reward',
                                'streak_bonus',
                                'achievement_bonus',
                                'content_upload',
                                'content_sale',
                                'transfer_received',
                                'gift_received',
                                'item_sale',
                                'auction_win',
                                'deposit',
                                'refund',
                                'admin_credit',
                                'system_credit'
                            ]]},
                            '$amount',
                            0
                        ]
                    }
                },
                totalExpense: {
                    $sum: {
                        $cond: [
                            { $in: ['$type', [
                                'transfer_sent',
                                'gift_sent',
                                'item_purchase',
                                'auction_bid',
                                'withdrawal',
                                'admin_debit',
                                'system_debit',
                                'platform_fee',
                                'subscription_payment',
                                'penalty'
                            ]]},
                            '$amount',
                            0
                        ]
                    }
                }
            }
        }
    ]);
    
    if (result.length > 0) {
        return {
            totalIncome: result[0].totalIncome || 0,
            totalExpense: result[0].totalExpense || 0,
            balance: (result[0].totalIncome || 0) - (result[0].totalExpense || 0)
        };
    }
    
    return { totalIncome: 0, totalExpense: 0, balance: 0 };
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
