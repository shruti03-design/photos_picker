const axios = require('axios');

console.log('📦 [GooglePhotos] Module loaded');

const GOOGLE_PHOTOS_API_BASE = 'https://photospicker.googleapis.com/v1';

console.log('🔧 [GooglePhotos] API Base URL:', GOOGLE_PHOTOS_API_BASE);

// Create a new picker session
async function createPickerSession(accessToken) {
  console.log('\n📸 [GooglePhotos] createPickerSession: Starting...');
  console.log('🔑 [GooglePhotos] Access token:', accessToken?.substring(0, 20) + '...');
  
  try {
    const url = `${GOOGLE_PHOTOS_API_BASE}/sessions`;
    console.log('📞 [GooglePhotos] Calling Google Photos Picker API');
    console.log('🔗 [GooglePhotos] URL:', url);
    console.log('📝 [GooglePhotos] Method: POST');
    console.log('📝 [GooglePhotos] Body: {}');
    
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ [GooglePhotos] Picker session created successfully');
    console.log('📊 [GooglePhotos] Response data:', response.data);
    console.log('🆔 [GooglePhotos] Session ID:', response.data.id);
    console.log('🔗 [GooglePhotos] Picker URI:', response.data.pickerUri?.substring(0, 50) + '...');

    return response.data;
  } catch (error) {
    console.error('❌ [GooglePhotos] Error creating picker session');
    console.error('❌ [GooglePhotos] Error message:', error.message);
    if (error.response) {
      console.error('❌ [GooglePhotos] Status code:', error.response.status);
      console.error('❌ [GooglePhotos] Response data:', error.response.data);
      console.error('❌ [GooglePhotos] Response headers:', error.response.headers);
    }
    throw new Error('Failed to create picker session');
  }
}

// Get session status (check if user finished selecting)
async function getSessionStatus(accessToken, pickerSessionId) {
  console.log('\n⏱️ [GooglePhotos] getSessionStatus: Starting...');
  console.log('🔑 [GooglePhotos] Access token:', accessToken?.substring(0, 20) + '...');
  console.log('🆔 [GooglePhotos] Picker session ID:', pickerSessionId);
  
  try {
    const url = `${GOOGLE_PHOTOS_API_BASE}/sessions/${pickerSessionId}`;
    console.log('📞 [GooglePhotos] Calling Google Photos Picker API');
    console.log('🔗 [GooglePhotos] URL:', url);
    console.log('📝 [GooglePhotos] Method: GET');
    
    const response = await axios.get(
      url,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ [GooglePhotos] Session status retrieved');
    console.log('📊 [GooglePhotos] Response data:', response.data);
    console.log('📍 [GooglePhotos] mediaItemsSet:', response.data.mediaItemsSet);
    console.log('🆔 [GooglePhotos] Session ID:', response.data.id);

    return response.data;
  } catch (error) {
    console.error('❌ [GooglePhotos] Error getting session status');
    console.error('❌ [GooglePhotos] Error message:', error.message);
    if (error.response) {
      console.error('❌ [GooglePhotos] Status code:', error.response.status);
      console.error('❌ [GooglePhotos] Response data:', error.response.data);
    }
    throw new Error('Failed to get session status');
  }
}

// Get selected media items
async function getSelectedMedia(accessToken, pickerSessionId, pageToken) {
  console.log('\n📥 [GooglePhotos] getSelectedMedia: Starting...');
  console.log('🔑 [GooglePhotos] Access token:', accessToken?.substring(0, 20) + '...');
  console.log('🆔 [GooglePhotos] Picker session ID:', pickerSessionId);
  console.log('📄 [GooglePhotos] Page token:', pageToken || 'None');
  
  try {
    const params = {
      pageSize: 100,
    };

    if (pageToken) {
      params.pageToken = pageToken;
      console.log('📄 [GooglePhotos] Including pageToken for pagination');
    }

    const url = `${GOOGLE_PHOTOS_API_BASE}/sessions/${pickerSessionId}/mediaItems`;
    console.log('📞 [GooglePhotos] Calling Google Photos Picker API');
    console.log('🔗 [GooglePhotos] URL:', url);
    console.log('📝 [GooglePhotos] Method: GET');
    console.log('📝 [GooglePhotos] Params:', params);
    
    const response = await axios.get(
      url,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params,
      }
    );

    console.log('✅ [GooglePhotos] Selected media retrieved');
    console.log('📊 [GooglePhotos] Number of items:', response.data.mediaItems?.length || 0);
    console.log('📄 [GooglePhotos] Next page token:', response.data.nextPageToken || 'None');
    
    if (response.data.mediaItems && response.data.mediaItems.length > 0) {
      console.log('📸 [GooglePhotos] First item details:');
      console.log('   ID:', response.data.mediaItems[0].id);
      console.log('   Filename:', response.data.mediaItems[0].filename);
      console.log('   MIME type:', response.data.mediaItems[0].mimeType);
      console.log('   Base URL:', response.data.mediaItems[0].baseUrl?.substring(0, 50) + '...');
    }

    return response.data;
  } catch (error) {
    console.error('❌ [GooglePhotos] Error getting selected media');
    console.error('❌ [GooglePhotos] Error message:', error.message);
    if (error.response) {
      console.error('❌ [GooglePhotos] Status code:', error.response.status);
      console.error('❌ [GooglePhotos] Response data:', error.response.data);
    }
    throw new Error('Failed to get selected media');
  }
}

console.log('✅ [GooglePhotos] Module initialized');

module.exports = {
  createPickerSession,
  getSessionStatus,
  getSelectedMedia,
};