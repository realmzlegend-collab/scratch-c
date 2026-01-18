const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (Crucial for logo.svg)
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// --- LOGO & ADS INJECTION LOGIC ---
const injectContent = (html) => {
    // 1. Inject Google Ads
    const adsScript = `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7111358981076444" crossorigin="anonymous"></script>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;
    
    // 2. Inject Logo Fixer (Replaces logo without touching HTML files)
    const logoScript = `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const logos = document.querySelectorAll('img[src*="logo"], .logo, #logo, .brand img');
            logos.forEach(el => {
                if(el.tagName === 'IMG') el.src = '/logo.svg';
                else el.style.backgroundImage = "url('/logo.svg')";
            });
        });
    </script>`;

    if (!html.includes('adsbygoogle.js')) {
        html = html.replace('</head>', `${adsScript}\n${logoScript}\n</head>`);
    }
    return html;
};

const servePage = (filePath, res) => {
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        res.send(injectContent(html));
    } else {
        res.status(404).send('Page not found');
    }
};

// --- ROUTES ---
app.use('/api/auth', require('./routes/auth')); // Points to the updated auth file below

// Serve Pages
app.get('/', (req, res) => servePage(path.join(__dirname, '../frontend/index.html'), res));
app.get('/dashboard', (req, res) => servePage(path.join(__dirname, '../frontend/dashboard.html'), res));
app.get('/reading', (req, res) => servePage(path.join(__dirname, '../frontend/reading.html'), res));
app.get('/cinema', (req, res) => servePage(path.join(__dirname, '../frontend/cinema.html'), res));
app.get('/marketplace', (req, res) => servePage(path.join(__dirname, '../frontend/marketplace.html'), res));
app.get('/profile', (req, res) => servePage(path.join(__dirname, '../frontend/profile.html'), res));
app.get('/admin', (req, res) => servePage(path.join(__dirname, '../frontend/admin.html'), res));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
