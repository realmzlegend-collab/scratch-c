const express = require('express');
const router = express.Router();
const { 
  getAds, 
  viewAd, 
  adgemWebhook 
} = require('../controllers/adController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAds);
router.post('/view/:adId', protect, viewAd);
router.post('/adgem-webhook', adgemWebhook);

module.exports = router;
