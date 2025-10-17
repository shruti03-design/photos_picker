require('dotenv').config();

const config = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  port: process.env.PORT || 3000,
};

if (!config.clientId || !config.clientSecret) {
  console.error('❌ Missing CLIENT_ID or CLIENT_SECRET in .env');
  process.exit(1);
}

module.exports = config;