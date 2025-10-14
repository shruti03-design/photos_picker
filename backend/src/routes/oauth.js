const express = require('express');
const router = express.Router();
const { generateOAuthUrl, exchangeCodeForTokens, activeSessions } = require('../services/googleAuth');
const config = require('../config/config');

console.log('🛣️ [OAuth Routes] Module loaded');

router.get('/url', (req, res) => {
  console.log('\n📍 [OAuth /url] ========== NEW REQUEST ==========');
  const platform = req.query.platform || 'web';
  console.log('📱 [OAuth /url] Platform:', platform);
  
  try {
    const { oauthUrl, sessionId } = generateOAuthUrl(platform);
    console.log('✅ [OAuth /url] Generated URL');
    console.log('🔑 [OAuth /url] SessionId:', sessionId);
    res.json({ oauthUrl, sessionId });
  } catch (error) {
    console.error('❌ [OAuth /url] Error:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

router.get('/callback', async (req, res) => {
  console.log('\n📍 [OAuth /callback] ========== CALLBACK ==========');
  console.log('📥 [OAuth /callback] Query:', req.query);
  
  const { code, state, error } = req.query;
  
  if (error) {
    console.error('❌ [OAuth /callback] OAuth error:', error);
    return res.redirect(`shrutigooglephotospicker://oauth-callback?error=${error}`);
  }

  if (!code || !state) {
    console.error('❌ [OAuth /callback] Missing code or state');
    return res.status(400).send('Missing code or state');
  }

  try {
    // Decode state to get sessionId and platform
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { sessionId, platform } = stateData;
    
    console.log('🔑 [OAuth /callback] SessionId:', sessionId);
    console.log('📱 [OAuth /callback] Platform:', platform);
    console.log('🔄 [OAuth /callback] Exchanging code for tokens...');
    
    const tokens = await exchangeCodeForTokens(code, sessionId, platform);
    console.log('✅ [OAuth /callback] Got tokens');
    
    activeSessions.set(sessionId, tokens);
    console.log('💾 [OAuth /callback] Stored in session');

    // Platform-aware redirect
    let redirectUrl;
    if (platform === 'android') {
      redirectUrl = `shrutigooglephotospicker://oauth-callback?sessionId=${sessionId}`;
      console.log('📱 [OAuth /callback] Android deep link:', redirectUrl);
    } else {
      redirectUrl = `${config.frontendUrl}/oauth-callback?sessionId=${sessionId}`;
      console.log('🌐 [OAuth /callback] Web redirect:', redirectUrl);
    }
    
    console.log('🔄 [OAuth /callback] Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ [OAuth /callback] Error:', error);
    console.error('❌ [OAuth /callback] Stack:', error.stack);
    res.status(500).send('OAuth callback failed');
  }
});

router.get('/verify', (req, res) => {
  console.log('\n📍 [OAuth /verify] ========== VERIFY ==========');
  const { sessionId } = req.query;
  console.log('🔑 [OAuth /verify] SessionId:', sessionId);

  if (!sessionId || !activeSessions.has(sessionId)) {
    console.log('❌ [OAuth /verify] Invalid session');
    return res.json({ authenticated: false });
  }

  console.log('✅ [OAuth /verify] Session valid');
  res.json({ authenticated: true });
});

module.exports = router;