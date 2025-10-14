import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [pollingPickerSessionId, setPollingPickerSessionId] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  console.log('📱 [PhotosPicker] Platform:', Platform.OS);

  useEffect(() => {
    console.log('🔄 [PhotosPicker] Mounting, checking auth...');
    checkAuthStatus();
    
    // Add deep link listener for Android
    if (Platform.OS === 'android') {
      const subscription = Linking.addEventListener('url', handleDeepLink);
      
      // Check if app was opened via deep link
      Linking.getInitialURL().then(url => {
        if (url) {
          console.log('🔗 [PhotosPicker] Initial URL:', url);
          handleDeepLink({ url });
        }
      });
      
      return () => subscription.remove();
    }
  }, []);

  useEffect(() => {
    if (pollingPickerSessionId && sessionId) {
      console.log('⏱️ [PhotosPicker] Starting polling');
      const interval = setInterval(() => {
        checkPickerStatus(pollingPickerSessionId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [pollingPickerSessionId, sessionId]);

  const handleDeepLink = async ({ url }) => {
    console.log('🔗 [PhotosPicker] Deep link received:', url);
    
    if (url.includes('oauth-callback')) {
      console.log('✅ [PhotosPicker] OAuth callback detected');
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const returnedSessionId = urlParams.get('sessionId');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('❌ [PhotosPicker] OAuth error:', error);
        Alert.alert('Error', `Authentication failed: ${error}`);
        return;
      }
      
      if (returnedSessionId) {
        console.log('🔑 [PhotosPicker] Got sessionId:', returnedSessionId);
        await AsyncStorage.setItem('google_session_id', returnedSessionId);
        setSessionId(returnedSessionId);
        setAuthenticated(true);
        Alert.alert('Success', 'Signed in successfully!');
      }
    }
  };

  const checkAuthStatus = async () => {
    console.log('🔍 [PhotosPicker] Checking auth status...');
    try {
      const storedSessionId = await AsyncStorage.getItem('google_session_id');
      console.log('💾 [PhotosPicker] Stored sessionId:', storedSessionId);
      
      if (storedSessionId) {
        const result = await verifySession(storedSessionId);
        console.log('📥 [PhotosPicker] Verify result:', result);
        
        if (result.authenticated) {
          setSessionId(storedSessionId);
          setAuthenticated(true);
          console.log('✅ [PhotosPicker] User authenticated');
        } else {
          await AsyncStorage.removeItem('google_session_id');
          console.log('❌ [PhotosPicker] Session invalid');
        }
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Auth check error:', error);
    }
  };

  const handleSignIn = async () => {
    console.log('🚀 [PhotosPicker] Sign in clicked');
    console.log('📱 [PhotosPicker] Platform:', Platform.OS);
    setLoading(true);
    
    try {
      console.log('📞 [PhotosPicker] Getting OAuth URL...');
      const { oauthUrl, sessionId: newSessionId } = await getOAuthUrl();
      console.log('✅ [PhotosPicker] Got OAuth URL');
      console.log('🔗 [PhotosPicker] URL:', oauthUrl.substring(0, 50) + '...');

      if (Platform.OS === 'web') {
        console.log('🌐 [PhotosPicker] Web: Redirecting...');
        window.location.href = oauthUrl;
      } else {
        console.log('📱 [PhotosPicker] Android: Opening WebBrowser...');
        const result = await WebBrowser.openAuthSessionAsync(
          oauthUrl,
          'shrutigooglephotospicker://oauth-callback'
        );
        console.log('📥 [PhotosPicker] WebBrowser result:', result);
        
        // Note: On Android, the deep link handler will catch the callback
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Sign in error:', error);
      Alert.alert('Error', `Sign in failed: ${error.message}`);
    } finally {
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
    console.log('📸 [PhotosPicker] Open picker clicked');
    if (!sessionId) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setLoading(true);
    try {
      const { pickerUri, sessionId: pickerSessionId } = await createPickerSession(sessionId);
      console.log('✅ [PhotosPicker] Picker session created');
      console.log('🔗 [PhotosPicker] Picker URI:', pickerUri);

      if (Platform.OS === 'web') {
        window.open(pickerUri, '_blank');
      } else {
        await Linking.openURL(pickerUri);
      }
      
      setPollingPickerSessionId(pickerSessionId);
    } catch (error) {
      console.error('❌ [PhotosPicker] Picker error:', error);
      Alert.alert('Error', 'Failed to open picker');
    } finally {
      setLoading(false);
    }
  };

  const checkPickerStatus = async (pickerSessionId) => {
    console.log('🔍 [PhotosPicker] Polling...');
    try {
      const result = await pollPickerSession(sessionId, pickerSessionId);
      
      if (result.completed && result.mediaItemsSet) {
        console.log('✅ [PhotosPicker] Selection complete!');
        setPollingPickerSessionId(null);
        await fetchSelectedPhotos(pickerSessionId);
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Poll error:', error);
    }
  };

  const fetchSelectedPhotos = async (pickerSessionId) => {
    console.log('📥 [PhotosPicker] Fetching photos...');
    if (!sessionId) return;

    setLoading(true);
    try {
      const result = await getPickerResults(sessionId, pickerSessionId);
      console.log('✅ [PhotosPicker] Got photos:', result.mediaItems?.length);
      setSelectedPhotos(result.mediaItems || []);
      
      if (result.mediaItems?.length > 0) {
        Alert.alert('Success', `Selected ${result.mediaItems.length} photo(s)`);
      }
    } catch (error) {
      console.error('❌ [PhotosPicker] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPhoto = ({ item }) => (
    <View style={styles.photoItem}>
      <Image
        source={{ uri: getMediaItemUrl(item.baseUrl, 300, 300) }}
        style={styles.photoImage}
        resizeMode="cover"
      />
      <Text style={styles.photoFilename} numberOfLines={1}>
        {item.filename}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Google Photos Picker</Text>
        <Text style={styles.platform}>Platform: {Platform.OS}</Text>

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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  platform: { fontSize: 12, color: '#666', marginBottom: 15, textAlign: 'center' },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50', marginRight: 8 },
  statusText: { fontSize: 14, color: '#2e7d32', fontWeight: '600' },
  button: { backgroundColor: '#4285f4', padding: 15, borderRadius: 8, alignItems: 'center', marginVertical: 5 },
  signOutButton: { backgroundColor: '#ea4335' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#e3f2fd',
    margin: 15,
    borderRadius: 8,
  },
  pollingText: { marginLeft: 10, fontSize: 14, color: '#1976d2' },
  photosSection: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  photoRow: { justifyContent: 'space-between', marginBottom: 15 },
  photoItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  photoImage: { width: '100%', height: 150 },
  photoFilename: { padding: 8, fontSize: 12, color: '#666' },
});
// Add this function inside PhotosPicker component
const testBackendConnection = async () => {
  console.log('🧪 [Test] Testing backend connection from Android...');
  console.log('🧪 [Test] Platform:', Platform.OS);
  
  try {
    const testUrl = Platform.OS === 'android' 
      ? 'http://10.0.2.2:3000/health'
      : 'http://localhost:3000/health';
    
    console.log('🧪 [Test] Testing URL:', testUrl);
    
    const response = await fetch(testUrl, { timeout: 5000 });
    const data = await response.json();
    
    console.log('✅ [Test] Backend is reachable!', data);
    Alert.alert('Success', 'Backend is reachable from Android!');
  } catch (error) {
    console.error('❌ [Test] Backend NOT reachable!', error.message);
    Alert.alert('Error', `Backend not reachable: ${error.message}`);
  }
};

// Add this button to your JSX (temporarily for testing)
<TouchableOpacity
  style={[styles.button, { backgroundColor: '#ff9800' }]}
  onPress={testBackendConnection}
>
  <Text style={styles.buttonText}>Test Backend Connection</Text>
</TouchableOpacity>