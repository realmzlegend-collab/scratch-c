const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const router = express.Router();

// Search users
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('username profilePic')
    .limit(10);
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Transfer money
router.post('/transfer', auth, async (req, res) => {
  try {
    const { receiverUsername, amount, description } = req.body;
    
    if (!receiverUsername || !amount) {
      return res.status(400).json({ error: 'Receiver and amount are required' });
    }
    
    if (amount < 10) {
      return res.status(400).json({ error: 'Minimum transfer is ₦10' });
    }
    
    if (amount > 50000) {
      return res.status(400).json({ error: 'Maximum transfer is ₦50,000' });
    }
    
    // Check sender balance
    const sender = req.user;
    if (sender.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Find receiver
    const receiver = await User.findOne({ username: receiverUsername });
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    
    if (receiver._id.equals(sender._id)) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }
    
    if (receiver.status !== 'active') {
      return res.status(400).json({ error: 'Receiver account is not active' });
    }
    
    // Calculate platform fee (2%)
    const platformFee = amount * 0.02;
    const receiverAmount = amount - platformFee;
    
    // Update balances
    sender.balance -= amount;
    sender.totalSpent += amount;
    await sender.save();
    
    receiver.balance += receiverAmount;
    receiver.totalEarned += receiverAmount;
    await receiver.save();
    
    // Record transactions
    const senderTransaction = new Transaction({
      user: sender._id,
      type: 'transfer',
      amount: amount,
      description: description || `Transfer to ${receiver.username}`,
      status: 'completed',
      metadata: { receiver: receiver._id }
    });
    
    const receiverTransaction = new Transaction({
      user: receiver._id,
      type: 'transfer',
      amount: receiverAmount,
      description: description || `Transfer from ${sender.username}`,
      status: 'completed',
      metadata: { receiver: sender._id }
    });
    
    const platformTransaction = new Transaction({
      user: null, // Platform account
      type: 'earning',
      amount: platformFee,
      description: `Transfer fee: ${sender.username} → ${receiver.username}`,
      status: 'completed'
    });
    
    await Promise.all([
      senderTransaction.save(),
      receiverTransaction.save(),
      platformTransaction.save()
    ]);
    
    res.json({
      success: true,
      amount: receiverAmount,
      fee: platformFee,
      receiver: {
        username: receiver.username,
        balance: receiver.balance
      },
      sender: {
        balance: sender.balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Transfer failed' });
  }
});

module.exports = router;
