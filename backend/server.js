const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Telegram Web App validation function
const validateTelegramData = (req, res, next) => {
    // Skip validation in development mode
    if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Development mode: Skipping Telegram validation');
        req.telegramUser = {
            id: Math.floor(Math.random() * 1000000).toString(),
            username: 'dev_user',
            first_name: 'Development',
            last_name: 'User'
        };
        return next();
    }

    const initData = req.headers['x-telegram-init-data'] || req.body.initData || req.query.initData;
    
    if (!initData) {
        return res.status(401).json({
            success: false,
            error: 'Telegram authentication required',
            message: 'Please open this app through Telegram'
        });
    }

    try {
        // Parse the initData string
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        
        // Remove hash from params for validation
        params.delete('hash');
        
        // Sort keys alphabetically
        const dataCheckArr = [];
        for (const [key, value] of params.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort((a, b) => a.localeCompare(b));
        
        const dataCheckString = dataCheckArr.join('\n');
        
        // Create secret key using HMAC SHA256
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();
        
        // Calculate HMAC SHA256 hash
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        if (calculatedHash === hash) {
            // Extract user data from initData
            const userStr = params.get('user');
            if (userStr) {
                req.telegramUser = JSON.parse(userStr);
            }
            
            // Extract auth_date and check if it's not too old (24 hours)
            const authDate = parseInt(params.get('auth_date'));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (currentTime - authDate > 86400) { // 24 hours
                return res.status(401).json({
                    success: false,
                    error: 'Session expired',
                    message: 'Please reopen the app from Telegram'
                });
            }
            
            console.log(`✅ Telegram user authenticated: ${req.telegramUser?.username || req.telegramUser?.id}`);
            next();
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid Telegram authentication',
                message: 'Security validation failed'
            });
        }
    } catch (error) {
        console.error('Telegram validation error:', error);
        res.status(401).json({
            success: false,
            error: 'Telegram validation failed',
            message: 'Authentication error'
        });
    }
};

