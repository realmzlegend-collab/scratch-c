const express = require('express');
const router = express.Router();
const Marketplace = require('../models/Marketplace');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all listings
router.get('/listings', auth, async (req, res) => {
    try {
        const listings = await Marketplace.find({ status: 'active' })
            .populate('seller', 'username rating reviews')
            .sort({ createdAt: -1 })
            .limit(100);
        
        // Get marketplace stats
        const totalListings = await Marketplace.countDocuments({ status: 'active' });
        const activeUsers = await User.countDocuments({ isActive: true });
        const itemsSold = await Marketplace.countDocuments({ status: 'sold' });
        
        res.json({
            listings,
            stats: {
                totalListings,
                activeUsers,
                itemsSold,
                successRate: '98%'
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single listing
router.get('/listing/:id', auth, async (req, res) => {
    try {
        const listing = await Marketplace.findById(req.params.id)
            .populate('seller', 'username rating reviews');
        
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        
        // Increment view count
        listing.views += 1;
        await listing.save();
        
        res.json(listing);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create listing
router.post('/create', auth, async (req, res) => {
    try {
        const { title, description, category, price, condition, location, whatsappNumber, images } = req.body;
        
        // Validate images
        if (!images || images.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }
        
        if (images.length > 5) {
            return res.status(400).json({ message: 'Maximum 5 images allowed' });
        }
        
        const listing = new Marketplace({
            title,
            description,
            category,
            price,
            condition,
            location,
            whatsappNumber,
            images,
            seller: req.user.id
        });
        
        await listing.save();
        
        // Add to user's marketplace listings
        req.user.marketplaceListings.push(listing._id);
        await req.user.save();
        
        res.status(201).json({ 
            message: 'Listing created successfully',
            listing 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's listings
router.get('/my-listings', auth, async (req, res) => {
    try {
        const listings = await Marketplace.find({ seller: req.user.id })
            .sort({ createdAt: -1 });
        
        res.json(listings);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Save listing
router.post('/save', auth, async (req, res) => {
    try {
        const { listingId } = req.body;
        
        const listing = await Marketplace.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        
        // Check if already saved
        const alreadySaved = listing.saves.some(save => 
            save.userId.toString() === req.user.id
        );
        
        if (!alreadySaved) {
            listing.saves.push({
                userId: req.user.id,
                savedAt: new Date()
            });
            await listing.save();
        }
        
        res.json({ message: 'Listing saved' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get saved listings
router.get('/saved', auth, async (req, res) => {
    try {
        const listings = await Marketplace.find({
            'saves.userId': req.user.id
        })
        .populate('seller', 'username rating reviews')
        .sort({ 'saves.savedAt': -1 });
        
        res.json(listings);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Search listings
router.get('/search', auth, async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, condition } = req.query;
        let query = { status: 'active' };
        
        // Search term
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { location: { $regex: q, $options: 'i' } }
            ];
        }
        
        // Category filter
        if (category) {
            query.category = category;
        }
        
        // Price filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        
        // Condition filter
        if (condition) {
            query.condition = condition;
        }
        
        const listings = await Marketplace.find(query)
            .populate('seller', 'username rating reviews')
            .sort({ createdAt: -1 });
        
        res.json(listings);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update listing
router.put('/listing/:id', auth, async (req, res) => {
    try {
        const listing = await Marketplace.findById(req.params.id);
        
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        
        // Check if user owns the listing
        if (listing.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        const updates = req.body;
        const allowedUpdates = ['title', 'description', 'price', 'condition', 'location', 'whatsappNumber', 'images', 'status'];
        
        allowedUpdates.forEach(update => {
            if (updates[update] !== undefined) {
                listing[update] = updates[update];
            }
        });
        
        await listing.save();
        res.json({ message: 'Listing updated', listing });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete listing
router.delete('/listing/:id', auth, async (req, res) => {
    try {
        const listing = await Marketplace.findById(req.params.id);
        
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        
        // Check if user owns the listing
        if (listing.seller.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        await listing.deleteOne();
        res.json({ message: 'Listing deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;