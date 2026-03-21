// LiveKit WebRTC polyfills — DEVRE DIŞI
// registerGlobals() ve url-polyfill burada çağrılırsa uygulama çöker.
// LiveKit bağlantısı livekitService.ts içinde lazy-load ile yapılır.

import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, Image, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useAppState } from '../hooks/useAppState';
import { useStore } from '../store';
import config from '../config';

const { width: W } = Dimensions.get('window');

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Root Layout — Slot kullanılır (Stack yerine)
 * react-native-screens Fabric Android'de crash ediyor,
 * Slot ise pure-JS olduğundan sorunsuz çalışır.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
      SplashScreen.hideAsync();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <View style={splashStyles.container}>
        {/* Orblar — login ile aynı */}
        <View style={splashStyles.orbTopRight} />
        <View style={splashStyles.orbBottomLeft} />
        <View style={splashStyles.orbCenterBlue} />
        <Image
          source={require('../assets/images/ikon.png')}
          style={splashStyles.icon}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return <RootLayoutInner />;
}

/**
 * Inner layout — useAuth hook burada çağrılır (router hazır sonrası)
 */
function RootLayoutInner() {
  const router = useRouter();
  useAuth();

  const { token, isAuthenticated, socketConnected, connectSocket, registerPush } = useStore();

  // ── Push Notification Kayıt ──
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;
    // Expo Go'da push notification desteklenmiyor (SDK 53+), try/catch ile bastır
    try { registerPush(); } catch (e) { console.log('[Layout] Push registration skipped:', e); }

    let isMounted = true;
    const setupPushListeners = async () => {
      try {
        const { pushService } = await import('../services/pushService');
        pushService.setupListeners((data) => {
          if (!isMounted) return;
          switch (data.type) {
            case 'dm':
              if (data.roomId) router.push({ pathname: '/room', params: { roomId: data.roomId } });
              break;
            case 'mention':
            case 'room':
              if (data.roomId || data.roomSlug) {
                router.push({ pathname: '/room', params: { roomId: data.roomId || data.roomSlug || '' } });
              }
              break;
            case 'gift':
              if (data.roomId) router.push({ pathname: '/room', params: { roomId: data.roomId } });
              break;
          }
        });
      } catch (e) {
        console.error('[Layout] Push listener setup failed:', e);
      }
    };
    setupPushListeners();

    return () => {
      isMounted = false;
      import('../services/pushService').then(({ pushService }) => pushService.cleanup()).catch(() => {});
    };
  }, [isAuthenticated]);

  useAppState({
    onForeground: () => {
      if (token && !socketConnected) {
        connectSocket(config.SOCKET_URL, token, config.DEFAULT_TENANT_ID);
      }
    },
    onBackground: () => {
      console.log('[RootLayout] App backgrounded — socket kept alive');
    },
  });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#eee8f5' }} edges={['bottom']}>
        <Slot />
      </SafeAreaView>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee8f5',
  },
  icon: {
    width: W * 0.8,
    height: W * 0.8,
  },
  orbTopRight: {
    position: 'absolute', top: -60, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(180,230,225,0.35)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 60, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(220,180,230,0.25)',
  },
  orbCenterBlue: {
    position: 'absolute', top: '30%' as any, right: -30,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(180,210,240,0.3)',
  },
});
