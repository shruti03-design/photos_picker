const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
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

// Get selected photos
// Get selected photos
router.get('/result', async (req, res) => {
  console.log('\n📍 [Picker /result] ========== GET RESULTS ==========');
  const { sessionId, pickerSessionId } = req.query;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const tokens = activeSessions.get(sessionId);

  try {
    // CORRECT ENDPOINT: mediaItems with sessionId parameter, not as path
    console.log('📞 [Picker /result] Calling Google Photos Picker API...');
    console.log('🔑 [Picker /result] Picker SessionId:', pickerSessionId);
    
    const response = await axios.get(
      'https://photospicker.googleapis.com/v1/mediaItems',  // ← Changed this
      {
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        params: { 
          sessionId: pickerSessionId,  // ← Pass as query param
          pageSize: 100 
        }
      }
    );

    console.log('✅ [Picker /result] Got', response.data.mediaItems?.length, 'photos');
    
    // Log first photo for debugging
    if (response.data.mediaItems && response.data.mediaItems.length > 0) {
      console.log('📸 [Picker /result] First photo:', {
        id: response.data.mediaItems[0].id,
        filename: response.data.mediaItems[0].filename,
        mimeType: response.data.mediaItems[0].mimeType
      });
    }
    
    res.json({ mediaItems: response.data.mediaItems || [] });
  } catch (error) {
    console.error('❌ [Picker /result] Error:', error.response?.data || error.message);
    console.error('❌ [Picker /result] Status:', error.response?.status);
    res.status(500).json({ 
      error: 'Failed to fetch photos',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;