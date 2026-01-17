const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Marketplace = require('../models/Marketplace');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get all marketplace items
router.get('/items', async (req, res) => {
    try {
        const { category, page = 1, limit = 20 } = req.query;
        const query = { status: 'available' };
        
        if (category && category !== 'all') {
            query.category = category;
        }

        const items = await Marketplace.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Marketplace.countDocuments(query);

        res.json({
            items,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single item
router.get('/items/:id', async (req, res) => {
    try {
        const item = await Marketplace.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Increment views
        item.views += 1;
        await item.save();

        res.json({ item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create marketplace item
router.post('/items', authMiddleware, async (req, res) => {
    try {
        const itemData = {
            ...req.body,
            sellerId: req.user._id,
            sellerName: req.user.username
        };

        const item = new Marketplace(itemData);
        await item.save();

        res.status(201).json({ item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Purchase item
router.post('/purchase/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Marketplace.findById(req.params.id);
        
        if (!item || item.status !== 'available') {
            return res.status(404).json({ error: 'Item not available' });
        }

        if (item.sellerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot purchase your own item' });
        }

        // Check balance
        if (req.user.balance < item.price) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Calculate platform fee (20%)
        const platformFee = item.price * 0.2;
        const sellerAmount = item.price - platformFee;

        // Update buyer balance
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 
                balance: -item.price,
                totalSpent: item.price
            },
            $push: {
                purchasedItems: {
                    itemId: item._id,
                    purchasedAt: new Date()
                }
            }
        });

        // Update seller balance
        await User.findByIdAndUpdate(item.seller
