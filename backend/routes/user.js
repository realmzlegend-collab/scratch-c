const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/users/referrals
// @desc    Get user's referrals
// @access  Private
router.get('/referrals', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('referrals', 'username email balance createdAt');
    
    res.json({
      success: true,
      referrals: user.referrals,
      referralCount: user.referrals.length,
      referralCode: user.referralCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.find({ isActive: true })
      .sort({ totalEarned: -1 })
      .limit(20)
      .select('username totalEarned adViews tasksCreatedAt');
    
    res.json({
      success: true,
      leaderboard
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
