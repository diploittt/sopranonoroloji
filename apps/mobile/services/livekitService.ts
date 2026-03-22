/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — LiveKit Audio + Video Service (Singleton)
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
  onVideoTrackSubscribed?: (participantId: string, track: any) => void;
  onVideoTrackUnsubscribed?: (participantId: string) => void;
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
  private localVideoTrack: any = null;
  private isCamPublished = false;

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
      if (this.isCamPublished) {
        await this.unpublishVideo();
      }

      if (this.room) {
        await this.room.disconnect();
        this.room = null;
      }

      this.localAudioTrack = null;
      this.isMicPublished = false;
      this.localVideoTrack = null;
      this.isCamPublished = false;
      this.setConnectionState('disconnected');
      log('Bağlantı kesildi');
    } catch (error: any) {
      warn('Bağlantı kesme hatası:', error.message);
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
      log('Mikrofon durumu:', enabled);
    } catch (error: any) {
      warn('Mikrofon durumu değiştirme hatası:', error.message);
    }
  }

  /**
   * Kamera video yayınını başlat
   */
  async publishVideo(): Promise<boolean> {
    const lk = getLiveKitClient();
    if (!lk || !this.room || this.room.state !== lk.ConnectionState.Connected) {
      warn('Video yayınlanamıyor — bağlantı yok');
      return false;
    }

    if (this.isCamPublished) {
      log('Video zaten yayında');
      return true;
    }

    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      this.callbacks.onError?.('Kamera izni verilmedi');
      return false;
    }

    try {
      const videoTrack = await lk.createLocalVideoTrack({
        facingMode: 'user',
        resolution: { width: 640, height: 480, frameRate: 24 },
      });

      const publication = await this.room.localParticipant.publishTrack(videoTrack);
      this.localVideoTrack = publication;
      this.isCamPublished = true;
      log('Video yayını başlatıldı');
      return true;
    } catch (error: any) {
      warn('Video yayını başlatılamadı:', error.message);
      this.callbacks.onError?.(`Kamera başlatılamadı: ${error.message}`);
      return false;
    }
  }

  /**
   * Kamera video yayınını durdur
   */
  async unpublishVideo(): Promise<void> {
    if (!this.room || !this.isCamPublished) return;

    try {
      const localParticipant = this.room.localParticipant;
      for (const [, publication] of localParticipant.videoTrackPublications) {
        if (publication.track) {
          await localParticipant.unpublishTrack(publication.track);
          publication.track.stop();
        }
      }
      this.localVideoTrack = null;
      this.isCamPublished = false;
      log('Video yayını durduruldu');
    } catch (error: any) {
      warn('Video yayını durdurma hatası:', error.message);
    }
  }

  /**
   * Kamera aç/kapat (mute/unmute)
   */
  async setCameraEnabled(enabled: boolean): Promise<void> {
    if (!this.room || !this.isCamPublished) return;

    try {
      await this.room.localParticipant.setCameraEnabled(enabled);
      log('Kamera durumu:', enabled);
    } catch (error: any) {
      warn('Kamera durumu değiştirme hatası:', error.message);
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

  get isVideoPublishing(): boolean {
    return this.isCamPublished;
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
      warn('Mikrofon izni hatası:', error);
      return false;
    }
  }

  private async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Kamera İzni',
          message: 'SopranoChat görüntülü sohbet için kamera erişimi gerektirir.',
          buttonPositive: 'İzin Ver',
          buttonNegative: 'Reddet',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      warn('Kamera izni hatası:', error);
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
          log('Ses track abone olundu:', participant.identity);
          try {
            if (Platform.OS === 'web') {
              const audioElement = track.attach();
              audioElement.id = `lk-audio-${participant.identity}`;
              audioElement.autoplay = true;
              document.body.appendChild(audioElement);
              log('Ses elementi DOM\'a eklendi:', participant.identity);
            } else {
              // Native'de livekit-client otomatik çalar
              track.attach();
              log('Ses track bağlandı (native):', participant.identity);
            }
          } catch (err: any) {
            warn('Ses bağlama hatası:', err.message);
          }
          this.callbacks.onAudioTrackSubscribed?.(participant.identity);
        } else if (track.kind === lk.Track.Kind.Video) {
          log('Video track abone olundu:', participant.identity);
          this.callbacks.onVideoTrackSubscribed?.(participant.identity, track);
        }
      },
    );

    this.room.on(
      lk.RoomEvent.TrackUnsubscribed,
      (track: any, publication: any, participant: any) => {
        if (track.kind === lk.Track.Kind.Audio) {
          log('Ses track aboneliği kaldırıldı:', participant.identity);
          try {
            const elements = track.detach();
            elements.forEach((el: HTMLElement) => el.remove());
            log('Ses elementi kaldırıldı:', participant.identity);
          } catch (err: any) {
            warn('Ses elementi kaldırma hatası:', err.message);
          }
          this.callbacks.onAudioTrackUnsubscribed?.(participant.identity);
        } else if (track.kind === lk.Track.Kind.Video) {
          log('Video track aboneliği kaldırıldı:', participant.identity);
          this.callbacks.onVideoTrackUnsubscribed?.(participant.identity);
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
      log('Oda bağlantısı kesildi, sebep:', reason);
      this.isMicPublished = false;
      this.localAudioTrack = null;
      this.isCamPublished = false;
      this.localVideoTrack = null;
    });

    this.room.on(lk.RoomEvent.Reconnected, () => {
      log('Reconnected to LiveKit');
      this.setConnectionState('connected');
    });
  }
}

// Singleton export
export const livekitService = new LiveKitService();
