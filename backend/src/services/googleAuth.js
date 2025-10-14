const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const os = require('os');

console.log('📦 [GoogleAuth] Module loaded');

const activeSessions = new Map();

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function generateOAuthUrl(platform = 'web') {
  console.log('\n🚀 [GoogleAuth] Generating OAuth URL...');
  console.log('📱 [GoogleAuth] Platform:', platform);
  
  const sessionId = crypto.randomUUID();
  
  // Use different redirect URI for Android
  let redirectUri;
  if (platform === 'android') {
    const localIp = getLocalIpAddress();
    redirectUri = `http://${localIp}:3000/api/oauth/callback`;
    console.log('📱 [GoogleAuth] Using local IP for Android:', localIp);
  } else {
    redirectUri = config.redirectUri;
  }
  
  // Encode state with platform info
  const stateData = JSON.stringify({ sessionId, platform });
  const state = Buffer.from(stateData).toString('base64');
  
  const oauthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=code&` +
    `client_id=${config.clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(
      "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"
    )}&` +
    `access_type=offline&prompt=consent&state=${state}`;
  
  console.log('✅ [GoogleAuth] OAuth URL generated');
  console.log('🔑 [GoogleAuth] SessionId:', sessionId);
  console.log('📱 [GoogleAuth] Platform:', platform);
  console.log('🔗 [GoogleAuth] Redirect URI:', redirectUri);
  
  return { oauthUrl, sessionId };
}

async function exchangeCodeForTokens(code, sessionId, platform = 'web') {
  console.log('\n🔄 [GoogleAuth] Exchanging code for tokens...');
  console.log('🔑 [GoogleAuth] Code:', code.substring(0, 20) + '...');
  console.log('📱 [GoogleAuth] Platform:', platform);
  
  // Use platform-appropriate redirect URI
  let redirectUri;
  if (platform === 'android') {
    const localIp = getLocalIpAddress();
    redirectUri = `http://${localIp}:3000/api/oauth/callback`;
  } else {
    redirectUri = config.redirectUri;
  }
  
  console.log('🔗 [GoogleAuth] Using redirect URI:', redirectUri);
  
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');

  const response = await axios.post('https://oauth2.googleapis.com/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  console.log('✅ [GoogleAuth] Tokens received');
  console.log('🔑 [GoogleAuth] Access token:', response.data.access_token?.substring(0, 20) + '...');
  
  return response.data;
}

module.exports = {
  generateOAuthUrl,
  exchangeCodeForTokens,
  activeSessions,
};