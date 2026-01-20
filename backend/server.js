const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// IMPORTANT: Allow all origins for now (we'll tighten later)
app.use(cors());

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Import routes
const authRoutes = require('./routes/auth');

// API Routes
app.use('/api/auth', authRoutes);

// Test endpoint - ALWAYS WORKING
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: '✅ Scratch C API is LIVE!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        baseUrl: 'https://scratch-c.onrender.com'
    });
});

// Simple login endpoint for testing
app.post('/api/simple-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Simple login attempt:', username);
        
        // Mock login for testing
        if (username && password) {
            return res.json({
                success: true,
                token: 'test_token_' + Date.now(),
                user: {
                    id: '123',
                    username: username,
                    balance: 100,
                    role: 'user'
                },
                message: 'Login successful (test mode)'
            });
        }
        
        res.status(400).json({ 
            success: false, 
            error: 'Username and password required' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Debug endpoint - shows all files
app.get('/api/debug', (req, res) => {
    const cwd = process.cwd();
    
    try {
        const files = fs.readdirSync(cwd);
        const dirs = files.filter(f => {
            try {
                return fs.statSync(path.join(cwd, f)).isDirectory();
            } catch {
                return false;
            }
        });
        
        // Check for HTML files
        const htmlFiles = files.filter(f => f.endsWith('.html'));
        
        // Look for frontend/public folders
        let hasPublic = false;
        let hasFrontend = false;
        
        try {
            hasPublic = fs.existsSync(path.join(cwd, 'public'));
            hasFrontend = fs.existsSync(path.join(cwd, 'frontend'));
        } catch (e) {}
        
        res.json({
            success: true,
            currentDir: cwd,
            files: files,
            directories: dirs,
            htmlFiles: htmlFiles,
            hasPublic: hasPublic,
            hasFrontend: hasFrontend,
            // Check specific paths
            paths: {
                frontend: path.join(cwd, 'frontend'),
                public: path.join(cwd, 'public'),
                backend: path.join(cwd, 'backend')
            }
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            cwd: cwd
        });
    }
});

// Serve static files - FLEXIBLE SOLUTION
function setupStaticFiles() {
    const cwd = process.cwd();
    const possiblePaths = [
        { name: 'cwd', path: cwd },
        { name: 'public', path: path.join(cwd, 'public') },
        { name: 'frontend', path: path.join(cwd, 'frontend') },
        { name: '../public', path: path.join(cwd, '..', 'public') },
        { name: '../frontend', path: path.join(cwd, '..', 'frontend') }
    ];
    
    for (const { name, path: dirPath } of possiblePaths) {
        try {
            if (fs.existsSync(dirPath) && fs.existsSync(path.join(dirPath, 'index.html'))) {
                console.log(`✅ Serving static files from: ${name} (${dirPath})`);
                app.use(express.static(dirPath));
                return dirPath;
            }
        } catch (e) {
            // Continue
        }
    }
    
    console.log('⚠️ No static files directory found');
    return null;
}

const staticDir = setupStaticFiles();

// Handle all other routes - serve index.html for SPA
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            success: false, 
            error: 'API endpoint not found',
            path: req.path 
        });
    }
    
    // Try to serve the requested file
    if (staticDir) {
        const filePath = path.join(staticDir, req.path);
        
        try {
            if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
                return res.sendFile(filePath);
            }
        } catch (e) {
            // Fall through to index.html
        }
        
        // Fallback to index.html for SPA routes
        const indexPath = path.join(staticDir, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    }
    
    // If no static files found, send basic response
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Scratch C - Setup Required</title>
            <style>
                body { font-family: Arial; padding: 40px; text-align: center; }
                .success { color: green; }
                .error { color: red; }
                .box { 
                    border: 2px solid #ccc; 
                    padding: 20px; 
                    margin: 20px auto; 
                    max-width: 600px; 
                    text-align: left;
                    background: #f9f9f9;
                }
                code { background: #eee; padding: 2px 4px; }
            </style>
        </head>
        <body>
            <h1>Scratch C Backend is Running! 🚀</h1>
            
            <div class="box">
                <h2>✅ Server Status: LIVE</h2>
                <p><strong>URL:</strong> https://scratch-c.onrender.com</p>
                <p><strong>Test API:</strong> <a href="/api/test" target="_blank">/api/test</a></p>
                <p><strong>Debug Info:</strong> <a href="/api/debug" target="_blank">/api/debug</a></p>
            </div>
            
            <div class="box">
                <h2>🔧 Setup Required</h2>
                <p>Your HTML files are not in the expected location.</p>
                <p>Please ensure your HTML files are in one of these folders:</p>
                <ul>
                    <li><code>public/</code> (recommended)</li>
                    <li><code>frontend/</code></li>
                </ul>
                <p>Check the <a href="/api/debug" target="_blank">debug endpoint</a> to see current folder structure.</p>
            </div>
            
            <div class="box">
                <h2>⚡ Quick Test</h2>
                <p>Test login API directly:</p>
                <pre>
fetch('/api/simple-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test', password: 'test' })
})
.then(r => r.json())
.then(console.log)
                </pre>
                <button onclick="testLogin()">Test Login API</button>
                <div id="testResult"></div>
            </div>
            
            <script>
                async function testLogin() {
                    const resultDiv = document.getElementById('testResult');
                    resultDiv.innerHTML = '<p>Testing...</p>';
                    
                    try {
                        const response = await fetch('/api/simple-login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: 'test', password: 'test' })
                        });
                        
                        const data = await response.json();
                        resultDiv.innerHTML = '<p class="success">✅ API Response:</p><pre>' + 
                            JSON.stringify(data, null, 2) + '</pre>';
                    } catch (error) {
                        resultDiv.innerHTML = '<p class="error">❌ Error: ' + error.message + '</p>';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 URL: https://scratch-c.onrender.com`);
        console.log(`📂 Current directory: ${process.cwd()}`);
    });
})
.catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Server still starts even if MongoDB fails (for testing)
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`⚠️ Server running WITHOUT MongoDB on port ${PORT}`);
        console.log(`📂 URL: https://scratch-c.onrender.com`);
    });
});
