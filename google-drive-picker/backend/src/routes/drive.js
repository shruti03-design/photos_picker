const express = require('express');
const router = express.Router();
const axios = require('axios');
const { activeSessions } = require('../services/googleAuth');

// List files from Google Drive
router.get('/files', async (req, res) => {
  const { sessionId, pageSize = 20, pageToken, query } = req.query;
  console.log('📁 Listing Drive files for session:', sessionId);

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const tokens = activeSessions.get(sessionId);

  try {
    const params = {
      pageSize: parseInt(pageSize),
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, size, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc'
    };

    if (pageToken) params.pageToken = pageToken;
    if (query) params.q = query;

    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      params
    });

    console.log('✅ Retrieved', response.data.files?.length, 'files');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get file metadata
router.get('/files/:fileId', async (req, res) => {
  const { sessionId } = req.query;
  const { fileId } = req.params;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const tokens = activeSessions.get(sessionId);

  try {
    const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      params: {
        fields: 'id, name, mimeType, thumbnailLink, webViewLink, size, createdTime, modifiedTime, description'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Download file
router.get('/files/:fileId/download', async (req, res) => {
  const { sessionId } = req.query;
  const { fileId } = req.params;

  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const tokens = activeSessions.get(sessionId);

  try {
    const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      params: { alt: 'media' },
      responseType: 'stream'
    });

    // Forward the file stream
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Error:', error.response?.data);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;