const fs = require('fs');
const path = require('path');

const injectScriptsMiddleware = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(body) {
        // Only inject if HTML response
        if (typeof body === 'string' && body.includes('</html>')) {
            // Inject Telegram SDK
            if (!body.includes('telegram-web-app.js')) {
                const telegramSDK = '<script src="https://telegram.org/js/telegram-web-app.js"></script>';
                body = body.replace('</head>', `${telegramSDK}\n</head>`);
            }
            
            // Inject Google Ads
            const adsScript = `
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7111358981076444" crossorigin="anonymous"></script>
            <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;
            
            body = body.replace('</head>', `${adsScript}\n</head>`);
            
            // Inject Telegram auth
            const telegramAuth = `
            <script>
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.expand();
                const initData = tg.initData;
                if (initData && !localStorage.getItem('token')) {
                    fetch('/api/auth/telegram', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ initData })
                    }).then(r => r.json()).then(data => {
                        if (data.token) {
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('user', JSON.stringify(data.user));
                            console.log('✅ Telegram auth successful');
                        }
                    });
                }
            }
            </script>`;
            
            body = body.replace('</body>', `${telegramAuth}\n</body>`);
        }
        
        originalSend.call(this, body);
    };
    
    next();
};

module.exports = injectScriptsMiddleware;
