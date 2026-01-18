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

// Function to inject scripts into HTML pages automatically
const injectScriptsIntoHTML = (html) => {
    // Inject Google Ads script into head
    const googleAdsScript = `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7111358981076444" crossorigin="anonymous"></script>
    <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
    </script>`;
    
    // Inject Telegram Web App SDK if not present
    if (!html.includes('telegram-web-app.js')) {
        const telegramSDK = '<script src="https://telegram.org/js/telegram-web-app.js"></script>';
        html = html.replace('</head>', `${telegramSDK}\n</head>`);
    }
    
    // Inject Google Ads script if not present
    if (!html.includes('adsbygoogle.js')) {
        html = html.replace('</head>', `${googleAdsScript}\n</head>`);
    }
    
    // Inject Telegram authentication and ads initialization script
    const initScript = `
    <script>
        // Telegram Web App initialization
        const tg = window.Telegram?.WebApp;
        
        if (tg) {
            // Expand Telegram Web App to full screen
            tg.expand();
            tg.enableClosingConfirmation();
            
            // Set up Telegram theme colors
            const themeColors = tg.themeParams || {};
            if (themeColors.bg_color) {
                document.documentElement.style.setProperty('--tg-bg-color', themeColors.bg_color);
                document.body.style.backgroundColor = themeColors.bg_color;
            }
            if (themeColors.text_color) {
                document.documentElement.style.setProperty('--tg-text-color', themeColors.text_color);
                document.body.style.color = themeColors.text_color;
            }
            
            // Authenticate with Telegram if needed
            const initData = tg.initData;
            const telegramUser = tg.initDataUnsafe?.user;
            
            if (initData && !localStorage.getItem('token')) {
                // Auto-authenticate with Telegram
                fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ initData })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.token) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        
                        // Update UI with user info
                        updateUserUI(data.user);
                        
                        console.log('✅ Telegram authentication successful');
                    }
                })
                .catch(error => {
                    console.error('Telegram auth error:', error);
                });
            }
            
            // Store Telegram data for future API calls
            window.telegramInitData = initData;
            window.telegramUser = telegramUser;
        }
        
        // Configure fetch to include Telegram auth header
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (typeof url === 'string' && url.startsWith('/api/')) {
                const token = localStorage.getItem('token');
                const initData = window.telegramInitData || localStorage.getItem('telegramInitData');
                
                options.headers = {
                    ...options.headers,
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    options.headers['Authorization'] = \`Bearer \${token}\`;
                } else if (initData) {
                    options.headers['x-telegram-init-data'] = initData;
                }
            }
            return originalFetch.call(this, url, options);
        };
        
        // Function to update UI with user info
        function updateUserUI(user) {
            // Update username
            const usernameElements = document.querySelectorAll('[data-username]');
            usernameElements.forEach(el => {
                el.textContent = user.username || user.displayName;
            });
            
            // Update display name
            const displayNameElements = document.querySelectorAll('[data-displayname]');
            displayNameElements.forEach(el => {
                el.textContent = user.displayName || user.username;
            });
            
            // Update balance
            const balanceElements = document.querySelectorAll('[data-balance]');
            balanceElements.forEach(el => {
                el.textContent = user.balance || 0;
            });
            
            // Update profile picture
            const profilePicElements = document.querySelectorAll('[data-profilepic]');
            profilePicElements.forEach(el => {
                if (el.tagName === 'IMG') {
                    el.src = user.profilePic || 'default-avatar.png';
                }
            });
            
            // Show/hide admin elements
            const adminElements = document.querySelectorAll('[data-admin]');
            adminElements.forEach(el => {
                el.style.display = user.isAdmin ? 'block' : 'none';
            });
        }
        
        // Check if user is already authenticated
        document.addEventListener('DOMContentLoaded', function() {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (token && user._id) {
                updateUserUI(user);
            } else if (!tg && window.location.pathname !== '/') {
                // Not in Telegram and not authenticated - redirect to home
                console.log('Not authenticated, redirecting to home');
                // window.location.href = '/';
            }
            
            // Auto-refresh Google Ads every 30 seconds
            setInterval(() => {
                if (window.adsbygoogle) {
                    try {
                        (adsbygoogle = window.adsbygoogle || []).push({});
                    } catch (e) {
                        console.log('Ads refresh:', e.message);
                    }
                }
            }, 30000);
        });
    </script>`;
    
    // Inject the initialization script before closing body
    html = html.replace('</body>', `${initScript}\n</body>`);
    
    return html;
};

// Function to serve HTML pages with auto-injected scripts
const servePageWithScripts = (filePath, res) => {
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Auto-inject all necessary scripts
        html = injectScriptsIntoHTML(html);
        
        res.send(html);
    } else {
        res.status(404).send('Page not found');
    }
};

// Serve frontend HTML pages with automatic script injection
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
            .ads-container {
                margin: 30px auto;
                padding: 20px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                max-width: 728px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 Scratch C</h1>
            <p>Earn credits by reading books and watching movies!</p>
            
            <div class="ads-container">
                <!-- Google Ads will be injected here automatically -->
                <ins class="adsbygoogle"
                    style="display:block"
                    data-ad-client="ca-pub-7111358981076444"
                    data-ad-slot="4455809152"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
            </div>
            
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
            
            if (tg && tg.initDataUnsafe.user) {
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
                
                // Auto-expand the app
                tg.expand();
                tg.enableClosingConfirmation();
            } else {
                document.getElementById('telegramStatus').innerHTML = 
                    '❌ Not running in Telegram Web App';
            }
        </script>
    </body>
    </html>
    `;
    
    // Inject Google Ads into the home page too
    const htmlWithAds = injectScriptsIntoHTML(html);
    res.send(htmlWithAds);
});

// Serve all other pages with automatic script injection
app.get('/dashboard', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/dashboard.html'), res);
});

app.get('/reading', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/reading.html'), res);
});

app.get('/cinema', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/cinema.html'), res);
});

app.get('/marketplace', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/marketplace.html'), res);
});

app.get('/profile', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/profile.html'), res);
});

app.get('/settings', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/settings.html'), res);
});

app.get('/admin', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/admin.html'), res);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        botTokenConfigured: !!process.env.BOT_TOKEN,
        googleAdsInjected: true,
        telegramEnabled: true
    });
});

// API endpoint to check if scripts are injected
app.get('/api/scripts/status', (req, res) => {
    res.json({
        telegramSDK: true,
        googleAds: true,
        autoAuth: true,
        version: '1.0.0'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? 'Configured' : 'Not configured'}`);
    console.log(`📱 Telegram Web App: Enabled`);
    console.log(`💰 Google Ads: Enabled (Client: ca-pub-7111358981076444)`);
    console.log(`🔧 Auto-script injection: Active on all HTML pages`);
});
