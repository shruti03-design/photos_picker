const express = require('express');
const router = express.Router();
const axios = require('axios');
const { activeSessions } = require('../services/googleAuth');

console.log('🛣️ [Picker Routes] Module loaded');

// Create picker session
router.get('/session', async (req, res) => {
  console.log('\n📍 [Picker /session] ========== NEW REQUEST ==========');
  const { sessionId } = req.query;
  console.log('🔑 [Picker /session] SessionId:', sessionId);

  if (!sessionId || !activeSessions.has(sessionId)) {
    console.error('❌ [Picker /session] Invalid sessionId');
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const tokens = activeSessions.get(sessionId);
  console.log('🔑 [Picker /session] Has access token:', !!tokens.access_token);

  try {
    console.log('📞 [Picker /session] Calling Google Photos Picker API...');
    const response = await axios.post(
      'https://photospicker.googleapis.com/v1/sessions',
      {},
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ [Picker /session] Picker session created');
    console.log('🆔 [Picker /session] ID:', response.data.id);
    res.json({
      pickerUri: response.data.pickerUri,
      sessionId: response.data.id
    });
  } catch (error) {
    console.error('❌ [Picker /session] Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create picker session' });
  }
});

// Poll picker status
router.get('/poll', async (req, res) => {
  console.log('\n📍 [Picker /poll] ========== POLL ==========');
  const { sessionId, pickerSessionId } = req.query;

  if (!sessionId || !pickerSessionId || !activeSessions.has(sessionId)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const tokens = activeSessions.get(sessionId);

  try {
    const response = await axios.get(
      `https://photospicker.googleapis.com/v1/sessions/${pickerSessionId}`,
      {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      }
    );

    console.log('📊 [Picker /poll] mediaItemsSet:', response.data.mediaItemsSet);
    
    res.json({
      completed: response.data.mediaItemsSet,
      mediaItemsSet: response.data.mediaItemsSet
    });
  } catch (error) {
    console.error('❌ [Picker /poll] Error:', error.response?.data);
    res.status(500).json({ error: 'Failed to poll' });
  }
});

// Get selected photos - CORRECTED to use mediaItems list endpoint
router.get('/result', async (req, res) => {
  console.log('\n📍 [Picker /result] ========== GET RESULTS ==========');
  const { sessionId, pickerSessionId } = req.query;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const tokens = activeSessions.get(sessionId);

  try {
    // The correct endpoint to LIST media items from a picker session
    console.log('📞 [Picker /result] Listing media items from picker session...');
    const response = await axios.get(
      `https://photospicker.googleapis.com/v1/mediaItems`,
      {
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
        },
        params: {
          sessionId: pickerSessionId,
          pageSize: 100
        }
      }
    );

    console.log('📊 [Picker /result] Full API response:', JSON.stringify(response.data, null, 2));

    const mediaItems = response.data.mediaItems || [];
    console.log('✅ [Picker /result] Got', mediaItems.length, 'media items');
    
    if (mediaItems.length > 0) {
      console.log('📸 [Picker /result] First media item:', JSON.stringify(mediaItems[0], null, 2));
    }

    // Add proxy URL to each media item
    const mediaItemsWithProxy = mediaItems.map(item => ({
      ...item,
      proxyUrl: `/api/picker/image/${sessionId}/${encodeURIComponent(item.mediaFile.baseUrl)}`
    }));

    res.json({ mediaItems: mediaItemsWithProxy });
    
  } catch (error) {
    console.error('❌ [Picker /result] Error:', error.response?.data || error.message);
    console.error('❌ [Picker /result] Status:', error.response?.status);
    console.error('❌ [Picker /result] Full error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch photos',
      details: error.response?.data || error.message
    });
  }
});

// Proxy endpoint to serve images with proper authorization
router.get('/image/:sessionId/:imageUrl(*)', async (req, res) => {
  const { sessionId, imageUrl } = req.params;
  const { w = 300, h = 300 } = req.query;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const tokens = activeSessions.get(sessionId);
  const decodedUrl = decodeURIComponent(imageUrl);
  const fullUrl = `${decodedUrl}=w${w}-h${h}`;

  console.log('🖼️ [Picker /image] Proxying image:', fullUrl.substring(0, 80) + '...');

  try {
    const response = await axios.get(fullUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
      responseType: 'arraybuffer'
    });

    // Set appropriate headers
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(response.data);
    
    console.log('✅ [Picker /image] Image proxied successfully');
  } catch (error) {
    console.error('❌ [Picker /image] Error:', error.message);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

module.exports = router;