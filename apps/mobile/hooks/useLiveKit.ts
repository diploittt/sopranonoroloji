/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — useLiveKit Hook
   Room ekranında LiveKit ses bağlantısını yönetir
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { livekitService, LiveKitConnectionState } from '../services/livekitService';
import useStore from '../store';

interface UseLiveKitOptions {
  roomSlug: string | undefined;
  enabled?: boolean;
}

interface UseLiveKitReturn {
  /** LiveKit bağlantı durumu */
  connectionState: LiveKitConnectionState;
  /** Ses yayınlanıyor mu */
  isPublishing: boolean;
  /** Video yayınlanıyor mu */
  isVideoPublishing: boolean;
  /** Hata mesajı */
  error: string | null;
  /** Mikrofon sesini yayınla (mic:take sonrası çağır) */
  publishAudio: () => Promise<boolean>;
  /** Ses yayınını durdur (mic:release sonrası çağır) */
  unpublishAudio: () => Promise<void>;
  /** Mikrofonu mute/unmute */
  setMicEnabled: (enabled: boolean) => Promise<void>;
  /** Kamera video yayınını başlat */
  publishVideo: () => Promise<boolean>;
  /** Kamera video yayınını durdur */
  unpublishVideo: () => Promise<void>;
  /** Kamerayı aç/kapat */
  setCameraEnabled: (enabled: boolean) => Promise<void>;
}

export default function useLiveKit({ roomSlug, enabled = true }: UseLiveKitOptions): UseLiveKitReturn {
  // Zustand selector — sadece bu field'lar değişince re-render
  const socketConnected = useStore((s) => s.socketConnected);
  const user = useStore((s) => s.user);

  const [connectionState, setConnectionState] = useState<LiveKitConnectionState>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isVideoPublishing, setIsVideoPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectAttemptedRef = useRef(false);

  // Uygulama durumu takibi
  const appStateRef = useRef(AppState.currentState);
  const wasPublishingRef = useRef(false);
  const wasVideoPublishingRef = useRef(false);

  // ─── Connect/Disconnect lifecycle ─────────────────────────
  useEffect(() => {
    console.log('[useLiveKit] Effect — roomSlug:', roomSlug, 'socketConnected:', socketConnected, 'enabled:', enabled, 'userId:', user?.id);

    if (!roomSlug || !enabled) {
      console.log('[useLiveKit] Atlanıyor — roomSlug veya enabled yok');
      return;
    }

    if (!socketConnected) {
      console.log('[useLiveKit] Atlanıyor — socket bağlı değil, bekliyor...');
      return;
    }

    // Zaten bağlandıysa tekrar deneme
    if (connectAttemptedRef.current && livekitService.isConnected) {
      console.log('[useLiveKit] Zaten bağlı');
      return;
    }

    const userId = user?.id || user?.displayName || `guest_${Date.now()}`;
    const displayName = user?.displayName || user?.id || 'Misafir';

    console.log('[useLiveKit] ✅ Tüm koşullar sağlandı — bağlanıyor:', roomSlug, userId);
    connectAttemptedRef.current = true;

    // Callbacks ayarla
    livekitService.setCallbacks({
      onConnectionStateChanged: (state) => setConnectionState(state),
      onError: (errorMsg) => {
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
      },
      onSpeakingChanged: () => {},
    });

    // Bağlan
    livekitService.connect(roomSlug, userId, displayName).then((success) => {
      console.log('[useLiveKit] Bağlantı sonucu:', success);
      if (!success) {
        setError('LiveKit bağlantısı kurulamadı');
        connectAttemptedRef.current = false; // Tekrar denenebilsin
      }
    });

    // Cleanup
    return () => {
      console.log('[useLiveKit] Cleanup — disconnect');
      connectAttemptedRef.current = false;
      livekitService.clearCallbacks();
      livekitService.disconnect();
      setConnectionState('idle');
      setIsPublishing(false);
      setError(null);
    };
  }, [roomSlug, socketConnected, enabled, user?.id, user?.displayName]);

  // ─── Uygulama Durumu (arka plan/ön plan) ────────────────────
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextState.match(/inactive|background/)) {
        // Arka plana geçerken ses ve video yayınını durdur
        if (livekitService.isPublishing) {
          wasPublishingRef.current = true;
          await livekitService.setMicEnabled(false);
        }
        if (livekitService.isVideoPublishing) {
          wasVideoPublishingRef.current = true;
          await livekitService.setCameraEnabled(false);
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // Ön plana gelince devam ettir
        if (wasPublishingRef.current) {
          wasPublishingRef.current = false;
          await livekitService.setMicEnabled(true);
        }
        if (wasVideoPublishingRef.current) {
          wasVideoPublishingRef.current = false;
          await livekitService.setCameraEnabled(true);
        }
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  // ─── İşlemler ──────────────────────────────────────────────
  const publishAudio = useCallback(async (): Promise<boolean> => {
    const success = await livekitService.publishAudio();
    setIsPublishing(success);
    return success;
  }, []);

  const unpublishAudio = useCallback(async (): Promise<void> => {
    await livekitService.unpublishAudio();
    setIsPublishing(false);
  }, []);

  const setMicEnabled = useCallback(async (en: boolean): Promise<void> => {
    await livekitService.setMicEnabled(en);
  }, []);

  const publishVideo = useCallback(async (): Promise<boolean> => {
    const success = await livekitService.publishVideo();
    setIsVideoPublishing(success);
    return success;
  }, []);

  const unpublishVideo = useCallback(async (): Promise<void> => {
    await livekitService.unpublishVideo();
    setIsVideoPublishing(false);
  }, []);

  const setCameraEnabled = useCallback(async (en: boolean): Promise<void> => {
    await livekitService.setCameraEnabled(en);
  }, []);

  return {
    connectionState,
    isPublishing,
    isVideoPublishing,
    error,
    publishAudio,
    unpublishAudio,
    setMicEnabled,
    publishVideo,
    unpublishVideo,
    setCameraEnabled,
  };
}

