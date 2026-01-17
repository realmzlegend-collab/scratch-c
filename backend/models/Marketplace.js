const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    images: [String],
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerName: {
        type: String,
        required: true
    },
    sellerWhatsapp: {
        type: String,
        required: true
    },
    sellerAddress: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['digital', 'physical', 'service'],
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'sold', 'pending'],
        default: 'available'
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Marketplace', marketplaceSchema);
