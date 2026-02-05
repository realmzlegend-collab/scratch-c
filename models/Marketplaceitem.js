const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    originalPrice: Number,
    category: {
        type: String,
        required: true,
        enum: ['digital', 'physical', 'service', 'auction', 'bidding']
    },
    subCategory: String,
    
    // Media
    images: [{
        url: String,
        thumbnailUrl: String,
        isPrimary: {
            type: Boolean,
            default: false
        },
        caption: String
    }],
    videoUrl: String,
    documents: [{
        name: String,
        url: String,
        size: Number,
        type: String
    }],
    
    // Seller Info
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerName: String,
    sellerWhatsapp: {
        type: String,
        required: true
    },
    sellerEmail: String,
    sellerAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    sellerRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    
    // Product Details
    condition: {
        type: String,
        enum: ['new', 'used-like-new', 'used-good', 'used-fair', 'refurbished'],
        default: 'new'
    },
    brand: String,
    model: String,
    specifications: Map,
    tags: [String],
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    
    // Shipping
    shipping: {
        type: String,
        enum: ['pickup', 'delivery', 'both'],
        default: 'delivery'
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    shippingTime: String,
    deliveryAreas: [String],
    
    // Digital Product Specific
    downloadLink: String,
    accessType: {
        type: String,
        enum: ['instant', 'email', 'manual'],
        default: 'instant'
    },
    fileSize: Number,
    fileFormat: String,
    licenseType: String,
    updatesIncluded: Boolean,
    supportIncluded: Boolean,
    
    // Service Specific
    serviceType: String,
    duration: String,
    availability: [{
        day: String,
        timeSlots: [String]
    }],
    requirements: String,
    
    // Auction Specific
    auctionEnd: Date,
    startingBid: Number,
    currentBid: Number,
    bidIncrement: Number,
    bids: [{
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        amount: Number,
        bidAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'active', 'sold', 'reserved', 'expired', 'removed', 'flagged'],
        default: 'active'
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    soldAt: Date,
    soldPrice: Number,
    
    // Stats
    viewCount: {
        type: Number,
        default: 0
    },
    favoriteCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    },
    inquiryCount: {
        type: Number,
        default: 0
    },
    
    // SEO
    slug: String,
    metaTitle: String,
    metaDescription: String,
    
    // Flags
    isFeatured: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isNegotiable: {
        type: Boolean,
        default: false
    },
    requiresDeposit: {
        type: Boolean,
        default: false
    },
    depositAmount: Number,
    
    // Timestamps
    featuredAt: Date,
    expiresAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
marketplaceItemSchema.index({ seller: 1, status: 1 });
marketplaceItemSchema.index({ category: 1, createdAt: -1 });
marketplaceItemSchema.index({ price: 1 });
marketplaceItemSchema.index({ status: 1 });
marketplaceItemSchema.index({ isFeatured: 1 });
marketplaceItemSchema.index({ 'tags': 1 });
marketplaceItemSchema.index({ createdAt: -1 });
marketplaceItemSchema.index({ viewCount: -1 });
marketplaceItemSchema.index({ auctionEnd: 1 });

// Virtuals
marketplaceItemSchema.virtual('isAuction').get(function() {
    return this.category === 'auction' || this.category === 'bidding';
});

marketplaceItemSchema.virtual('isExpired').get(function() {
    if (this.expiresAt) {
        return this.expiresAt < new Date();
    }
    return false;
});

marketplaceItemSchema.virtual('isAvailable').get(function() {
    return this.status === 'active' && 
           this.quantity > 0 && 
           !this.isExpired;
});

marketplaceItemSchema.virtual('currentPrice').get(function() {
    if (this.isAuction && this.currentBid) {
        return this.currentBid;
    }
    return this.price;
});

// Methods
marketplaceItemSchema.methods.incrementView = async function() {
    this.viewCount += 1;
    return this.save();
};

marketplaceItemSchema.methods.placeBid = async function(userId, amount) {
    if (!this.isAuction) {
        throw new Error('This item is not an auction');
    }
    
    if (this.status !== 'active') {
        throw new Error('Auction is not active');
    }
    
    if (this.auctionEnd && this.auctionEnd < new Date()) {
        throw new Error('Auction has ended');
    }
    
    const minBid = this.currentBid ? 
        this.currentBid + (this.bidIncrement || 1) : 
        (this.startingBid || this.price);
    
    if (amount < minBid) {
        throw new Error(`Minimum bid is ${minBid}`);
    }
    
    this.bids.push({
        bidder: userId,
        amount: amount,
        bidAt: new Date()
    });
    
    this.currentBid = amount;
    
    return this.save();
};

marketplaceItemSchema.methods.purchase = async function(buyerId, quantity = 1) {
    if (this.status !== 'active') {
        throw new Error('Item is not available');
    }
    
    if (this.quantity < quantity) {
        throw new Error('Insufficient quantity');
    }
    
    this.quantity -= quantity;
    if (this.quantity === 0) {
        this.status = 'sold';
    }
    
    this.buyer = buyerId;
    this.soldAt = new Date();
    this.soldPrice = this.currentPrice;
    
    return this.save();
};

const MarketplaceItem = mongoose.model('MarketplaceItem', marketplaceItemSchema);

module.exports = MarketplaceItem;
