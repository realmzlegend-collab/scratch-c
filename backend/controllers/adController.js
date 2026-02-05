const Ad = require('../models/Ad');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get all active ads
// @route   GET /api/ads
// @access  Private
exports.getAds = async (req, res) => {
  try {
    const user = req.user;
    
    // Reset daily views for all ads
    const ads = await Ad.find({ isActive: true });
    await Promise.all(ads.map(ad => ad.resetDailyViews()));
    
    // Get ads that user can view based on level and daily limits
    const availableAds = await Ad.find({
      isActive: true,
      'requirements.minLevel': { $lte: Math.floor(user.adViews / 10) },
      currentDailyViews: { $lt: { $multiply: ['$dailyLimit', 0.9] } } // 90% of daily limit
    });
    
    res.json({
      success: true,
      ads: availableAds,
      userAdViews: user.adViews
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    View ad and earn reward
// @route   POST /api/ads/view/:adId
// @access  Private
exports.viewAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const user = req.user;
    
    const ad = await Ad.findById(adId);
    
    if (!ad || !ad.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found or inactive'
      });
    }
    
    // Check daily limit
    await ad.resetDailyViews();
    if (ad.currentDailyViews >= ad.dailyLimit) {
      return res.status(400).json({
        success: false,
        message: 'Daily limit reached for this ad'
      });
    }
    
    // Check user level requirement
    const userLevel = Math.floor(user.adViews / 10);
    if (userLevel < ad.requirements.minLevel) {
      return res.status(400).json({
        success: false,
        message: `Requires level ${ad.requirements.minLevel} to view this ad`
      });
    }
    
    // Check if user already viewed this ad today
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayViews = await Transaction.countDocuments({
      user: user._id,
      type: 'ad_view',
      'metadata.adId': adId,
      createdAt: { $gte: todayStart }
    });
    
    if (todayViews >= ad.requirements.maxViewsPerDay) {
      return res.status(400).json({
        success: false,
        message: 'Daily view limit reached'
      });
    }
    
    // Update ad stats
    ad.totalViews += 1;
    ad.currentDailyViews += 1;
    ad.totalPayout += ad.reward;
    await ad.save();
    
    // Update user stats and balance
    user.adViews += 1;
    user.balance += ad.reward;
    user.totalEarned += ad.reward;
    await user.save();
    
    // Create transaction
    await Transaction.create({
      user: user._id,
      type: 'ad_view',
      amount: ad.reward,
      description: `Ad view: ${ad.title}`,
      status: 'completed',
      metadata: {
        adId: ad._id,
        adTitle: ad.title,
        duration: ad.requirements.duration
      }
    });
    
    res.json({
      success: true,
      message: `Earned $${ad.reward} for viewing ad`,
      reward: ad.reward,
      newBalance: user.balance,
      adViews: user.adViews
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Process AdGem webhook
// @route   POST /api/ads/adgem-webhook
// @access  Public
exports.adgemWebhook = async (req, res) => {
  try {
    const { secret, user_id, amount, transaction_id } = req.body;
    
    // Verify webhook secret
    if (secret !== process.env.ADGEM_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Invalid secret' });
    }
    
    // Find user by their ID in your system (you need to store AdGem user ID mapping)
    const user = await User.findOne({ 'metadata.adgemUserId': user_id });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if transaction already processed
    const existingTransaction = await Transaction.findOne({
      'metadata.adgemTransactionId': transaction_id
    });
    
    if (existingTransaction) {
      return res.json({ success: true, message: 'Transaction already processed' });
    }
    
    // Update user balance
    user.balance += amount;
    user.totalEarned += amount;
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: 'task',
      amount,
      description: 'AdGem offer completion',
      status: 'completed',
      metadata: {
        provider: 'adgem',
        adgemTransactionId: transaction_id,
        adgemUserId: user_id
      }
    });
    
    res.json({ success: true, message: 'Reward processed successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
