const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { auth } = require('../middleware/auth');

// Public routes
router.get('/items', marketplaceController.getItems);

// Protected routes
router.post('/upload-images', auth, marketplaceController.uploadImages);
router.post('/items', auth, marketplaceController.createItem);
router.post('/purchase/:itemId', auth, marketplaceController.purchaseItem);

module.exports = router;
