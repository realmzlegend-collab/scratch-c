const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const readingRoutes = require('./routes/reading');
const cinemaRoutes = require('./routes/cinema');
const marketplaceRoutes = require('./routes/marketplace');
const transferRoutes = require('./routes/transfer');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve HTML pages
app.use(express.static(path.join(__dirname, '../views')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/transfer', transferRoutes);

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/profile.html'));
});

app.get('/reading', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/reading.html'));
});

app.get('/cinema', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cinema.html'));
});

app.get('/marketplace', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/marketplace.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/chat.html'));
});

app.get('/coming-soon', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/coming-soon.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
});
