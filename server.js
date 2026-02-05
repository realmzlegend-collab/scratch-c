require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/books', 'uploads/movies', 'uploads/marketplace'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://pagead2.googlesyndication.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        }
    }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Database connection with retry
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
};

connectDB();

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reading', require('./routes/reading'));
app.use('/api/cinema', require('./routes/cinema'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/transfer', require('./routes/transfer'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve HTML pages
const servePage = (pageName) => (req, res) => {
    res.sendFile(path.join(__dirname, 'views', `${pageName}.html`));
};

app.get('/', servePage('index'));
app.get('/dashboard', servePage('dashboard'));
app.get('/profile', servePage('profile'));
app.get('/admin', servePage('admin'));
app.get('/reading', servePage('reading'));
app.get('/cinema', servePage('cinema'));
app.get('/marketplace', servePage('marketplace'));
app.get('/chat', servePage('chat'));
app.get('/coming-soon', servePage('coming-soon'));
app.get('/transfer', servePage('transfer'));

// Serve manifest for PWA
app.get('/manifest.json', (req, res) => {
    res.json({
        "name": "Scratch C",
        "short_name": "ScratchC",
        "description": "Earn credits by reading, watching, and completing tasks",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#121212",
        "theme_color": "#FFD700",
        "icons": [
            {
                "src": "/images/icon-192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/images/icon-512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    });
});

// 404 handler
app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    } else if (req.accepts('json')) {
        res.status(404).json({ error: 'Not Found' });
    } else {
        res.status(404).type('txt').send('Not Found');
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('🚨 Server Error:', err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received. Closing HTTP server...');
    mongoose.connection.close(false, () => {
        console.log('📦 MongoDB connection closed.');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('💥 Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

module.exports = app;
