const express = require('express');
const router = express.Router();
const { 
  initializePayment, 
  verifyPayment, 
  getTransactions 
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/initialize', protect, initializePayment);
router.get('/verify/:reference', verifyPayment);
router.get('/transactions', protect, getTransactions);

module.exports = router;
