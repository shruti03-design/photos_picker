import { Platform } from 'react-native';

export const Config = {
  // CHANGE THIS TO YOUR BACKEND URL
  API_BASE_URL: __DEV__ 
    ? (Platform.OS === 'web' 
        ? 'http://localhost:3000'        // Backend URL for web
        : 'http://10.0.2.2:3000')        // Backend URL for Android emulator
    : 'https://your-production-backend.com',
  
  FRONTEND_BASE_URL: __DEV__
    ? (Platform.OS === 'web'
        ? 'http://localhost:8081'        // Expo web URL
        : 'shrutigooglephotospicker://')  // Deep link for Android
    : (Platform.OS === 'web'
        ? 'https://your-production-frontend.com'
        : 'shrutigooglephotospicker://'),
  
  OAUTH_CALLBACK_PATH: Platform.OS === 'web' ? '/oauth-callback' : 'oauth-callback',
};

export const getCallbackUrl = () => {
  if (Platform.OS === 'web') {
    return `${Config.FRONTEND_BASE_URL}${Config.OAUTH_CALLBACK_PATH}`;
  }
  return `${Config.FRONTEND_BASE_URL}${Config.OAUTH_CALLBACK_PATH}`;
};