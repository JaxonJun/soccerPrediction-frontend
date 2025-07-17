// Frontend Configuration
const config = {
  // API Base URL - Update this with your Render backend URL
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'  // Development
    : 'https://your-render-app.onrender.com',  // Production - UPDATE THIS!
  
  // App Configuration
  APP_NAME: 'Soccer Prediction',
  VERSION: '1.0.0',
  
  // Features
  FEATURES: {
    MULTILINGUAL: true,
    REAL_TIME_UPDATES: true,
    ADMIN_PANEL: true
  },
  
  // Default Settings
  DEFAULT_LANGUAGE: 'en',
  MATCHES_PER_PAGE: 10,
  REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Environment
  ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production'
};

// Make config globally available
window.APP_CONFIG = config;