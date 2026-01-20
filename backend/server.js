const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const app = express();

// CORS for Render
app.use(cors({
    origin: '*', // Allow all origins for now (tighten later)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Import routes
const authRoutes = require('./routes/auth');
// Add other routes as needed

// API Routes
app.use('/api/auth', authRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Scratch C API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Find and serve static files
function serveStaticFiles() {
    const possiblePaths = [
        path.join(__dirname, '..', 'public'),
        path.join(__dirname, '..', 'frontend'),
        path.join(__dirname, 'public'),
        path.join(__dirname, 'frontend'),
        path.join(process.cwd(), 'public'),
        path.join(process.cwd(), 'frontend'),
        __dirname
    ];
    
    for (const dir of possiblePaths) {
        if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
            console.log(`✅ Serving static files from: ${dir}`);
            app.use(express.static(dir));
            return dir;
        }
    }
    
    console.log('⚠️ No static files directory found with index.html');
    return null;
}

const staticDir = serveStaticFiles();

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
        res.sendFile(path.join(staticDir, 'index.html'));
    } else {
        res.send(`
            <html>
                <head><title>Scratch C</title></head>
                <body>
                    <h1>Scratch C Backend is Running!</h1>
                    <p>Server is live at: ${req.protocol}://${req.get('host')}</p>
                    <p>Test API: <a href="/api/test">/api/test</a></p>
                    <p>If you expected to see the frontend, ensure HTML files are in a 'public' or 'frontend' folder.</p>
                </body>
            </html>
        `);
    }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Open your browser at: https://scratch-c.onrender.com`);
        console.log(`📂 Current directory: ${process.cwd()}`);
        console.log(`📂 __dirname: ${__dirname}`);
    });
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});
