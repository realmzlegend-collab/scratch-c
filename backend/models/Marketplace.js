const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String }, // e.g., 'Voucher', 'Gift Card', 'Physical'
    image: { type: String },
    stock: { type: Number, default: 10 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDigital: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Marketplace', marketplaceSchema);
