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
  /** Hata mesajı */
  error: string | null;
  /** Mikrofon sesini yayınla (mic:take sonrası çağır) */
  publishAudio: () => Promise<boolean>;
  /** Ses yayınını durdur (mic:release sonrası çağır) */
  unpublishAudio: () => Promise<void>;
  /** Mikrofonu mute/unmute */
  setMicEnabled: (enabled: boolean) => Promise<void>;
}

export default function useLiveKit({ roomSlug, enabled = true }: UseLiveKitOptions): UseLiveKitReturn {
  const { user, socketConnected } = useStore();
  const [connectionState, setConnectionState] = useState<LiveKitConnectionState>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // App state tracking
  const appStateRef = useRef(AppState.currentState);
  const wasPublishingRef = useRef(false);

  // ─── Connect/Disconnect lifecycle ─────────────────────────
  useEffect(() => {
    if (!roomSlug || !user?.id || !socketConnected || !enabled) return;

    // Callbacks ayarla
    livekitService.setCallbacks({
      onConnectionStateChanged: (state) => {
        setConnectionState(state);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        // 5 saniye sonra hatayı temizle
        setTimeout(() => setError(null), 5000);
      },
      onSpeakingChanged: (participantId, isSpeaking) => {
        // Bu bilgi zaten socket üzerinden geliyor,
        // ama LiveKit'ten gelen daha doğru olabilir.
        // İleride store'a yazılabilir.
      },
    });

    // Bağlan
    const connectAsync = async () => {
      const success = await livekitService.connect(roomSlug, user.id, user.displayName || user.id);
      if (!success) {
        setError('LiveKit bağlantısı kurulamadı');
      }
    };
    connectAsync();

    // Cleanup — component unmount veya parametre değişikliği
    return () => {
      livekitService.clearCallbacks();
      livekitService.disconnect();
      setConnectionState('idle');
      setIsPublishing(false);
      setError(null);
    };
  }, [roomSlug, user?.id, socketConnected, enabled]);

  // ─── App State (background/foreground) ────────────────────
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextState.match(/inactive|background/)) {
        // Background'a geçiş — yayın varsa kaydet ve durdur
        if (livekitService.isPublishing) {
          wasPublishingRef.current = true;
          await livekitService.setMicEnabled(false);
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // Foreground'a dönüş — yayın devam ediyordu ise yeniden başlat
        if (wasPublishingRef.current) {
          wasPublishingRef.current = false;
          await livekitService.setMicEnabled(true);
        }
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  // ─── Actions ──────────────────────────────────────────────
  const publishAudio = useCallback(async (): Promise<boolean> => {
    const success = await livekitService.publishAudio();
    setIsPublishing(success);
    return success;
  }, []);

  const unpublishAudio = useCallback(async (): Promise<void> => {
    await livekitService.unpublishAudio();
    setIsPublishing(false);
  }, []);

  const setMicEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    await livekitService.setMicEnabled(enabled);
  }, []);

  return {
    connectionState,
    isPublishing,
    error,
    publishAudio,
    unpublishAudio,
    setMicEnabled,
  };
}
