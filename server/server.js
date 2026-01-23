const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const readingRoutes = require('./routes/reading');
const cinemaRoutes = require('./routes/cinema');
const marketplaceRoutes = require('./routes/marketplace');
const transferRoutes = require('./routes/transfer');

// Import middleware
const { errorHandler } = require('./middleware/auth');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all requests
app.use('/api/', limiter);

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://pagead2.googlesyndication.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            frameSrc: ["'self'", "https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com"]
        }
    }
}));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : 'http://localhost:5000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve HTML pages from views directory
app.use(express.static(path.join(__dirname, '../views')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/transfer', transferRoutes);

// Serve main HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../
