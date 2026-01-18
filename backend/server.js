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
            id: Math.floor(Math.random() * 1000000),
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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reading', validateTelegramData, require('./routes/reading'));
app.use('/api/cinema', validateTelegramData, require('./routes/cinema'));
app.use('/api/marketplace', validateTelegramData, require('./routes/marketplace'));
app.use('/api/admin', validateTelegramData, require('./routes/admin'));

// Public routes (no Telegram auth required)
app.use('/api/public', require('./routes/public'));

// Function to inject Google Ads into HTML
const injectGoogleAds = (html) => {
    const googleAdsScript = `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7111358981076444" crossorigin="anonymous"></script>
    <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
    </script>`;
    
    // Inject Google Ads script if not present
    if (!html.includes('adsbygoogle.js')) {
        html = html.replace('</head>', `${googleAdsScript}\n</head>`);
    }
    
    return html;
};

// Serve all HTML pages with Google Ads
const servePage = (filePath, res) => {
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Inject Google Ads
        html = injectGoogleAds(html);
        
        res.send(html);
    } else {
        res.status(404).send('Page not found');
    }
};

// Telegram Landing Page
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Scratch C - Earn Credits</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
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
                margin: 50px auto;
            }
            h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                color: #FFD700;
            }
            .telegram-btn {
                background: #2AABEE;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 18px;
                cursor: pointer;
                margin: 20px 0;
                font-weight: bold;
                width: 100%;
            }
            .telegram-btn:hover {
                background: #229ED9;
            }
            .status-box {
                background: rgba(0,0,0,0.2);
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: left;
                font-family: monospace;
            }
            .success { color: #00FF00; }
            .error { color: #FF0000; }
            .info { color: #FFD700; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 Scratch C</h1>
            <p>Earn credits by reading books and watching movies!</p>
            
            <div class="status-box">
                <strong>Telegram Status:</strong> <span id="telegramStatus" class="info">Checking...</span>
            </div>
            
            <div id="telegramSection">
                <p>Please open this app through Telegram</p>
                <button class="telegram-btn" onclick="openInTelegram()">
                    📱 Open in Telegram
                </button>
            </div>
            
            <div id="userSection" style="display: none;">
                <h2>Welcome, <span id="userName"></span>! 👋</h2>
                <p>Starting balance: <strong>50 credits</strong> 🎁</p>
                <button class="telegram-btn" onclick="launchApp()" style="background: #FFD700; color: black;">
                    🚀 Launch Scratch C
                </button>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                <p style="color: #aaa; font-size: 14px;">
                    <strong>Note:</strong> This app requires Telegram. 
                    <a href="/dashboard" style="color: #FFD700;">Click here for development access</a>
                </p>
            </div>
        </div>
        
        <script>
            const tg = window.Telegram?.WebApp;
            
            function checkTelegram() {
                const statusEl = document.getElementById('telegramStatus');
                const telegramSection = document.getElementById('telegramSection');
                const userSection = document.getElementById('userSection');
                
                if (tg && tg.initDataUnsafe.user) {
                    // User is in Telegram Web App
                    const user = tg.initDataUnsafe.user;
                    statusEl.textContent = '✅ Authenticated via Telegram';
                    statusEl.className = 'success';
                    
                    // Show user section
                    document.getElementById('userName').textContent = user.first_name || user.username || 'User';
                    telegramSection.style.display = 'none';
                    userSection.style.display = 'block';
                    
                    // Expand app
                    tg.expand();
                    tg.enableClosingConfirmation();
                    
                    // Auto-launch after 3 seconds
                    setTimeout(launchApp, 3000);
                } else {
                    statusEl.textContent = '❌ Not in Telegram Web App';
                    statusEl.className = 'error';
                    telegramSection.style.display = 'block';
                    userSection.style.display = 'none';
                }
            }
            
            function launchApp() {
                if (tg && tg.initData) {
                    // Send Telegram data to server
                    fetch('/api/auth/telegram', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ initData: tg.initData })
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            // Store token and redirect
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('user', JSON.stringify(data.user));
                            window.location.href = '/dashboard';
                        }
                    })
                    .catch(err => {
                        console.error('Auth error:', err);
                        // Try direct redirect anyway
                        window.location.href = '/dashboard';
                    });
                } else {
                    // Not in Telegram, go to dashboard directly
                    window.location.href = '/dashboard';
                }
            }
            
            function openInTelegram() {
                const botUrl = 'https://t.me/CINETASKbot/Scratch';
                window.open(botUrl, '_blank');
            }
            
            // Check Telegram status on load
            document.addEventListener('DOMContentLoaded', checkTelegram);
        </script>
    </body>
    </html>
    `;
    
    const htmlWithAds = injectGoogleAds(html);
    res.send(htmlWithAds);
});

// Dashboard and other pages
app.get('/dashboard', (req, res) => {
    servePage(path.join(__dirname, '../frontend/dashboard.html'), res);
});

app.get('/reading', (req, res) => {
    servePage(path.join(__dirname, '../frontend/reading.html'), res);
});

app.get('/cinema', (req, res) => {
    servePage(path.join(__dirname, '../frontend/cinema.html'), res);
});

app.get('/marketplace', (req, res) => {
    servePage(path.join(__dirname, '../frontend/marketplace.html'), res);
});

app.get('/profile', (req, res) => {
    servePage(path.join(__dirname, '../frontend/profile.html'), res);
});

app.get('/admin', (req, res) => {
    servePage(path.join(__dirname, '../frontend/admin.html'), res);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        telegram: true,
        googleAds: true,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Telegram-only authentication`);
    console.log(`💰 Google Ads injected on all pages`);
});
