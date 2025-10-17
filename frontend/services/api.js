//api.js
import axios from 'axios';
import { Platform } from 'react-native';

// Use localhost for both web and Android (with adb reverse)
const getApiBaseUrl = () => {
  // Both web and Android emulator will use localhost
  // Make sure to run: adb reverse tcp:3000 tcp:3000
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
  headers: {
    'Content-Type': 'application/json',
  },
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
  try {
    const response = await axios.get(`${API_BASE.replace('/api', '')}/health`, {
      timeout: 5000,
    });
    console.log('✅ [API] Backend is reachable!', response.data);
    return true;
  } catch (error) {
    console.error('❌ [API] Backend NOT reachable!');
    console.error('❌ [API] Error:', error.message);
    console.error('❌ [API] Make sure:');
    console.error('❌ [API] 1. Backend is running on port 3000');
    console.error('❌ [API] 2. Run: adb reverse tcp:3000 tcp:3000');
    return false;
  }
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