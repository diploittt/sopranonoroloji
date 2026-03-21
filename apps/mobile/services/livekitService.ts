/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — LiveKit Audio Service (Singleton)
   WebRTC ses katmanı — socket altyapısından bağımsız
   
   ⚠️  livekit-client paketi henüz yüklü DEĞİL.
   Tüm LiveKit fonksiyonları lazy-load + try-catch ile korunur.
   Paket yüklendiğinde otomatik çalışmaya başlar.
   ═══════════════════════════════════════════════════════════ */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import config from '../config';

// ─── Types ──────────────────────────────────────────────────
export type LiveKitConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface LiveKitCallbacks {
  onConnectionStateChanged?: (state: LiveKitConnectionState) => void;
  onSpeakingChanged?: (participantId: string, isSpeaking: boolean) => void;
  onError?: (error: string) => void;
  onAudioTrackSubscribed?: (participantId: string) => void;
  onAudioTrackUnsubscribed?: (participantId: string) => void;
}

// ─── Debug Logger ───────────────────────────────────────────
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
function log(...args: any[]) {
  if (IS_DEV) console.log('[LiveKitService]', ...args);
}
function warn(...args: any[]) {
  console.warn('[LiveKitService]', ...args);
}

// ─── Lazy-loaded LiveKit modülleri ──────────────────────────
let _livekitClient: any = null;
let _livekitAvailable: boolean | null = null;

function getLiveKitClient(): any {
  if (_livekitAvailable === false) return null;
  if (_livekitClient) return _livekitClient;

  try {
    _livekitClient = require('livekit-client');
    _livekitAvailable = true;
    log('livekit-client modülü yüklendi');
    return _livekitClient;
  } catch (e) {
    _livekitAvailable = false;
    warn('livekit-client modülü bulunamadı — ses odası devre dışı');
    return null;
  }
}

// ─── Service ────────────────────────────────────────────────
class LiveKitService {
  private room: any = null;
  private connectionState: LiveKitConnectionState = 'idle';
  private callbacks: LiveKitCallbacks = {};
  private localAudioTrack: any = null;
  private isMicPublished = false;

  /**
   * LiveKit odasına bağlan
   */
  async connect(roomName: string, userId: string, displayName: string): Promise<boolean> {
    const lk = getLiveKitClient();
    if (!lk) {
      warn('LiveKit kullanılamıyor — livekit-client yüklü değil');
      this.callbacks.onError?.('Sesli sohbet şu an kullanılamıyor');
      return false;
    }

    try {
      if (this.room?.state === lk.ConnectionState.Connected) {
        log('Already connected to LiveKit room');
        return true;
      }

      this.setConnectionState('connecting');

      const token = await this.fetchToken(roomName, userId);
      if (!token) {
        this.setConnectionState('error');
        return false;
      }

      this.room = new lk.Room();
      this._setupRoomListeners(lk);

      const livekitUrl = config.LIVEKIT_URL;
      log('Connecting to LiveKit:', livekitUrl, 'room:', roomName);

      await this.room.connect(livekitUrl, token, {
        autoSubscribe: true,
      });

      this.setConnectionState('connected');
      log('Connected to LiveKit room:', roomName);
      return true;
    } catch (error: any) {
      warn('Connection failed:', error.message);
      this.setConnectionState('error');
      this.callbacks.onError?.(`LiveKit bağlantı hatası: ${error.message}`);
      return false;
    }
  }

  /**
   * LiveKit odasından çık ve temizle
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isMicPublished) {
        await this.unpublishAudio();
      }

      if (this.room) {
        await this.room.disconnect();
        this.room = null;
      }

      this.localAudioTrack = null;
      this.isMicPublished = false;
      this.setConnectionState('disconnected');
      log('Disconnected from LiveKit');
    } catch (error: any) {
      warn('Disconnect error:', error.message);
      this.room = null;
      this.setConnectionState('disconnected');
    }
  }

  /**
   * Mikrofon sesini yayınla
   */
  async publishAudio(): Promise<boolean> {
    const lk = getLiveKitClient();
    if (!lk || !this.room || this.room.state !== lk.ConnectionState.Connected) {
      warn('Cannot publish audio — not connected');
      return false;
    }

    if (this.isMicPublished) {
      log('Audio already published');
      return true;
    }

    const hasPermission = await this.requestMicPermission();
    if (!hasPermission) {
      this.callbacks.onError?.('Mikrofon izni verilmedi');
      return false;
    }

    try {
      const audioTrack = await lk.createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      const publication = await this.room.localParticipant.publishTrack(audioTrack);
      this.localAudioTrack = publication;
      this.isMicPublished = true;
      log('Audio published successfully');
      return true;
    } catch (error: any) {
      warn('Publish audio failed:', error.message);
      this.callbacks.onError?.(`Ses yayını başlatılamadı: ${error.message}`);
      return false;
    }
  }

  /**
   * Mikrofon yayınını durdur
   */
  async unpublishAudio(): Promise<void> {
    if (!this.room || !this.isMicPublished) return;

    try {
      const localParticipant = this.room.localParticipant;
      for (const [, publication] of localParticipant.audioTrackPublications) {
        if (publication.track) {
          await localParticipant.unpublishTrack(publication.track);
          publication.track.stop();
        }
      }
      this.localAudioTrack = null;
      this.isMicPublished = false;
      log('Audio unpublished');
    } catch (error: any) {
      warn('Unpublish audio error:', error.message);
    }
  }

