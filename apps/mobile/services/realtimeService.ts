// ═══════════════════════════════════════════════════════════
// SopranoChat Mobil — Merkezi Realtime Service (Production-Ready)
// Web'deki useSocket.ts mantığının platform-agnostik karşılığı
// ═══════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import useStore from '../store';

// ─── Types ──────────────────────────────────────────────────
export interface Participant {
  id?: string;
  userId: string;
  displayName: string;
  socketId: string;
  avatar?: string;
  role?: string;
  isStealth?: boolean;
  isMuted?: boolean;
  isGagged?: boolean;
  isBanned?: boolean;
  isCamBlocked?: boolean;
  status?: string;
  visibilityMode?: 'hidden' | 'visible' | 'disguised';
  platform?: 'web' | 'mobile' | 'embed';
  nameColor?: string;
  gender?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  senderName?: string;
  senderAvatar?: string;
  senderNameColor?: string;
  role?: string;
  createdAt: string;
  type?: string;
  reactions?: Record<string, string[]>;
}

export interface RoomInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  isLocked: boolean;
  isVipRoom: boolean;
  isMeetingRoom: boolean;
  participantCount: number;
  buttonColor?: string | null;
}

export interface RoomJoinedPayload {
  messages: ChatMessage[];
  participants: Participant[];
  rooms?: RoomInfo[];
  roomSettings?: any;
  systemSettings?: any;
  userPermissions?: Record<string, boolean>;
}

export interface RoomError {
  message: string;
  code?: string;
  fallbackSlug?: string;
}

export interface BanInfo {
  reason: string;
  expiresAt: string | null;
  banLevel: 'soft' | 'hard';
}

export interface JoinRoomOptions {
  password?: string;
  initialStatus?: string;
  avatar?: string;
  gender?: string;
}

// ─── Debug Logger ───────────────────────────────────────────
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

function log(...args: any[]) {
  if (IS_DEV) {
    console.log('[RealtimeService]', ...args);
  }
}

function warn(...args: any[]) {
  // Warnings always log
  console.warn('[RealtimeService]', ...args);
}

// ─── Role Hierarchy (client-side action validation) ─────────
const ROLE_HIERARCHY: Record<string, number> = {
  guest: 0, member: 1, vip: 2, operator: 3,
  moderator: 4, admin: 5, superadmin: 6, super_admin: 6,
  owner: 7, godmaster: 8,
};

const ACTION_MIN_LEVELS: Record<string, number> = {
  kick: 3, mute: 3, gag: 4, cam_block: 4, ban: 4,
  unban: 4, setRole: 5, clear_chat_global: 4,
  release_mic: 3, take_mic: 3,
};

function canPerformAction(actorRole: string, action: string, targetRole?: string): boolean {
  const actorLevel = ROLE_HIERARCHY[actorRole?.toLowerCase()] ?? 0;
  const minLevel = ACTION_MIN_LEVELS[action];
  if (minLevel === undefined) return true; // Bilinmeyen aksiyon — backend kontrol eder
  if (actorLevel < minLevel) return false;
  if (targetRole) {
    const targetLevel = ROLE_HIERARCHY[targetRole.toLowerCase()] ?? 0;
    if (actorLevel <= targetLevel) return false; // Eşit veya üst role aksiyon yapılamaz
  }
  return true;
}

// ─── Event Handler Types ────────────────────────────────────
type EventHandler = (...args: any[]) => void;

