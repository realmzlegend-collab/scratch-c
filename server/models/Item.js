const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter item title'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Please enter item description'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    seller: {
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
        required: [true, 'Please provide WhatsApp number']
    },
    category: {
        type: String,
        required: [true, 'Please select category'],
        enum: ['digital', 'physical', 'service']
    },
    subcategory: {
        type: String,
        enum: ['ebook', 'software', 'course', 'clothing', 'electronics', 'home', 'art', 'writing', 'design', 'programming', 'consulting']
    },
    price: {
        type: Number,
        required: [true, 'Please enter price'],
        min: [1, 'Price must be at least 1 credit']
    },
    images: [{
        type: String,
        required: [true, 'Please upload at least one image']
    }],
    quantity: {
        type: Number,
        default: 1
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    condition: {
        type: String,
        enum: ['new', 'like_new', 'good', 'fair', 'poor'],
        default: 'new'
    },
    location: {
        type: String,
        default: ''
    },
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'delivery', 'digital'],
        default: 'delivery'
    },
    deliveryCost: {
        type: Number,
        default: 0
    },
    estimatedDelivery: {
        type: String,
        default: '3-5 days'
    },
    tags: [{
        type: String,
        trim: true
    }],
    views: {
        type: Number,
        default: 0
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    favoritesCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'sold', 'reserved', 'archived', 'banned'],
        default: 'published'
    },
    transactions: [{
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        buyerName: String,
        amount: Number,
        status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled', 'disputed'],
            default: 'pending'
        },
        transactionId: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    transactionCount: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    sellerEarnings: {
        type: Number,
        default: 0
    },
    platformEarnings: {
        type: Number,
        default: 0
    },
    ratings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
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

// Calculate average rating before saving
itemSchema.pre('save', function(next) {
    if (this.ratings && this.ratings.length > 0) {
        const sum = this.ratings.reduce((total, rating) => total + rating.rating, 0);
        this.averageRating = sum / this.ratings.length;
    }
    
    // Update favorites count
    this.favoritesCount = this.favorites ? this.favorites.length : 0;
    
    // Update transaction count
    this.transactionCount = this.transactions ? this.transactions.length : 0;
    
    next();
});

// Indexes for better query performance
itemSchema.index({ title: 'text', description: 'text', tags: 'text' });
itemSchema.index({ seller: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ subcategory: 1 });
itemSchema.index({ price: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ isAvailable: 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ averageRating: -1 });
itemSchema.index({ transactionCount: -1 });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
