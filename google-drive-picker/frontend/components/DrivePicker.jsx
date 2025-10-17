import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOAuthUrl, verifySession, listDriveFiles } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

export default function DrivePicker() {
  const [sessionId, setSessionId] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Deep link listener for Android/iOS
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async ({ url }) => {
    console.log('🔗 Deep link received:', url);

    // Expo sometimes wraps the deep link inside a query param like: exp://.../?url=googledrivepicker://oauth-callback?sessionId=... 
    // Unwrap if necessary.
    try {
      const maybeUrl = new URL(url);
      const nested = maybeUrl.searchParams.get('url');
      if (nested) {
        console.log('🔗 [DrivePicker] Unwrapped nested URL:', nested);
        url = nested;
      }
    } catch (e) {
      // not a fully-qualified URL, keep original
    }

    if (url && url.includes('oauth-callback')) {
      const query = url.includes('?') ? url.split('?')[1] : '';
      const params = new URLSearchParams(query);
      const returnedSessionId = params.get('sessionId');
      const success = params.get('success');
      const error = params.get('error');
      
      if (error) {
        console.error('❌ [DrivePicker] OAuth error param:', error);
        Alert.alert('Authentication Error', error);
        setLoading(false);
        return;
      }
      
      if (returnedSessionId && success === 'true') {
        console.log('✅ [DrivePicker] OAuth success, sessionId:', returnedSessionId);
        await AsyncStorage.setItem('drive_session_id', returnedSessionId);
        setSessionId(returnedSessionId);
        setAuthenticated(true);
        setLoading(false);
        Alert.alert('Success', 'Signed in successfully!');

        // Load files after successful auth
        loadFiles(returnedSessionId);
      } else {
        // Ensure loading indicator is cleared on unexpected payloads
        setLoading(false);
      }
    }
  };

  const checkAuth = async () => {
    console.log('🔍 Checking auth status...');
    try {
      const storedSessionId = await AsyncStorage.getItem('drive_session_id');
      
      if (storedSessionId) {
        console.log('💾 Found stored session:', storedSessionId);
        const result = await verifySession(storedSessionId);
        
        if (result.authenticated) {
          setSessionId(storedSessionId);
          setAuthenticated(true);
          console.log('✅ User authenticated');
          loadFiles(storedSessionId);
        } else {
          console.log('❌ Session invalid');
          await AsyncStorage.removeItem('drive_session_id');
        }
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    }
  };

  const handleSignIn = async () => {
    console.log('🚀 Sign in started');
    setLoading(true);
    
    try {
      const { oauthUrl } = await getOAuthUrl();
      console.log('✅ Got OAuth URL');
      
      if (Platform.OS === 'web') {
        // Web: redirect current page
        window.location.href = oauthUrl;
      } else {
        // Android/iOS: open auth session
        const result = await WebBrowser.openAuthSessionAsync(
          oauthUrl,
          'googledrivepicker://oauth-callback'
        );
        
        console.log('📥 WebBrowser result:', result);
        
        if (result.type === 'cancel' || result.type === 'dismiss') {
          setLoading(false);
        }
        // Success will be handled by deep link listener
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      Alert.alert('Error', `Sign in failed: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    console.log('👋 Sign out');
    await AsyncStorage.removeItem('drive_session_id');
    setSessionId(null);
    setAuthenticated(false);
    setFiles([]);
  };

  const loadFiles = async (sid = null) => {
    console.log('📁 Loading files...');
    const currentSessionId = sid || sessionId;
    
    if (!currentSessionId) {
      console.log('⚠️ No session ID');
      return;
    }
    
    setLoading(true);
    try {
      const data = await listDriveFiles(currentSessionId);
      console.log('✅ Got', data.files?.length, 'files');
      setFiles(data.files || []);
    } catch (error) {
      console.error('❌ Failed to load files:', error);
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const renderFile = ({ item }) => (
    <TouchableOpacity style={styles.fileItem}>
      {item.thumbnailLink ? (
        <Image 
          source={{ uri: item.thumbnailLink }} 
          style={styles.thumbnail}
          defaultSource={require('../assets/icon.png')}
        />
      ) : (
        <View style={[styles.thumbnail, styles.noThumbnail]}>
          <Text style={styles.noThumbnailText}>📄</Text>
        </View>
      )}
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.fileType} numberOfLines={1}>
          {item.mimeType?.split('/')[1] || 'file'}
        </Text>
        {item.size && (
          <Text style={styles.fileSize}>
            {formatFileSize(parseInt(item.size))}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Google Drive</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
      </View>

      {!authenticated ? (
        <View style={styles.authContainer}>
          <TouchableOpacity 
            style={styles.signInButton} 
            onPress={handleSignIn} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign in with Google</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.actionBar}>
            <Text style={styles.filesCount}>
              {files.length} file{files.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity 
              style={styles.signOutButton} 
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {loading && files.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4285f4" />
              <Text style={styles.loadingText}>Loading files...</Text>
            </View>
          ) : files.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files found</Text>
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={() => loadFiles()}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={files}
              renderItem={renderFile}
              keyExtractor={item => item.id}
              refreshing={loading}
              onRefresh={() => loadFiles()}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signInButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  filesCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  signOutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#ea4335',
    borderRadius: 5,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 15,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4285f4',
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  listContent: {
    padding: 10,
  },
  fileItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  noThumbnail: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noThumbnailText: {
    fontSize: 30,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  fileType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 11,
    color: '#999',
  },
});