  /**
   * Mikrofon mute/unmute
   */
  async setMicEnabled(enabled: boolean): Promise<void> {
    if (!this.room || !this.isMicPublished) return;

    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      log('Mic enabled:', enabled);
    } catch (error: any) {
      warn('Set mic enabled error:', error.message);
    }
  }

  // ─── Getters ──────────────────────────────────────────────
  get isConnected(): boolean {
    const lk = getLiveKitClient();
    if (!lk) return false;
    return this.room?.state === lk.ConnectionState.Connected;
  }

  get isPublishing(): boolean {
    return this.isMicPublished;
  }

  get state(): LiveKitConnectionState {
    return this.connectionState;
  }

  // ─── Callbacks ────────────────────────────────────────────
  setCallbacks(callbacks: LiveKitCallbacks): void {
    this.callbacks = callbacks;
  }

  clearCallbacks(): void {
    this.callbacks = {};
  }

  // ─── Private ──────────────────────────────────────────────

  private setConnectionState(state: LiveKitConnectionState): void {
    this.connectionState = state;
    this.callbacks.onConnectionStateChanged?.(state);
  }

  private async fetchToken(room: string, username: string): Promise<string | null> {
    try {
      const tokenUrl = `${config.API_BASE_URL}/livekit/token?room=${encodeURIComponent(room)}&username=${encodeURIComponent(username)}`;
      log('Fetching token from:', tokenUrl);

      const response = await fetch(tokenUrl);
      log('Token response status:', response.status);
      
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        warn('Token request failed:', response.status, errText);
        throw new Error(`Token request failed: ${response.status} — ${errText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      log('Token received, length:', data.token?.length);
      return data.token;
    } catch (error: any) {
      warn('Token fetch error:', error.message);
      this.callbacks.onError?.(`Token alınamadı: ${error.message}`);
      return null;
    }
  }

  private async requestMicPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Mikrofon İzni',
          message: 'SopranoChat sesli sohbet için mikrofon erişimi gerektirir.',
          buttonPositive: 'İzin Ver',
          buttonNegative: 'Reddet',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      warn('Permission error:', error);
      return false;
    }
  }

  private _setupRoomListeners(lk: any): void {
    if (!this.room) return;

    this.room.on(lk.RoomEvent.ConnectionStateChanged, (state: any) => {
      log('Connection state:', state);
      switch (state) {
        case lk.ConnectionState.Connected:
          this.setConnectionState('connected');
          break;
        case lk.ConnectionState.Reconnecting:
          this.setConnectionState('reconnecting');
          break;
        case lk.ConnectionState.Disconnected:
          this.setConnectionState('disconnected');
          break;
      }
    });

    this.room.on(
      lk.RoomEvent.TrackSubscribed,
      (track: any, publication: any, participant: any) => {
        if (track.kind === lk.Track.Kind.Audio) {
          log('Audio track subscribed:', participant.identity);
          // ★ Ses çalmak için track'ı DOM'a ekle (web) veya otomatik çal (native)
          try {
            if (Platform.OS === 'web') {
              const audioElement = track.attach();
              audioElement.id = `lk-audio-${participant.identity}`;
              audioElement.autoplay = true;
              document.body.appendChild(audioElement);
              log('Audio element attached to DOM for:', participant.identity);
            } else {
              // Native'de livekit-client otomatik çalar — ekstra işlem gerekmez
              track.attach();
              log('Audio track attached for native:', participant.identity);
            }
          } catch (err: any) {
            warn('Audio attach error:', err.message);
          }
          this.callbacks.onAudioTrackSubscribed?.(participant.identity);
        }
      },
    );

    this.room.on(
      lk.RoomEvent.TrackUnsubscribed,
      (track: any, publication: any, participant: any) => {
        if (track.kind === lk.Track.Kind.Audio) {
          log('Audio track unsubscribed:', participant.identity);
          // ★ DOM'dan ses elementini kaldır
          try {
            const elements = track.detach();
            elements.forEach((el: HTMLElement) => el.remove());
            log('Audio element detached for:', participant.identity);
          } catch (err: any) {
            warn('Audio detach error:', err.message);
          }
          this.callbacks.onAudioTrackUnsubscribed?.(participant.identity);
        }
      },
    );

    this.room.on(lk.RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
      if (this.room) {
        for (const [, participant] of this.room.remoteParticipants) {
          const isSpeaking = speakers.some((s: any) => s.identity === participant.identity);
          this.callbacks.onSpeakingChanged?.(participant.identity, isSpeaking);
        }
        const localSpeaking = speakers.some((s: any) => s.identity === this.room?.localParticipant.identity);
        if (this.room.localParticipant.identity) {
          this.callbacks.onSpeakingChanged?.(this.room.localParticipant.identity, localSpeaking);
        }
      }
    });

    this.room.on(lk.RoomEvent.Disconnected, (reason?: any) => {
      log('Room disconnected, reason:', reason);
      this.isMicPublished = false;
      this.localAudioTrack = null;
    });

    this.room.on(lk.RoomEvent.Reconnected, () => {
      log('Reconnected to LiveKit');
      this.setConnectionState('connected');
    });
  }
}

// Singleton export
export const livekitService = new LiveKitService();
