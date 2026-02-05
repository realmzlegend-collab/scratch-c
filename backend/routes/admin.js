const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Ad = require('../models/Ad');
const Transaction = require('../models/Transaction');

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const { pin, command } = req.headers;
  
  if (pin === process.env.ADMIN_PIN && command === process.env.ADMIN_COMMAND) {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });
  }
};

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private/Admin
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalAds = await Ad.countDocuments();
    const activeAds = await Ad.countDocuments({ isActive: true });
    const totalPayout = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayRevenue = await Transaction.aggregate([
      { 
        $match: { 
          type: 'ad_view',
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalAds,
        activeAds,
        totalPayout: totalPayout[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt').limit(100);
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:id/toggle
// @desc    Toggle user active status
// @access  Private/Admin
router.put('/users/:id/toggle', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/ads
// @desc    Create new ad
// @access  Private/Admin
router.post('/ads', adminAuth, async (req, res) => {
  try {
    const ad = await Ad.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      ad
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/ads/:id
// @desc    Update ad
// @access  Private/Admin
router.put('/ads/:id', adminAuth, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Ad updated successfully',
      ad
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/transactions
// @desc    Get all transactions
// @access  Private/Admin
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .populate('user', 'username email')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
