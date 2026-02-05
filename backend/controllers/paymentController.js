const https = require('https');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Initialize payment
// @route   POST /api/payments/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
  try {
    const { amount, email } = req.body;
    const user = req.user;
    
    // Validate amount
    if (amount < 100) { // Minimum $100
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is $100'
      });
    }
    
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'withdrawal',
      amount,
      description: 'Withdrawal request',
      status: 'pending',
      paymentMethod: 'paystack'
    });
    
    // Generate unique reference
    const reference = `SCRATCH_${user._id}_${Date.now()}`;
    transaction.reference = reference;
    await transaction.save();
    
    // Initialize Paystack payment
    const params = JSON.stringify({
      email: email || user.email,
      amount: amount * 100, // Convert to kobo
      reference,
      callback_url: `${req.protocol}://${req.get('host')}/api/payments/verify/${reference}`,
      metadata: {
        userId: user._id.toString(),
        transactionId: transaction._id.toString()
      }
    });
    
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const paystackReq = https.request(options, (paystackRes) => {
      let data = '';
      
      paystackRes.on('data', (chunk) => {
        data += chunk;
      });
      
      paystackRes.on('end', () => {
        const response = JSON.parse(data);
        
        if (response.status) {
          // Deduct from user balance temporarily
          user.balance -= amount;
          await user.save();
          
          res.json({
            success: true,
            authorizationUrl: response.data.authorization_url,
            accessCode: response.data.access_code,
            reference: response.data.reference
          });
        } else {
          res.status(400).json({
            success: false,
            message: response.message
          });
        }
      });
    }).on('error', (error) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Payment initialization failed'
      });
    });
    
    paystackReq.write(params);
    paystackReq.end();
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify payment
// @route   GET /api/payments/verify/:reference
// @access  Public
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    };
    
    https.get(options, (paystackRes) => {
      let data = '';
      
      paystackRes.on('data', (chunk) => {
        data += chunk;
      });
      
      paystackRes.on('end', async () => {
        const response = JSON.parse(data);
        
        if (response.status && response.data.status === 'success') {
          const transaction = await Transaction.findOne({ reference });
          
          if (transaction && transaction.status === 'pending') {
            transaction.status = 'completed';
            transaction.completedAt = new Date();
            transaction.metadata = response.data;
            await transaction.save();
            
            // Update user's total withdrawn
            const user = await User.findById(transaction.user);
            user.totalEarned += transaction.amount;
            await user.save();
            
            // Redirect to success page
            res.redirect(`${process.env.FRONTEND_URL}/withdrawal-success?reference=${reference}`);
          } else {
            res.redirect(`${process.env.FRONTEND_URL}/withdrawal-failed?reason=Transaction already processed`);
          }
        } else {
          // Revert user balance if payment failed
          const transaction = await Transaction.findOne({ reference });
          if (transaction && transaction.status === 'pending') {
            const user = await User.findById(transaction.user);
            user.balance += transaction.amount;
            await user.save();
            
            transaction.status = 'failed';
            await transaction.save();
          }
          
          res.redirect(`${process.env.FRONTEND_URL}/withdrawal-failed?reason=Payment verification failed`);
        }
      });
    }).on('error', (error) => {
      console.error(error);
      res.redirect(`${process.env.FRONTEND_URL}/withdrawal-failed?reason=Verification error`);
    });
    
  } catch (error) {
    console.error(error);
    res.redirect(`${process.env.FRONTEND_URL}/withdrawal-failed?reason=Server error`);
  }
};

// @desc    Get user transactions
// @route   GET /api/payments/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(50);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
