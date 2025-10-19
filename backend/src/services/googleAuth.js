const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');

console.log('📦 [GoogleAuth] Module loaded');

const activeSessions = new Map();

function generateOAuthUrl(platform = 'web') {
  console.log('\n🚀 [GoogleAuth] Generating OAuth URL...');
  console.log('📱 [GoogleAuth] Platform:', platform);
  
  const sessionId = crypto.randomUUID();
  
  // Always use localhost:3000 (works for both web and Android with adb reverse)
  const redirectUri = 'http://localhost:3000/api/oauth/callback';
  
  console.log('🔗 [GoogleAuth] Redirect URI:', redirectUri);
  
  // Encode state with platform info
  const stateData = JSON.stringify({ sessionId, platform });
  const state = Buffer.from(stateData).toString('base64');
  
  const oauthUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `response_type=code&` +
  `client_id=${config.clientId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `scope=${encodeURIComponent(
    "https://www.googleapis.com/auth/photospicker.mediaitems.readonly https://www.googleapis.com/auth/photoslibrary.readonly"  // ← Added Photos Library scope
  )}&` +
  `access_type=offline&prompt=consent&state=${state}`;
  
  console.log('✅ [GoogleAuth] OAuth URL generated');
  console.log('🔑 [GoogleAuth] SessionId:', sessionId);
  
  return { oauthUrl, sessionId };
}

async function exchangeCodeForTokens(code, sessionId, platform = 'web') {
  console.log('\n🔄 [GoogleAuth] Exchanging code for tokens...');
  console.log('🔑 [GoogleAuth] Code:', code.substring(0, 20) + '...');
  console.log('📱 [GoogleAuth] Platform:', platform);
  
  // Always use localhost:3000 (works for both web and Android with adb reverse)
  const redirectUri = 'http://localhost:3000/api/oauth/callback';
  
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