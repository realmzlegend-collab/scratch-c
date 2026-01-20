const Item = require('../models/Item');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/marketplace/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
}).array('images', 5);

// Get marketplace items
exports.getItems = async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search } = req.query;
    
    const query = { status: 'available' };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const items = await Item.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Item.countDocuments(query);
    
    res.json({
      success: true,
      items,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// Upload images
exports.uploadImages = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      const imageUrls = req.files.map(file => 
        `/uploads/marketplace/${file.filename}`
      );
      
      res.json({
        success: true,
        images: imageUrls,
        message: 'Images uploaded successfully'
      });
    } catch (error) {
      console.error('Upload images error:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  });
};

// Create new item
exports.createItem = async (req, res) => {
  try {
    const user = req.user;
    const { 
      title, 
      description, 
      price, 
      category, 
      images, 
      sellerWhatsapp,
      sellerAddress 
    } = req.body;
    
    // Validate price
    if (price < 1) {
      return res.status(400).json({ error: 'Price must be at least 1 credit' });
    }
    
    // Validate WhatsApp number
    if (!sellerWhatsapp.startsWith('+')) {
      return res.status(400).json({ 
        error: 'WhatsApp number must include country code (e.g., +234...)' 
      });
    }
    
    const item = new Item({
      title,
      description,
      price: parseInt(price),
      category,
      images: JSON.parse(images),
      seller: user._id,
      sellerName: user.username,
      sellerWhatsapp,
      sellerAddress: sellerAddress || ''
    });
    
    await item.save();
    
    res.status(201).json({
      success: true,
      message: 'Item listed successfully!',
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};

// Purchase item
exports.purchaseItem = async (req, res) => {
  try {
    const user = req.user;
    const { itemId } = req.params;
    
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check if item is available
    if (item.status !== 'available') {
      return res.status(400).json({ error: 'Item is no longer available' });
    }
    
    // Check if user is buying their own item
    if (item.seller.toString() === user._id.toString()) {
      return res.status(400).json({ error: 'You cannot purchase your own item' });
    }
    
    // Check user balance
    if (user.balance < item.price) {
      return res.status(400).json({ 
        error: 'Insufficient balance. Please earn more credits.' 
      });
    }
    
    // Find seller
    const seller = await User.findById(item.seller);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    // Calculate platform fee (2%)
    const platformFee = item.price * 0.02;
    const sellerAmount = item.price - platformFee;
    
    // Update balances
    user.balance -= item.price;
    user.totalSpent += item.price;
    
    seller.balance += sellerAmount;
    seller.totalEarned += sellerAmount;
    
    await user.save();
    await seller.save();
    
    // Update item status
    item.status = 'sold';
    item.salesCount += 1;
    await item.save();
    
    // Record transactions
    const buyerTransaction = new Transaction({
      user: user._id,
      type: 'purchase',
      amount: item.price,
      description: `Purchased: ${item.title}`,
      reference: `PUR${Date.now()}`,
      balanceBefore: user.balance + item.price,
      balanceAfter: user.balance,
      metadata: { itemId, sellerId: seller._id }
    });
    
    const sellerTransaction = new Transaction({
      user: seller._id,
      type: 'credit',
      amount: sellerAmount,
      description: `Sold: ${item.title}`,
      reference: `SALE${Date.now()}`,
      balanceBefore: seller.balance - sellerAmount,
      balanceAfter: seller.balance,
      metadata: { itemId, buyerId: user._id }
    });
    
    await buyerTransaction.save();
    await sellerTransaction.save();
    
    res.json({
      success: true,
      message: 'Purchase successful! Contact the seller to arrange delivery.',
      item,
      sellerWhatsapp: item.sellerWhatsapp
    });
  } catch (error) {
    console.error('Purchase item error:', error);
    res.status(500).json({ error: 'Failed to purchase item' });
  }
};
