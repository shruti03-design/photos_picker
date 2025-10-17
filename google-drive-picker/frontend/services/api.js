import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'
  : 'http://localhost:3000/api'; // Use ADB reverse

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export async function getOAuthUrl() {
  const response = await apiClient.get('/oauth/url', {
    params: { platform: Platform.OS }
  });
  return response.data;
}

export async function verifySession(sessionId) {
  const response = await apiClient.get('/oauth/verify', {
    params: { sessionId }
  });
  return response.data;
}

export async function listDriveFiles(sessionId, pageToken = null) {
  const response = await apiClient.get('/drive/files', {
    params: { sessionId, pageToken, pageSize: 20 }
  });
  return response.data;
}

export async function getFileMetadata(sessionId, fileId) {
  const response = await apiClient.get(`/drive/files/${fileId}`, {
    params: { sessionId }
  });
  return response.data;
}