// Configuration file for Scratch C frontend
const CONFIG = {
  // Backend API URL
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://your-backend-url.com/api',
  
  // AdSense Configuration
  AD_CLIENT: 'ca-pub-7111358981076444',
  AD_SLOT: '4455809152',
  
  // AdGem Offerwall
  ADGEM_APP_ID: '31739',
  ADGEM_IFRAME_URL: 'https://wall.adgaterewards.com/a/pub?appid=31739&uid=',
  
  // Telegram & WhatsApp
  TELEGRAM_GROUP: 'https://t.me/+60VfBwiQ5Z01Yjk0',
  WHATSAPP_COMMUNITY: 'https://chat.whatsapp.com/KGLi5AZqcH1FTxUoTscw2N',
  
  // Logo path
  LOGO_PATH: '/assets/logo.svg',
  
  // Platform fee (20% for offers, 5% for marketplace, 2% for transfers)
  FEES: {
    OFFERWALL: 0.20,
    MARKETPLACE: 0.05,
    TRANSFER: 0.02
  }
};

// Helper function to load ads
function loadAds() {
  // Check if adsbygoogle is loaded
  if (typeof adsbygoogle !== 'undefined') {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } else {
    // Load the AdSense script if not loaded
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CONFIG.AD_CLIENT;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
    
    // Retry after script loads
    script.onload = function() {
      setTimeout(() => {
        if (typeof adsbygoogle !== 'undefined') {
          (adsbygoogle = window.adsbygoogle || []).push({});
        }
      }, 1000);
    };
  }
}

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.clear();
      window.location.href = '/index.html';
      return null;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
}

// Update all HTML files to use the logo:
// Replace the logo container in each HTML file with:
<div class="logo-main">
  <img src="/assets/logo.svg" alt="Scratch C Logo" style="width: 80px; height: 80px;">
</div>

// Add this script to all HTML files before closing </body>:
<script src="/js/config.js"></script>
<script>
  // Initialize ads on page load
  document.addEventListener('DOMContentLoaded', function() {
    loadAds();
  });
</script>
