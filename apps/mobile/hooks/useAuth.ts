/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — useAuth Hook
   Session restore + route guard + socket lifecycle
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useStore } from '../store';
import { getToken, getUserData } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

/**
 * Uygulama açılınca çağrılır:
 * 1. AsyncStorage'dan token + user restore eder
 * 2. Store'a yazar + socket bağlantısını başlatır
 * 3. Route guard mantığı uygular
 * 4. Logout'ta socket disconnect yapar
 */
export function useAuth() {
  const router = useRouter();
  const segments = useSegments();
  const socketInitialized = useRef(false);
  const {
    isAuthenticated,
    isAdmin,
    isLoading,
    token,
    user,
    socketConnected,
    loginWithSocket,
    logoutWithSocket,
    clearAuth,
    setLoading,
  } = useStore();

  // ── Session Restore + Socket Connect ──
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await getToken();
        const storedUser = await getUserData();
        const storedTenantId = await AsyncStorage.getItem(config.STORAGE_KEYS.TENANT_ID);

        if (storedToken && storedUser) {
          // Auth + socket bağlantısını aynı anda başlat
          loginWithSocket(
            storedToken,
            storedUser,
            storedTenantId || config.DEFAULT_TENANT_ID,
          );
          socketInitialized.current = true;
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ── Auth değişince socket lifecycle yönet ──
  useEffect(() => {
    if (isLoading) return;

    // Auth olduysa ama socket başlatılmadıysa → bağlan
    if (isAuthenticated && token && !socketConnected && !socketInitialized.current) {
      const tenantId = config.DEFAULT_TENANT_ID;
      loginWithSocket(token, user!, tenantId);
      socketInitialized.current = true;
    }

    // Auth kaybolduysa → socket zaten logoutWithSocket'te temizlenir
    if (!isAuthenticated) {
      socketInitialized.current = false;
    }
  }, [isAuthenticated, isLoading]);

  // ── Route Guard ──
  useEffect(() => {
    if (isLoading) return;

    const currentRoute = (segments[0] || '') as string;
    const isLoginPage = currentRoute === '' || currentRoute === 'index';
    const isAdminPage = currentRoute === 'admin';

    if (!isAuthenticated && !isLoginPage) {
      router.replace('/');
    } else if (isAuthenticated && isLoginPage) {
      router.replace('/home');
    } else if (isAdminPage && !isAdmin) {
      router.replace('/home');
    }
  }, [isAuthenticated, isAdmin, isLoading, segments]);

  return {
    isAuthenticated,
    isAdmin,
    isLoading,
    socketConnected,
    logout: logoutWithSocket,
  };
}

export default useAuth;
