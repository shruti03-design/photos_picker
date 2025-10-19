import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOAuthUrl,
  verifySession,
  createPickerSession,
  pollPickerSession,
  getPickerResults,
  getMediaItemUrl,
} from '../services/api';

WebBrowser.maybeCompleteAuthSession();

export default function PhotosPicker() {
  const [sessionId, setSessionId] = useState(null);
  const [lastDeepLink, setLastDeepLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [pollingPickerSessionId, setPollingPickerSessionId] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const linkingListenerRef = useRef(null);

  console.log('📱 [PhotosPicker] Component render, Platform:', Platform.OS);

  useEffect(() => {
    console.log('🔄 [PhotosPicker] Mounting component...');
    checkAuthStatus();
    
    console.log('🔗 [PhotosPicker] Setting up deep link listener...');
    
    const subscription = Linking.addEventListener('url', handleDeepLink);
    linkingListenerRef.current = subscription;
    
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('🔗 [PhotosPicker] App opened with initial URL:', url);
        handleDeepLink({ url });
      } else {
        console.log('🔗 [PhotosPicker] No initial URL');
      }
    }).catch(err => {
      console.error('❌ [PhotosPicker] Error getting initial URL:', err);
    });
    
    return () => {
      console.log('🔄 [PhotosPicker] Unmounting, cleaning up listeners...');
      if (linkingListenerRef.current) {
        linkingListenerRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (pollingPickerSessionId && sessionId) {
      console.log('⏱️ [PhotosPicker] Starting polling for picker session');
      const interval = setInterval(() => {
        checkPickerStatus(pollingPickerSessionId);
      }, 3000);
      return () => {
        console.log('⏱️ [PhotosPicker] Stopping polling');
        clearInterval(interval);
      };
    }
  }, [pollingPickerSessionId, sessionId]);

  const handleDeepLink = async ({ url }) => {
    console.log('\n🔗 [PhotosPicker] ========== DEEP LINK RECEIVED ==========');
    console.log('🔗 [PhotosPicker] Full URL:', url);
    
    try {
      try {
        const maybeUrl = new URL(url);
        const nested = maybeUrl.searchParams.get('url');
        if (nested) {
          console.log('🔗 [PhotosPicker] Unwrapped nested URL:', nested);
          url = nested;
        }
      } catch (e) {
        // Not a full URL object, proceed with original string
      }

      if (url.includes('oauth-callback')) {
        console.log('✅ [PhotosPicker] OAuth callback detected');
        setLastDeepLink(url);

        const urlParts = url.split('?');
        if (urlParts.length < 2) {
          console.error('❌ [PhotosPicker] No query parameters in URL');
          setLoading(false);
          return;
        }

        const params = new URLSearchParams(urlParts[1]);
        const returnedSessionId = params.get('sessionId');
        const success = params.get('success');
        const error = params.get('error');
        
        console.log('📊 [PhotosPicker] Parsed params:', {
          sessionId: returnedSessionId,
          success,
          error
        });
        
        if (error) {
          console.error('❌ [PhotosPicker] OAuth error:', error);
          Alert.alert('Authentication Error', `Failed to sign in: ${error}`);
          setLoading(false);
          return;
        }
        
        if (returnedSessionId && success === 'true') {
          console.log('✅ [PhotosPicker] Got valid sessionId:', returnedSessionId);

          await AsyncStorage.setItem('google_session_id', returnedSessionId);
          console.log('💾 [PhotosPicker] Stored sessionId in AsyncStorage');

          setSessionId(returnedSessionId);
          setLastDeepLink(url);
          setAuthenticated(true);
          setLoading(false);

          console.log('✅ [PhotosPicker] Authentication successful!');
          Alert.alert('Success', 'Signed in successfully!');
        } else {
          console.error('❌ [PhotosPicker] Invalid callback parameters');
          Alert.alert('Error', 'Invalid authentication response');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('❌ [PhotosPicker] Error handling deep link:', err);
      Alert.alert('Error', 'Failed to process authentication');
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    console.log('🔍 [PhotosPicker] Checking auth status...');
    try {
      const storedSessionId = await AsyncStorage.getItem('google_session_id');
      console.log('💾 [PhotosPicker] Stored sessionId:', storedSessionId);
      
      if (storedSessionId) {
        console.log('🔍 [PhotosPicker] Verifying stored session...');
        const result = await verifySession(storedSessionId);
        console.log('📥 [PhotosPicker] Verify result:', result);
        
        if (result.authenticated) {
          setSessionId(storedSessionId);
          setAuthenticated(true);
          console.log('✅ [PhotosPicker] User authenticated');
        } else {
          console.log('❌ [PhotosPicker] Session invalid, clearing...');
          await AsyncStorage.removeItem('google_session_id');
        }
      } else {
        console.log('ℹ️ [PhotosPicker] No stored session found');
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Auth check error:', error);
    }
  };

  const handleSignIn = async () => {
    console.log('\n🚀 [PhotosPicker] ========== SIGN IN STARTED ==========');
    console.log('📱 [PhotosPicker] Platform:', Platform.OS);
    setLoading(true);
    
    try {
      console.log('📞 [PhotosPicker] Requesting OAuth URL from backend...');
      const { oauthUrl, sessionId: newSessionId } = await getOAuthUrl();
      console.log('✅ [PhotosPicker] Got OAuth URL');
      console.log('🔑 [PhotosPicker] New SessionId:', newSessionId);

      if (Platform.OS === 'web') {
        console.log('🌐 [PhotosPicker] Web platform: Redirecting window...');
        window.location.href = oauthUrl;
      } else {
        console.log('📱 [PhotosPicker] Android platform: Opening WebBrowser...');
        
        const result = await WebBrowser.openAuthSessionAsync(
          oauthUrl,
          'shrutigooglephotospicker://oauth-callback'
        );
        
        console.log('📥 [PhotosPicker] WebBrowser result:', result);
        
        if (result.type === 'cancel') {
          console.log('⚠️ [PhotosPicker] User cancelled sign in');
          setLoading(false);
        } else if (result.type === 'dismiss') {
          console.log('⚠️ [PhotosPicker] Browser dismissed');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Sign in error:', error);
      Alert.alert('Error', `Sign in failed: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    console.log('👋 [PhotosPicker] Sign out');
    await AsyncStorage.removeItem('google_session_id');
    setSessionId(null);
    setAuthenticated(false);
    setSelectedPhotos([]);
    setPollingPickerSessionId(null);
  };

  const openPhotoPicker = async () => {
    console.log('\n📸 [PhotosPicker] ========== OPEN PICKER CLICKED ==========');
    console.log('🔑 [PhotosPicker] SessionId:', sessionId);
    
    if (!sessionId) {
      console.error('❌ [PhotosPicker] No session ID!');
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setLoading(true);
    
    try {
      console.log('📞 [PhotosPicker] Calling createPickerSession...');
      const result = await createPickerSession(sessionId);
      console.log('✅ [PhotosPicker] Picker session result:', result);
      
      const { pickerUri, sessionId: pickerSessionId } = result;
      console.log('🔗 [PhotosPicker] Picker URI:', pickerUri);
      console.log('🔑 [PhotosPicker] Picker SessionId:', pickerSessionId);

      if (Platform.OS === 'web') {
        console.log('🌐 [PhotosPicker] Opening picker in new window...');
        window.open(pickerUri, '_blank');
      } else {
        console.log('📱 [PhotosPicker] Opening picker with Linking...');
        await Linking.openURL(pickerUri);
      }
      
      console.log('⏱️ [PhotosPicker] Starting to poll for picker session:', pickerSessionId);
      setPollingPickerSessionId(pickerSessionId);
    } catch (error) {
      console.error('❌ [PhotosPicker] Picker error:', error);
      Alert.alert('Error', `Failed to open picker: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkPickerStatus = async (pickerSessionId) => {
    console.log('🔍 [PhotosPicker] Polling picker status...');
    try {
      const result = await pollPickerSession(sessionId, pickerSessionId);
      console.log('📊 [PhotosPicker] Poll result:', result);
      
      if (result.completed === true || result.mediaItemsSet === true) {
        console.log('✅ [PhotosPicker] Selection complete!');
        setPollingPickerSessionId(null);
        await fetchSelectedPhotos(pickerSessionId);
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Poll error:', error);
      setPollingPickerSessionId(null);
    }
  };

  const fetchSelectedPhotos = async (pickerSessionId) => {
    console.log('📥 [PhotosPicker] Fetching selected photos...');
    if (!sessionId) return;

    setLoading(true);
    try {
      const result = await getPickerResults(sessionId, pickerSessionId);
      console.log('✅ [PhotosPicker] Got result:', result);
      console.log('📸 [PhotosPicker] Number of photos:', result.mediaItems?.length);
      
      setSelectedPhotos(result.mediaItems || []);
      
      if (result.mediaItems?.length > 0) {
        Alert.alert('Success', `Selected ${result.mediaItems.length} photo(s)`);
      } else {
        Alert.alert('Info', 'No photos were selected');
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Fetch error:', error);
      Alert.alert('Error', 'Failed to fetch selected photos');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoto = ({ item }) => {
    console.log('🖼️ [PhotosPicker] Rendering item:', item);
    
    let imageUrl = null;
    
    // Use proxy URL if available (preferred method)
    if (item.proxyUrl) {
      imageUrl = `http://localhost:3000${item.proxyUrl}`;
      console.log('✅ Using proxy URL');
    }
    // Fallback: Photos Picker API returns: item.mediaFile.baseUrl
    else if (item.mediaFile?.baseUrl) {
      imageUrl = `${item.mediaFile.baseUrl}=w300-h300`;
      console.log('✅ Using mediaFile.baseUrl (may expire)');
    }
    // Fallback: direct baseUrl 
    else if (item.baseUrl) {
      imageUrl = `${item.baseUrl}=w300-h300`;
      console.log('✅ Using direct baseUrl (may expire)');
    }
    
    if (!imageUrl) {
      console.warn('⚠️ No valid image URL found for item:', item);
      // Use a simple colored div instead of external placeholder
      imageUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ddd" width="300" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="18"%3ENo Image%3C/text%3E%3C/svg%3E';
    }
    
    const filename = item.mediaFile?.filename || item.filename || item.name || `Photo-${item.id?.substring(0, 8)}`;
    
    console.log('🖼️ Final:', { filename, imageUrl: imageUrl.substring(0, 80) });
    
    return (
      <View style={styles.photoItem}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.photoImage}
          resizeMode="cover"
          onError={(e) => {
            console.error('❌ Image load failed:', filename);
            console.error('   URL:', imageUrl);
            console.error('   Error:', e.nativeEvent.error);
          }}
          onLoad={() => {
            console.log('✅ Image loaded:', filename);
          }}
        />
        <Text style={styles.photoFilename} numberOfLines={1}>
          {filename}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Google Photos Picker</Text>
        <Text style={styles.platform}>Platform: {Platform.OS}</Text>

        <View style={styles.debugBox}>
          <Text style={styles.debugLabel}>Last deep link:</Text>
          <Text style={styles.debugText} numberOfLines={1}>{lastDeepLink || 'none'}</Text>
          <Text style={styles.debugLabel}>Stored sessionId:</Text>
          <Text style={styles.debugText} numberOfLines={1}>{sessionId || 'none'}</Text>
        </View>

        {!authenticated ? (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in with Google</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Authenticated</Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={openPhotoPicker}
              disabled={loading || !!pollingPickerSessionId}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {pollingPickerSessionId ? 'Waiting...' : 'Open Photo Picker'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {pollingPickerSessionId && (
        <View style={styles.pollingIndicator}>
          <ActivityIndicator size="small" color="#4285f4" />
          <Text style={styles.pollingText}>Waiting for selection...</Text>
        </View>
      )}

      {selectedPhotos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>
            Selected Photos ({selectedPhotos.length})
          </Text>
          <FlatList
            data={selectedPhotos}
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.photoRow}
            scrollEnabled={false}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#ddd' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 5, 
    textAlign: 'center' 
  },
  platform: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#4caf50', 
    marginRight: 8 
  },
  statusText: { 
    fontSize: 14, 
    color: '#2e7d32', 
    fontWeight: '600' 
  },
  button: { 
    backgroundColor: '#4285f4', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginVertical: 5 
  },
  signOutButton: { 
    backgroundColor: '#ea4335' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#e3f2fd',
    margin: 15,
    borderRadius: 8,
  },
  pollingText: { 
    marginLeft: 10, 
    fontSize: 14, 
    color: '#1976d2' 
  },
  photosSection: { 
    padding: 15 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 15 
  },
  photoRow: { 
    justifyContent: 'space-between', 
    marginBottom: 15 
  },
  photoItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  photoImage: { 
    width: '100%', 
    height: 150 
  },
  photoFilename: { 
    padding: 8, 
    fontSize: 12, 
    color: '#666' 
  },
  debugBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fff8e1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  debugLabel: { 
    fontSize: 10, 
    color: '#666' 
  },
  debugText: { 
    fontSize: 12, 
    color: '#333' 
  },
});