// ─── Connection State ───────────────────────────────────────
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ─── Service ────────────────────────────────────────────────
class RealtimeService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private currentToken: string | null = null;
  private currentServerUrl: string | null = null;
  private currentTenantId: string | null = null;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private reconnectAttempts = 0;
  private connectionState: ConnectionState = 'disconnected';

  // Join options — reconnect sonrası restore için
  private lastJoinOptions: JoinRoomOptions | undefined;
  private userRole: string = 'guest';

  /**
   * Socket.IO sunucusuna bağlan
   */
  connect(serverUrl: string, token: string, tenantId: string = 'default'): void {
    if (this.socket?.connected) {
      log('Already connected, skipping');
      return;
    }

    // Bağlantı bilgilerini sakla (reconnect için)
    this.currentToken = token;
    this.currentServerUrl = serverUrl;
    this.currentTenantId = tenantId;

    // Mevcut socket'i temizle
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.connectionState = 'connecting';

    this.socket = io(serverUrl, {
      auth: {
        token,
        platform: 'mobile',
      },
      query: {
        tenantId,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 10000,
      forceNew: true,
    });

    this._setupInternalListeners();
    log('Connecting to', serverUrl, '(tenant:', tenantId + ')');
  }

  /**
   * Bağlantıyı kes ve tüm state'i temizle
   */
  disconnect(): void {
    if (this.currentRoomId && this.socket?.connected) {
      this.socket.emit('room:leave', { roomId: this.currentRoomId });
    }
    this.currentRoomId = null;
    this.lastJoinOptions = undefined;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.reconnectAttempts = 0;
    this.connectionState = 'disconnected';
    this.eventHandlers.clear();
    log('Disconnected and cleaned up');
  }

  /**
   * Odaya katıl
   */
  joinRoom(roomId: string, options?: JoinRoomOptions): void {
    if (!this.socket?.connected) {
      warn('Cannot join room — not connected');
      return;
    }

    // Önce mevcut odadan çık
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      this.leaveRoom();
    }

    // Reconnect sonrası restore için sakla
    this.lastJoinOptions = options;

    const payload: any = { roomId };
    if (options?.password) payload.password = options.password;
    if (options?.initialStatus) payload.initialStatus = options.initialStatus;
    if (options?.avatar) payload.avatar = options.avatar;
    if (options?.gender) payload.gender = options.gender;

    this.currentRoomId = roomId;
    this.socket.emit('room:join', payload);
    log('Joining room:', roomId);
  }

  /**
   * Odadan ayrıl
   */
  leaveRoom(): void {
    if (!this.socket?.connected || !this.currentRoomId) return;
    this.socket.emit('room:leave', { roomId: this.currentRoomId });
    log('Left room:', this.currentRoomId);
    this.currentRoomId = null;
    this.lastJoinOptions = undefined;
  }

  // ─── Chat ─────────────────────────────────────────────────
  sendMessage(content: string): void {
    if (!this.socket?.connected || !this.currentRoomId) return;
    this.socket.emit('chat:send', { roomId: this.currentRoomId, content });
  }

  sendTyping(): void {
    if (!this.socket?.connected || !this.currentRoomId) return;
    this.socket.emit('chat:typing', { roomId: this.currentRoomId });
  }

  // ─── Mic ──────────────────────────────────────────────────
  takeMic(): void {
    if (!this.socket?.connected || !this.currentRoomId) {
      console.warn('[RT] takeMic BAŞARISIZ — socket:', this.socket?.connected, 'roomId:', this.currentRoomId);
      return;
    }
    const userId = useStore.getState().user?.id || useStore.getState().user?.email || '';
    console.log('[RT] takeMic emit — roomId:', this.currentRoomId, 'userId:', userId);
    this.socket.emit('mic:take', { roomId: this.currentRoomId, userId });
  }

  releaseMic(): void {
    if (!this.socket?.connected || !this.currentRoomId) {
      console.warn('[RT] releaseMic BAŞARISIZ — socket:', this.socket?.connected, 'roomId:', this.currentRoomId);
      return;
    }
    const userId = useStore.getState().user?.id || useStore.getState().user?.email || '';
    this.socket.emit('mic:release', { roomId: this.currentRoomId, userId });
  }

  requestMic(): void {
    if (!this.socket?.connected || !this.currentRoomId) {
      console.warn('[RT] requestMic BAŞARISIZ — socket:', this.socket?.connected, 'roomId:', this.currentRoomId);
      return;
    }
    const userId = useStore.getState().user?.id || useStore.getState().user?.email || '';
    console.log('[RT] requestMic emit — roomId:', this.currentRoomId, 'userId:', userId);
    this.socket.emit('mic:request', { roomId: this.currentRoomId, userId });
  }

  leaveQueue(): void {
    if (!this.socket?.connected || !this.currentRoomId) {
      console.warn('[RT] leaveQueue BAŞARISIZ — socket:', this.socket?.connected, 'roomId:', this.currentRoomId);
      return;
    }
    const userId = useStore.getState().user?.id || useStore.getState().user?.email || '';
    this.socket.emit('mic:leave-queue', { roomId: this.currentRoomId, userId });
  }

  // ─── Status ───────────────────────────────────────────────
  changeStatus(status: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('status:change', { status });
  }

  // ─── Moderation (role-checked) ────────────────────────────
  emitModAction(action: string, userId: string, extra?: Record<string, any>): void {
    if (!this.socket?.connected || !this.currentRoomId) return;

    // Client-side role check — yetkisiz aksiyonu engelle
    if (!canPerformAction(this.userRole, action)) {
      warn(`Action blocked: ${action} — insufficient role (${this.userRole})`);
      return;
    }

    this.socket.emit('admin:userAction', {
      action,
      userId,
      roomId: this.currentRoomId,
      ...extra,
    });
    log('Mod action:', action, '→', userId);
  }

  // ─── Profile ──────────────────────────────────────────────
  updateProfile(data: { displayName?: string; avatar?: string; nameColor?: string }): void {
    if (!this.socket?.connected) return;
    this.socket.emit('user:profileUpdate', data);
  }

  // ─── Event Management ─────────────────────────────────────
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  /** Genel emit — store'dan doğrudan socket event göndermek için */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      warn('Cannot emit — not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  // ─── Getters ──────────────────────────────────────────────
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get roomId(): string | null {
    return this.currentRoomId;
  }

  get state(): ConnectionState {
    return this.connectionState;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  /** Kullanıcı rolünü güncelle (store'dan çağrılır) */
  setUserRole(role: string): void {
    this.userRole = role;
  }

  // ─── Internal ─────────────────────────────────────────────
  private _setupInternalListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      log('Connected, socketId:', this.socket?.id);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;

      // ★ Reconnect sonrası otomatik room rejoin
      if (this.currentRoomId) {
        log('Reconnect → rejoining room:', this.currentRoomId);
        const payload: any = { roomId: this.currentRoomId };
        if (this.lastJoinOptions) {
          if (this.lastJoinOptions.avatar) payload.avatar = this.lastJoinOptions.avatar;
          if (this.lastJoinOptions.gender) payload.gender = this.lastJoinOptions.gender;
        }
        this.socket?.emit('room:join', payload);
      }
    });

    this.socket.on('disconnect', (reason) => {
      log('Disconnected:', reason);
      this.connectionState = reason === 'io client disconnect' ? 'disconnected' : 'reconnecting';
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      this.connectionState = 'reconnecting';
      log(`Reconnect attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      this.connectionState = 'disconnected';
      warn('Reconnect failed after max attempts');
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      warn('Connection error:', error.message, `(attempt ${this.reconnectAttempts})`);
    });

    // Re-bind all registered event handlers to new socket
    for (const [event, handlers] of this.eventHandlers) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