// Route for Telegram auth test
app.get('/api/auth/telegram/test', (req, res) => {
    res.json({
        success: true,
        message: 'Telegram auth endpoint is working',
        requiresBotToken: !!process.env.BOT_TOKEN
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reading', validateTelegramData, require('./routes/reading'));
app.use('/api/cinema', validateTelegramData, require('./routes/cinema'));
app.use('/api/marketplace', validateTelegramData, require('./routes/marketplace'));
app.use('/api/admin', validateTelegramData, require('./routes/admin'));

// Public routes (no Telegram auth required)
app.use('/api/public', require('./routes/public'));

// Serve frontend HTML pages with Telegram JS SDK
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Scratch C - Welcome</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
            }
            .container {
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                margin: 0 auto;
            }
            button {
                background: #FFD700;
                color: black;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 18px;
                cursor: pointer;
                margin: 20px 0;
                font-weight: bold;
            }
            .telegram-info {
                background: rgba(0,0,0,0.2);
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                font-family: monospace;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 Scratch C</h1>
            <p>Earn credits by reading books and watching movies!</p>
            
            <div class="telegram-info">
                <h3>Telegram Web App Status:</h3>
                <div id="telegramStatus">Checking...</div>
            </div>
            
            <div id="launchSection">
                <p>Please open this app through Telegram to continue</p>
                <p><small>Or <a href="/dashboard" style="color: #FFD700;">click here for development mode</a></small></p>
            </div>
            
            <div id="userInfo" style="display: none;">
                <h2>Welcome, <span id="userName"></span>!</h2>
                <button onclick="window.location.href='/dashboard'">🚀 Launch App</button>
            </div>
        </div>
        
        <script>
            // Initialize Telegram Web App
            const tg = window.Telegram.WebApp;
            
            if (tg.initDataUnsafe.user) {
                // User is authenticated via Telegram
                const user = tg.initDataUnsafe.user;
                document.getElementById('telegramStatus').innerHTML = 
                    \`✅ Authenticated as <strong>\${user.username || user.first_name}</strong>\`;
                document.getElementById('userName').textContent = user.first_name;
                document.getElementById('userInfo').style.display = 'block';
                document.getElementById('launchSection').style.display = 'none';
                
                // Store Telegram data for API calls
                localStorage.setItem('telegramInitData', tg.initData);
                localStorage.setItem('telegramUser', JSON.stringify(user));
            } else {
                document.getElementById('telegramStatus').innerHTML = 
                    '❌ Not running in Telegram Web App';
            }
            
            // Expand the app to full height
            tg.expand();
            tg.enableClosingConfirmation();
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// Serve dashboard with Telegram integration
app.get('/dashboard', (req, res) => {
    const filePath = path.join(__dirname, '../frontend/dashboard.html');
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        // Read the HTML file and modify it
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Add Telegram Web App SDK if not already present
        if (!html.includes('telegram-web-app.js')) {
            const telegramScript = '<script src="https://telegram.org/js/telegram-web-app.js"></script>';
            html = html.replace('</head>', `${telegramScript}\n</head>`);
        }
        
        // Add initialization script
        const initScript = `
        <script>
            // Telegram Web App initialization
            const tg = window.Telegram.WebApp || {};
            const initData = tg.initData || localStorage.getItem('telegramInitData') || '';
            const telegramUser = tg.initDataUnsafe?.user || JSON.parse(localStorage.getItem('telegramUser') || '{}');
            
            // Set global variables for API calls
            window.telegramInitData = initData;
            window.telegramUser = telegramUser;
            
            // Configure all fetch requests to include Telegram auth
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
                if (typeof url === 'string' && url.startsWith('/api/')) {
                    options.headers = {
                        ...options.headers,
                        'x-telegram-init-data': initData
                    };
                }
                return originalFetch.call(this, url, options);
            };
            
            // Expand the app
            if (tg.expand) tg.expand();
        </script>
        `;
        
        html = html.replace('</body>', `${initScript}\n</body>`);
        res.send(html);
    } else {
        res.sendFile(filePath);
    }
});

// Other page routes with Telegram integration
const telegramWrapPage = (filePath, res) => {
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Add Telegram Web App SDK if not already present
        if (!html.includes('telegram-web-app.js')) {
            const telegramScript = '<script src="https://telegram.org/js/telegram-web-app.js"></script>';
            html = html.replace('</head>', `${telegramScript}\n</head>`);
        }
        
        // Add initialization script
        const initScript = `
        <script>
            // Telegram Web App initialization
            const tg = window.Telegram.WebApp || {};
            const initData = tg.initData || localStorage.getItem('telegramInitData') || '';
            const telegramUser = tg.initDataUnsafe?.user || JSON.parse(localStorage.getItem('telegramUser') || '{}');
            
            // Set global variables for API calls
            window.telegramInitData = initData;
            window.telegramUser = telegramUser;
            
            // Configure all fetch requests to include Telegram auth
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
                if (typeof url === 'string' && url.startsWith('/api/')) {
                    options.headers = {
                        ...options.headers,
                        'x-telegram-init-data': initData
                    };
                }
                return originalFetch.call(this, url, options);
            };
            
            // Expand the app
            if (tg.expand) tg.expand();
            
            // Check if user is authenticated
            if (!telegramUser.id && !localStorage.getItem('token')) {
                window.location.href = '/';
            }
        </script>
        `;
        
        html = html.replace('</body>', `${initScript}\n</body>`);
        res.send(html);
    } else {
        res.sendFile(filePath);
    }
};

app.get('/reading', (req, res) => {
    telegramWrapPage(path.join(__dirname, '../frontend/reading.html'), res);
});

app.get('/cinema', (req, res) => {
    telegramWrapPage(path.join(__dirname, '../frontend/cinema.html'), res);
});

app.get('/marketplace', (req, res) => {
    telegramWrapPage(path.join(__dirname, '../frontend/marketplace.html'), res);
});

app.get('/profile', (req, res) => {
    telegramWrapPage(path.join(__dirname, '../frontend/profile.html'), res);
});

app.get('/settings', (req, res) => {
    telegramWrapPage(path.join(__dirname, '../frontend/settings.html'), res);
});

app.get('/admin', (req, res) => {
    telegramWrapPage(path.join(__dirname, '../frontend/admin.html'), res);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        botTokenConfigured: !!process.env.BOT_TOKEN
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? 'Configured' : 'Not configured'}`);
    console.log(`📱 Telegram Web App: ${process.env.BOT_TOKEN ? 'Enabled' : 'Disabled (set BOT_TOKEN in .env)'}`);
});
