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
  console.log('\n📍 [OAuth /callback] ========== CALLBACK RECEIVED ==========');
  console.log('📥 [OAuth /callback] Query params:', req.query);
  console.log('📥 [OAuth /callback] Headers:', req.headers);
  
  const { code, state, error } = req.query;
  
  if (error) {
    console.error('❌ [OAuth /callback] OAuth error:', error);
    const redirectUrl = `shrutigooglephotospicker://oauth-callback?error=${encodeURIComponent(error)}`;
    console.log('🔄 [OAuth /callback] Redirecting to error handler:', redirectUrl);
    return res.redirect(redirectUrl);
  }

  if (!code || !state) {
    console.error('❌ [OAuth /callback] Missing code or state');
    console.error('❌ [OAuth /callback] Code:', code ? 'present' : 'MISSING');
    console.error('❌ [OAuth /callback] State:', state ? 'present' : 'MISSING');
    const redirectUrl = `shrutigooglephotospicker://oauth-callback?error=${encodeURIComponent('missing_parameters')}`;
    return res.redirect(redirectUrl);
  }

  try {
    // Decode state to get sessionId and platform
    console.log('🔓 [OAuth /callback] Decoding state...');
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { sessionId, platform } = stateData;
    
    console.log('🔑 [OAuth /callback] SessionId:', sessionId);
    console.log('📱 [OAuth /callback] Platform:', platform);
    console.log('🔄 [OAuth /callback] Exchanging authorization code for tokens...');
    
    const tokens = await exchangeCodeForTokens(code, sessionId, platform);
    console.log('✅ [OAuth /callback] Successfully got tokens');
    console.log('🔑 [OAuth /callback] Access token length:', tokens.access_token?.length);
    
    // Store tokens in session
    activeSessions.set(sessionId, tokens);
    console.log('💾 [OAuth /callback] Stored tokens in session');
    console.log('📊 [OAuth /callback] Active sessions count:', activeSessions.size);

    // Build redirect URL based on platform
    let redirectUrl;
    if (platform === 'android') {
      // Use deep link for Android
      redirectUrl = `shrutigooglephotospicker://oauth-callback?sessionId=${sessionId}&success=true`;
      console.log('📱 [OAuth /callback] Android deep link redirect');
    } else {
      // Use web URL for web platform
      redirectUrl = `${config.frontendUrl}/oauth-callback?sessionId=${sessionId}&success=true`;
      console.log('🌐 [OAuth /callback] Web URL redirect');
    }
    
    console.log('🔄 [OAuth /callback] Redirecting to:', redirectUrl);
    console.log('✅ [OAuth /callback] ========== CALLBACK COMPLETE ==========\n');
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ [OAuth /callback] Error during token exchange');
    console.error('❌ [OAuth /callback] Error message:', error.message);
    console.error('❌ [OAuth /callback] Error response:', error.response?.data);
    console.error('❌ [OAuth /callback] Stack:', error.stack);
    
    const redirectUrl = `shrutigooglephotospicker://oauth-callback?error=${encodeURIComponent('token_exchange_failed')}`;
    console.log('🔄 [OAuth /callback] Redirecting to error handler:', redirectUrl);
    res.redirect(redirectUrl);
  }
});

router.get('/verify', (req, res) => {
  console.log('\n📍 [OAuth /verify] ========== VERIFY REQUEST ==========');
  const { sessionId } = req.query;
  console.log('🔑 [OAuth /verify] SessionId:', sessionId);

  if (!sessionId || !activeSessions.has(sessionId)) {
    console.log('❌ [OAuth /verify] Invalid or missing session');
    console.log('📊 [OAuth /verify] Active sessions:', Array.from(activeSessions.keys()));
    return res.json({ authenticated: false });
  }

  const tokens = activeSessions.get(sessionId);
  console.log('✅ [OAuth /verify] Session valid');
  console.log('🔑 [OAuth /verify] Has access token:', !!tokens.access_token);
  res.json({ authenticated: true });
});

module.exports = router;