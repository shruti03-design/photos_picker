const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');

const activeSessions = new Map();

function generateOAuthUrl(platform = 'web') {
  const sessionId = crypto.randomUUID();
  const redirectUri = config.redirectUri;
  
  const state = Buffer.from(JSON.stringify({ sessionId, platform })).toString('base64');
  
  // Google Drive scopes - much simpler than Photos Picker
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ].join(' ');
  
  const oauthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=code&` +
    `client_id=${config.clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${state}`;
  
  console.log('✅ Generated OAuth URL for', platform);
  return { oauthUrl, sessionId };
}

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);
  params.append('redirect_uri', config.redirectUri);
  params.append('grant_type', 'authorization_code');

  const response = await axios.post('https://oauth2.googleapis.com/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  console.log('✅ Tokens received');
  return response.data;
}

module.exports = {
  generateOAuthUrl,
  exchangeCodeForTokens,
  activeSessions,
};