const express = require('express');
const router = express.Router();
const { generateOAuthUrl, exchangeCodeForTokens, activeSessions } = require('../services/googleAuth');
const config = require('../config/config');

router.get('/url', (req, res) => {
  const platform = req.query.platform || 'web';
  console.log('📍 OAuth URL request from', platform);
  
  try {
    const { oauthUrl, sessionId } = generateOAuthUrl(platform);
    res.json({ oauthUrl, sessionId });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

router.get('/callback', async (req, res) => {
  console.log('📍 OAuth callback received');
  const { code, state, error } = req.query;
  
  if (error) {
    console.error('❌ OAuth error:', error);
    return res.redirect(`googledrivepicker://oauth-callback?error=${error}`);
  }

  if (!code || !state) {
    console.error('❌ Missing code or state');
    return res.redirect('googledrivepicker://oauth-callback?error=missing_parameters');
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { sessionId, platform } = stateData;
    
    console.log('🔄 Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    
    // Store tokens with session ID
    activeSessions.set(sessionId, tokens);
    console.log('✅ Tokens stored for session:', sessionId);

    // Redirect based on platform
    let redirectUrl;
    if (platform === 'android') {
      redirectUrl = `googledrivepicker://oauth-callback?sessionId=${sessionId}&success=true`;
    } else {
      redirectUrl = `${config.frontendUrl}/oauth-callback?sessionId=${sessionId}&success=true`;
    }
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Error:', error);
    res.redirect('googledrivepicker://oauth-callback?error=token_exchange_failed');
  }
});

router.get('/verify', (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.json({ authenticated: false });
  }

  res.json({ authenticated: true });
});

module.exports = router;