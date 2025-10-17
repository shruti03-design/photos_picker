//api.js
import axios from 'axios';
import { Platform } from 'react-native';

// Determine a sensible API base depending on platform/environment.
// - Android emulator (classic AVD) can reach host machine at 10.0.2.2
// - If you're using adb reverse, localhost:3000 will work on emulator
// - For physical devices, use your machine IP (or expose backend via ngrok)
const getApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Prefer Android emulator host shortcut which works without adb reverse
    return 'http://10.0.2.2:3000/api';
  }
  // default to localhost for web and ios simulator
  return 'http://localhost:3000/api';
};

const API_BASE = getApiBaseUrl();

console.log('📦 [API] Module loaded');
console.log('🔧 [API] Platform:', Platform.OS);
console.log('🔧 [API] Backend URL:', API_BASE);

// Create axios instance with timeout
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('🌐 [API] ========== OUTGOING REQUEST ==========');
    console.log('🌐 [API] Method:', config.method?.toUpperCase());
    console.log('🌐 [API] URL:', config.url);
    console.log('🌐 [API] Full URL:', `${config.baseURL}${config.url}`);
    console.log('🌐 [API] Params:', config.params);
    console.log('🌐 [API] Headers:', config.headers);
    return config;
  },
  (error) => {
    console.error('❌ [API] Request setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ [API] ========== RESPONSE RECEIVED ==========');
    console.log('✅ [API] Status:', response.status);
    console.log('✅ [API] Data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ [API] ========== ERROR RESPONSE ==========');
    if (error.response) {
      // Server responded with error
      console.error('❌ [API] Status:', error.response.status);
      console.error('❌ [API] Data:', error.response.data);
      console.error('❌ [API] Headers:', error.response.headers);
    } else if (error.request) {
      // Request made but no response
      console.error('❌ [API] No response received');
      console.error('❌ [API] Request:', error.request);
      console.error('❌ [API] Message:', error.message);
      console.error('❌ [API] Code:', error.code);
    } else {
      // Error in request setup
      console.error('❌ [API] Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Test connection
export async function testConnection() {
  console.log('🧪 [API] Testing connection to backend...');
  // Try a few candidate hosts to help development on different setups.
  const hosts = [
    `${API_BASE.replace('/api', '')}`,
    'http://localhost:3000',
    'http://10.0.2.2:3000',
  ];

  for (const host of hosts) {
    try {
      console.log(`🧪 [API] Trying health on ${host}/health`);
      const response = await axios.get(`${host}/health`, { timeout: 3000 });
      console.log('✅ [API] Backend is reachable at', host, response.data);
      return true;
    } catch (err) {
      console.warn('⚠️ [API] No response from', host, err.message);
    }
  }

  console.error('❌ [API] Backend NOT reachable!');
  console.error('❌ [API] Tried hosts:', hosts.join(', '));
  console.error('❌ [API] Make sure:');
  console.error('❌ [API] 1. Backend is running on port 3000');
  console.error('❌ [API] 2. For Android emulator, either run adb reverse tcp:3000 tcp:3000 OR use the AVD host 10.0.2.2');
  console.error('❌ [API] 3. For a physical device, use your machine IP (e.g. http://192.168.x.y:3000) and allow firewall access');
  return false;
}


export async function getOAuthUrl() {
  console.log('🚀 [API] getOAuthUrl: Starting...');
  console.log('📱 [API] Platform:', Platform.OS);
  
  try {
    const response = await apiClient.get('/oauth/url', {
      params: { platform: Platform.OS }
    });
    console.log('✅ [API] getOAuthUrl: Success!');
    return response.data;
  } catch (error) {
    console.error('❌ [API] getOAuthUrl: Failed!');
    throw error;
  }
}

export async function verifySession(sessionId) {
  console.log('🔍 [API] verifySession: Starting...');
  console.log('🔑 [API] SessionId:', sessionId);
  try {
    const response = await apiClient.get('/oauth/verify', {
      params: { sessionId },
    });
    console.log('✅ [API] verifySession: Success!');
    return response.data;
  } catch (error) {
    console.error('❌ [API] verifySession: Failed!');
    return { authenticated: false };
  }
}

export async function createPickerSession(sessionId) {
  console.log('📸 [API] createPickerSession: Starting...');
  console.log('🔑 [API] SessionId:', sessionId);
  try {
    const response = await apiClient.get('/picker/session', {
      params: { sessionId },
    });
    console.log('✅ [API] createPickerSession: Success!');
    return response.data;
  } catch (error) {
    console.error('❌ [API] createPickerSession: Failed!');
    throw error;
  }
}

export async function pollPickerSession(sessionId, pickerSessionId) {
  console.log('⏱️ [API] pollPickerSession: Polling...');
  try {
    const response = await apiClient.get('/picker/poll', {
      params: { sessionId, pickerSessionId },
    });
    return response.data;
  } catch (error) {
    console.error('❌ [API] pollPickerSession: Failed!');
    throw error;
  }
}

export async function getPickerResults(sessionId, pickerSessionId) {
  console.log('📥 [API] getPickerResults: Starting...');
  try {
    const response = await apiClient.get('/picker/result', {
      params: { sessionId, pickerSessionId },
    });
    console.log('✅ [API] getPickerResults: Got', response.data.mediaItems?.length, 'photos');
    return response.data;
  } catch (error) {
    console.error('❌ [API] getPickerResults: Failed!');
    throw error;
  }
}

export function getMediaItemUrl(baseUrl, width = 300, height = 300) {
  return `${baseUrl}=w${width}-h${height}`;
}

// Test connection on module load (only in development)
if (__DEV__) {
  setTimeout(() => {
    testConnection();
  }, 1000);
}