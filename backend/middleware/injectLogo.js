const injectLogoMiddleware = (req, res, next) => {
    const originalSend = res.send;

    res.send = function(body) {
        if (typeof body === 'string' && body.includes('</html>')) {
            // This script runs in the user's browser automatically
            const logoScript = `
            <script>
                window.addEventListener('DOMContentLoaded', () => {
                    // Force replace all logo-like images with your SVG
                    const logos = document.querySelectorAll('img[src*="logo"], .logo img, #logo');
                    logos.forEach(img => {
                        img.src = '/logo.svg'; 
                    });
                    
                    // Also check for background-images that might be logos
                    const logoDivs = document.querySelectorAll('.logo-container, .brand-logo');
                    logoDivs.forEach(div => {
                        div.style.backgroundImage = "url('/logo.svg')";
                    });
                });
            </script>
            `;
            body = body.replace('</body>', `${logoScript}</body>`);
        }
        originalSend.call(this, body);
    };
    next();
};

module.exports = injectLogoMiddleware;
