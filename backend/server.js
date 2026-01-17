const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files in production
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Import Routes
const authRoutes = require('./routes/auths');
const userRoutes = require('./routes/users');
const cinemaRoutes = require('./routes/cinema');
const marketplaceRoutes = require('./routes/marketplace');
const readingRoutes = require('./routes/reading');
const offerwallRoutes = require('./routes/offerwall');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/offerwall', offerwallRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Serve frontend HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/cinema', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/cinema.html'));
});

app.get('/marketplace', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/marketplace.html'));
});

app.get('/reading', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/reading.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/profile.html'));
});

// Admin route (hidden)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Serve frontend files in production
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});
