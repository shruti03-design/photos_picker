import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OAuthCallback() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  console.log('🔄 [OAuthCallback] Component mounted');
  console.log('📥 [OAuthCallback] Params:', params);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    console.log('🚀 [OAuthCallback] handleCallback starting...');
    try {
      const sessionId = params.sessionId;
      const error = params.error;

      console.log('🔑 [OAuthCallback] SessionId:', sessionId);
      console.log('❌ [OAuthCallback] Error:', error);

      if (error) {
        console.log('❌ [OAuthCallback] OAuth error detected');
        setStatus(`Authentication failed: ${error}`);
        setTimeout(() => router.replace('/'), 2000);
        return;
      }

      if (!sessionId) {
        console.log('⚠️ [OAuthCallback] No sessionId');
        setStatus('No session ID received');
        setTimeout(() => router.replace('/'), 2000);
        return;
      }

      console.log('💾 [OAuthCallback] Storing sessionId...');
      await AsyncStorage.setItem('google_session_id', sessionId);
      console.log('✅ [OAuthCallback] SessionId stored');
      
      setStatus('Authentication successful! Redirecting...');
      
      setTimeout(() => {
        console.log('🔄 [OAuthCallback] Redirecting to home');
        router.replace('/');
      }, 1000);
    } catch (err) {
      console.error('❌ [OAuthCallback] Error:', err);
      setStatus('Authentication failed');
      setTimeout(() => router.replace('/'), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4285f4" />
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  statusText: { marginTop: 20, fontSize: 16, textAlign: 'center', color: '#333' },
});