const User = require('../models/User');
const Book = require('../models/Book');
const Movie = require('../models/Movie');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Announcement = require('../models/Announcement');
const jwt = require('jsonwebtoken');

// Admin verification
exports.verifyAdmin = async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      res.json({ success: true, message: 'Admin verified' });
    } else {
      res.status(403).json({ success: false, error: 'Not authorized' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

// Get admin dashboard stats
exports.getStats = async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    
    const totalBooks = await Book.countDocuments();
    const totalMovies = await Movie.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    
    // Calculate platform earnings (20% of all transactions)
    const transactions = await Transaction.find({ type: 'transfer_out' });
    const platformEarnings = transactions.reduce((sum, tx) => {
      // Platform takes 2% of each transfer
      const fee = tx.amount * 0.02;
      return sum + fee;
    }, 0);
    
    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      totalUsers,
      platformEarnings: Math.round(platformEarnings),
      activeUsers,
      totalBooks,
      totalMovies,
      totalTransactions,
      recentTransactions
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// Get all users for admin
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// Edit user balance
exports.editUserBalance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { amount, operation } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const balanceBefore = user.balance;
    
    if (operation === 'add') {
      user.balance += parseFloat(amount);
      user.totalEarned += parseFloat(amount);
    } else if (operation === 'subtract') {
      user.balance -= parseFloat(amount);
      user.totalSpent += parseFloat(amount);
    }

    await user.save();

    // Record transaction
    const transaction = new Transaction({
      user: userId,
      type: operation === 'add' ? 'credit' : 'debit',
      amount: parseFloat(amount),
      description: `Admin adjustment: ${operation} ${amount} credits`,
      reference: `ADMIN${Date.now()}`,
      balanceBefore,
      balanceAfter: user.balance
    });
    await transaction.save();

    res.json({
      success: true,
      message: `Balance ${operation === 'add' ? 'added to' : 'subtracted from'} user`,
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Edit user balance error:', error);
    res.status(500).json({ error: 'Failed to update user balance' });
  }
};

// Add movie to voting
exports.addVotingMovie = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, googleDriveLink, thumbnail, description } = req.body;

    const movie = new Movie({
      title,
      googleDriveLink,
      thumbnail,
      description,
      addedBy: req.user._id
    });

    await movie.save();

    res.status(201).json({
      success: true,
      message: 'Movie added to voting',
      movie
    });
  } catch (error) {
    console.error('Add movie error:', error);
    res.status(500).json({ error: 'Failed to add movie' });
  }
};

// Schedule movie for watching
exports.scheduleMovie = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { movieId, scheduledTime } = req.body;

    let movie;
    if (movieId) {
      movie = await Movie.findById(movieId);
      if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
      }
    } else {
      // Create new movie from provided data
      const { title, googleDriveLink, thumbnail, description } = req.body;
      movie = new Movie({
        title: title || 'New Movie',
        googleDriveLink,
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
        description: description || 'Scheduled by admin',
        addedBy: req.user._id
      });
    }

    movie.scheduledTime = scheduledTime;
    movie.isScheduled = true;
    movie.isPlaying = false;

    await movie.save();

    res.json({
      success: true,
      message: 'Movie scheduled successfully',
      movie
    });
  } catch (error) {
    console.error('Schedule movie error:', error);
    res.status(500).json({ error: 'Failed to schedule movie' });
  }
};

// Set movie as playing
exports.setMoviePlaying = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { movieId } = req.params;
    const { scheduledTime } = req.body;

    // Set all other movies as not playing
    await Movie.updateMany({}, { isPlaying: false });

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    movie.isPlaying = true;
    movie.isScheduled = scheduledTime ? true : false;
    if (scheduledTime) {
      movie.scheduledTime = scheduledTime;
    } else {
      movie.scheduledTime = new Date();
    }

    await movie.save();

    res.json({
      success: true,
      message: 'Movie set as playing',
      movie
    });
  } catch (error) {
    console.error('Set movie playing error:', error);
    res.status(500).json({ error: 'Failed to set movie playing' });
  }
};

// Execute admin command
exports.executeCommand = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { command } = req.body;
    
    let message = 'Command executed';
    
    if (command.startsWith('CLOSE_CINEMA')) {
      // Logic to close cinema
      message = 'Cinema closed successfully';
    } else if (command.startsWith('OPEN_CINEMA')) {
      // Logic to open cinema
      message = 'Cinema opened successfully';
    } else if (command.startsWith('ADD_ANNOUNCEMENT:')) {
      const text = command.replace('ADD_ANNOUNCEMENT:', '');
      message = `Announcement "${text}" added`;
    } else if (command.startsWith('SET_VOTING_TIME:')) {
      const time = command.replace('SET_VOTING_TIME:', '');
      message = `Voting time set to ${time}`;
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
};

// Send announcement
exports.sendAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { text, page } = req.body;

    const announcement = new Announcement({
      text,
      page: page || 'all',
      createdBy: req.user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await announcement.save();

    res.json({
      success: true,
      message: `Announcement sent to ${page} page`,
      announcement
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({ error: 'Failed to send announcement' });
  }
};

// Get recent announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { expiresAt: { $gte: new Date() } },
        { expiresAt: null }
      ]
    })
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to get announcements' });
  }
};

// Grant admin access via pin/command
exports.grantAdminAccess = async (req, res) => {
  try {
    const { pin, command } = req.body;
    const userId = req.user._id;

    // Check pin and command
    if (pin !== "141612" || command !== "MENU BOUNCER 0 REALLY 1") {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid pin or command' 
      });
    }

    // Update user role to admin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.role = 'admin';
    await user.save();

    res.json({
      success: true,
      message: 'Admin access granted! You can now access the admin panel.',
      user: user.toProfileJSON()
    });
  } catch (error) {
    console.error('Grant admin access error:', error);
    res.status(500).json({ success: false, error: 'Failed to grant admin access' });
  }
};
