/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Zustand Global Store
   Async actions + loading/error state per slice
   Servisler SADECE burada çağrılır, ekranlar asla direkt çağırmaz
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  Room,
  Notification,
  Customer,
  DashboardStats,
  Order,
  CreateRoomPayload,
  CreateCustomerPayload,
  Tenant,
  ApiError,
} from '../types';
import roomsService from '../services/rooms.service';
import adminService from '../services/admin.service';
import exploreService from '../services/explore.service';
import {
  realtimeService,
  type Participant,
  type ChatMessage,
  type RoomInfo,
  type RoomError,
} from '../services/realtimeService';

// ── Helper ──
const isAdminRole = (role?: string) =>
  role === 'admin' || role === 'owner' || role === 'superadmin';

// ── Store Interface ──

interface AppState {
  // ─── Auth ───
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  loginWithSocket: (token: string, user: User, tenantId?: string) => void;
  logoutWithSocket: () => void;

  // ─── Rooms ───
  publicRooms: Room[];
  roomsLoading: boolean;
  roomsError: string | null;
  currentRoom: Room | null;
  currentRoomLoading: boolean;
  currentRoomError: string | null;
  createRoomLoading: boolean;
  createRoomError: string | null;
  fetchPublicRooms: () => Promise<void>;
  fetchRoom: (id: string) => Promise<void>;
  createRoom: (payload: CreateRoomPayload) => Promise<Room | null>;
  setCurrentRoom: (room: Room | null) => void;

  // ─── Explore ───
  exploreRooms: Room[];
  exploreTenants: Tenant[];
  exploreLoading: boolean;
  exploreError: string | null;
  fetchExploreData: () => Promise<void>;

  // ─── Notifications ───
  notifications: Notification[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // ─── Admin ───
  adminStats: DashboardStats | null;
  adminStatsLoading: boolean;
  adminStatsError: string | null;
  customers: Customer[];
  customersLoading: boolean;
  customersError: string | null;
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  fetchAdminStats: () => Promise<void>;
  fetchCustomers: () => Promise<void>;
  fetchOrders: (status?: string) => Promise<void>;
  addCustomer: (payload: CreateCustomerPayload) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  toggleCustomerStatus: (id: string, status: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string, notes?: string) => Promise<void>;

  // ─── Tenant ───
  activeTenantId: string | null;
  activeTenantSlug: string | null;
  setActiveTenant: (id: string, slug: string) => void;

  // ─── Realtime (Socket) ───
  socketConnected: boolean;
  socketRoomId: string | null;
  participants: Participant[];
  messages: ChatMessage[];
  socketRooms: RoomInfo[];
  activeSpeaker: { userId: string; displayName: string; role?: string; duration?: number; startedAt?: number } | null;
  micQueue: string[];
  roomSettings: any;
  systemSettings: any;
  roomError: RoomError | null;
  connectionError: string | null;

  // ─── Chat Etkileşim ───
  typingUsers: string[];
  dmMessages: Record<string, { id: string; fromUserId: string; fromUsername: string; content: string; timestamp: number; isOwn?: boolean }[]>;
  dmConversations: any[];
  fetchDMConversations: () => Promise<void>;
  fetchDMMessages: (conversationId: string) => Promise<void>;
  emitTyping: (isTyping: boolean) => void;
  addReaction: (messageId: string, emoji: string) => void;
  sendDM: (targetUserId: string, content: string) => void;

  // ─── Gift & Jeton ───
  balance: number;
  points: number;
  giftList: { id: string; name: string; emoji: string; price: number; animationType: string; category: string }[];
  lastGiftAnimation: { senderName: string; receiverName: string; giftEmoji: string; giftName: string; totalCost: number; giftCategory: string } | null;
  fetchGiftList: () => void;
  sendGift: (receiverId: string, giftId: string, quantity: number) => void;
  clearGiftAnimation: () => void;
  lastReaction: { emoji: string; userId: string; timestamp: number } | null;
  clearReaction: () => void;

  // ─── Push Notification ───
  pushToken: string | null;
  registerPush: () => Promise<void>;

  // Socket actions
  connectSocket: (serverUrl: string, token: string, tenantId?: string) => void;
  disconnectSocket: () => void;
  joinRoom: (roomId: string, options?: { password?: string; avatar?: string; gender?: string }) => void;
  leaveRoom: () => void;
  sendChatMessage: (content: string) => void;
  takeMic: () => void;
  releaseMic: () => void;
  requestMic: () => void;
  leaveQueue: () => void;
  emitModAction: (action: string, userId: string, extra?: Record<string, any>) => void;
  sendReaction: (emoji: string) => void;
  setupSocketListeners: () => void;
  teardownSocketListeners: () => void;
}

// ── Error extractor ──
const errMsg = (e: any): string =>
  (e as ApiError)?.message || (e as Error)?.message || 'Bir hata oluştu';

// ── Store ──

export const useStore = create<AppState>((set, get) => ({
  // ═══ AUTH ═══
  token: null,
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,

  setAuth: (token, user) =>
    set({ token, user, isAuthenticated: true, isAdmin: isAdminRole(user.role) }),
  clearAuth: () =>
    set({ token: null, user: null, isAuthenticated: false, isAdmin: false }),
  setUser: (user) =>
    set({ user, isAdmin: isAdminRole(user.role) }),
  setLoading: (loading) => set({ isLoading: loading }),

  /** Login sonrası otomatik socket bağlantısı */
  loginWithSocket: async (token, user, tenantId = 'default') => {
    // Önce eski oturumu tamamen temizle
    get().teardownSocketListeners();
    realtimeService.disconnect();

    // Axios'un kullanması için AsyncStorage'e token'ı YAZDIRMAK ZORUNDAYIZ!
    try {
      if (token) {
        await AsyncStorage.setItem('auth_token', token);
      }
      if (user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
      }
      await AsyncStorage.setItem('tenant_id', tenantId);
    } catch (e) {
      console.warn('AsyncStorage kayıt hatası:', e);
    }

    set({
      token, user, isAuthenticated: true, isAdmin: isAdminRole(user.role),
      socketConnected: false, socketRoomId: null,
      participants: [], messages: [], activeSpeaker: null,
      micQueue: [], roomError: null, connectionError: null,
      activeTenantId: tenantId, // Login anında aktif tenant'ı belirle
    });
    // Yeni token ile bağlan
    const config = require('../config').default;
    realtimeService.connect(config.SOCKET_URL, token, tenantId);
    realtimeService.setUserRole(user.role || 'guest');
    get().setupSocketListeners();
  },

  /** Logout — socket disconnect + full state reset */
  logoutWithSocket: async () => {
    get().teardownSocketListeners();
    realtimeService.disconnect();

    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'tenant_id']);
    } catch (e) {
      console.warn('AsyncStorage silme hatası:', e);
    }

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      socketConnected: false,
      socketRoomId: null,
      participants: [],
      messages: [],
      socketRooms: [],
      activeSpeaker: null,
      micQueue: [],
      roomSettings: null,
      systemSettings: null,
      roomError: null,
      connectionError: null,
    });
  },

  // ═══ ROOMS ═══
  publicRooms: [],
  roomsLoading: false,
  roomsError: null,
  currentRoom: null,
  currentRoomLoading: false,
  currentRoomError: null,
  createRoomLoading: false,
  createRoomError: null,

  fetchPublicRooms: async () => {
    set({ roomsLoading: true, roomsError: null });
    try {
      const rooms = await roomsService.getPublicRooms();
      set({ publicRooms: rooms, roomsLoading: false });
    } catch (e) {
      set({ roomsError: errMsg(e), roomsLoading: false });
    }
  },

  fetchRoom: async (id: string) => {
    set({ currentRoomLoading: true, currentRoomError: null });
    try {
      const room = await roomsService.getRoom(id);
      set({ currentRoom: room, currentRoomLoading: false });
    } catch (e) {
      set({ currentRoomError: errMsg(e), currentRoomLoading: false });
    }
  },

  createRoom: async (payload: CreateRoomPayload) => {
    set({ createRoomLoading: true, createRoomError: null });
    try {
      const room = await roomsService.createRoom(payload);
      set({ createRoomLoading: false });
      return room;
    } catch (e) {
      set({ createRoomError: errMsg(e), createRoomLoading: false });
      return null;
    }
  },

  setCurrentRoom: (room) => set({ currentRoom: room }),

  // ═══ EXPLORE ═══
  exploreRooms: [],
  exploreTenants: [],
  exploreLoading: false,
  exploreError: null,

  fetchExploreData: async () => {
    set({ exploreLoading: true, exploreError: null });
    try {
      const [rooms, tenants] = await Promise.all([
        exploreService.getPublicRooms(),
        exploreService.getPublicTenants(),
      ]);
      set({ exploreRooms: rooms, exploreTenants: tenants, exploreLoading: false });
    } catch (e) {
      set({ exploreError: errMsg(e), exploreLoading: false });
    }
  },

  // ═══ NOTIFICATIONS ═══
  notifications: [],
  notificationsLoading: false,
  notificationsError: null,
  unreadCount: 0,

  fetchNotifications: async () => {
    set({ notificationsLoading: true, notificationsError: null });
    try {
      const items = await roomsService.getNotifications();
      set({
        notifications: items,
        unreadCount: items.filter((n) => !n.isRead).length,
        notificationsLoading: false,
      });
    } catch (e) {
      set({ notificationsError: errMsg(e), notificationsLoading: false });
    }
  },

  markAllRead: async () => {
    try {
      await roomsService.markNotificationsRead();
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent fail
    }
  },

  markNotificationAsRead: (id: string) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id && !n.isRead) ? 1 : 0)),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  // ═══ ADMIN ═══
  adminStats: null,
  adminStatsLoading: false,
  adminStatsError: null,
  customers: [],
  customersLoading: false,
  customersError: null,
  orders: [],
  ordersLoading: false,
  ordersError: null,

  fetchAdminStats: async () => {
    set({ adminStatsLoading: true, adminStatsError: null });
    try {
      const stats = await adminService.getStats();
      set({ adminStats: stats, adminStatsLoading: false });
    } catch (e) {
      set({ adminStatsError: errMsg(e), adminStatsLoading: false });
    }
  },

  fetchCustomers: async () => {
    set({ customersLoading: true, customersError: null });
    try {
      const customers = await adminService.getCustomers();
      set({ customers, customersLoading: false });
    } catch (e) {
      set({ customersError: errMsg(e), customersLoading: false });
    }
  },

  fetchOrders: async (status?: string) => {
    set({ ordersLoading: true, ordersError: null });
    try {
      const orders = await adminService.getOrders(status);
      set({ orders, ordersLoading: false });
    } catch (e) {
      set({ ordersError: errMsg(e), ordersLoading: false });
    }
  },

  addCustomer: async (payload: CreateCustomerPayload) => {
    try {
      const customer = await adminService.createCustomer(payload);
      set((s) => ({ customers: [customer, ...s.customers] }));
      return customer;
    } catch (e) {
      set({ customersError: errMsg(e) });
      return null;
    }
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    try {
      const updated = await adminService.updateCustomer(id, data);
      set((s) => ({
        customers: s.customers.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      }));
    } catch (e) {
      set({ customersError: errMsg(e) });
    }
  },

  toggleCustomerStatus: async (id: string, status: string) => {
    try {
      await adminService.toggleCustomerStatus(id, status);
      set((s) => ({
        customers: s.customers.map((c) =>
          c.id === id ? { ...c, status: status as Customer['status'] } : c
        ),
      }));
    } catch (e) {
      set({ customersError: errMsg(e) });
    }
  },

  deleteCustomer: async (id: string) => {
    try {
      await adminService.deleteCustomer(id);
      set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
    } catch (e) {
      set({ customersError: errMsg(e) });
    }
  },

  updateOrderStatus: async (id: string, status: string, notes?: string) => {
    try {
      const updated = await adminService.updateOrderStatus(id, status, notes);
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? { ...o, ...updated } : o)),
      }));
    } catch (e) {
      set({ ordersError: errMsg(e) });
    }
  },

  // ═══ TENANT ═══
  activeTenantId: null,
  activeTenantSlug: null,
  setActiveTenant: (id, slug) => set({ activeTenantId: id, activeTenantSlug: slug }),

  // ═══ REALTIME (SOCKET) ═══
  socketConnected: false,
  socketRoomId: null,
  participants: [],
  messages: [],
  socketRooms: [],
  activeSpeaker: null,
  micQueue: [],
  roomSettings: null,
  systemSettings: null,
  roomError: null,
  connectionError: null,

  // Chat etkileşim
  typingUsers: [],
  dmMessages: {},
  dmConversations: [],

  fetchDMConversations: async () => {
    try {
      const { data } = await require('../services/api').default.get('/dm/conversations');
      set({ dmConversations: Array.isArray(data) ? data : data?.conversations || [] });
    } catch (e) {
      // DM conversations endpoint henüz yoksa sessizce devam et
      console.log('[Store] DM conversations fetch:', e);
    }
  },

  fetchDMMessages: async (conversationId: string) => {
    try {
      const { data } = await require('../services/api').default.get(`/dm/conversations/${conversationId}/messages`);
      const messages = Array.isArray(data) ? data : data?.messages || [];
      set((s) => ({
        dmMessages: { ...s.dmMessages, [conversationId]: messages },
      }));
    } catch (e) {
      console.log('[Store] DM messages fetch:', e);
    }
  },

  // Gift & Jeton
  balance: 0,
  points: 0,
  giftList: [],
  lastGiftAnimation: null,
  lastReaction: null,

  // Push Notification
  pushToken: null,

  connectSocket: (serverUrl, token, tenantId = 'default') => {
    realtimeService.connect(serverUrl, token, tenantId);
    get().setupSocketListeners();
  },

  disconnectSocket: () => {
    get().teardownSocketListeners();
    realtimeService.disconnect();
    set({
      socketConnected: false,
      socketRoomId: null,
      participants: [],
      messages: [],
      activeSpeaker: null,
      micQueue: [],
      roomSettings: null,
      roomError: null,
      connectionError: null,
    });
  },

  joinRoom: (roomId, options) => {
    set({ participants: [], messages: [], roomError: null, roomSettings: null });
    realtimeService.joinRoom(roomId, options);
    set({ socketRoomId: roomId });
  },

  leaveRoom: () => {
    realtimeService.leaveRoom();
    set({
      socketRoomId: null,
      participants: [],
      messages: [],
      activeSpeaker: null,
      micQueue: [],
      roomSettings: null,
      roomError: null,
    });
  },

  sendChatMessage: (content) => {
    realtimeService.sendMessage(content);
  },

  takeMic: () => realtimeService.takeMic(),
  releaseMic: () => realtimeService.releaseMic(),
  requestMic: () => realtimeService.requestMic(),
  leaveQueue: () => realtimeService.leaveQueue(),
  emitModAction: (action, userId, extra) => realtimeService.emitModAction(action, userId, extra),
  sendReaction: (emoji) => {
    const roomId = get().socketRoomId;
    if (roomId) realtimeService.emit('room:reaction', { roomId, emoji });
  },

  setupSocketListeners: () => {
    // connect / disconnect
    realtimeService.on('connect', () => {
      set({ socketConnected: true, connectionError: null });
    });
    realtimeService.on('disconnect', () => {
      set({ socketConnected: false });
    });
    realtimeService.on('connect_error', (err: any) => {
      set({ connectionError: err?.message || 'Bağlantı hatası' });
    });

    // room:joined — ana veri doldurma
    realtimeService.on('room:joined', (data: any) => {
      const fixAvatars = (arr: any[]) => (arr || []).map((p: any) => ({
        ...p,
        avatar: p.avatar?.startsWith('http') ? p.avatar
          : p.avatar ? `https://sopranochat.com${p.avatar}` : undefined,
      }));
      set({
        participants: fixAvatars(data.participants),
        messages: data.messages || [],
        socketRooms: data.rooms || [],
        roomSettings: data.roomSettings || null,
        systemSettings: data.systemSettings || null,
        roomError: null,
        activeTenantId: data.tenantId || get().activeTenantId,
      });
      // ★ Kendi rolümüzü realtimeService'e bildir (client-side mod check)
      const myId = get().user?.id;
      const me = (data.participants || []).find((p: any) => p.userId === myId);
      if (me?.role) realtimeService.setUserRole(me.role);
    });

    // Katılımcı listesi güncellemesi
    realtimeService.on('room:participants', (data: any) => {
      const fixAvatars = (arr: any[]) => (arr || []).map((p: any) => ({
        ...p,
        avatar: p.avatar?.startsWith('http') ? p.avatar
          : p.avatar ? `https://sopranochat.com${p.avatar}` : undefined,
      }));
      set({ participants: fixAvatars(data.participants) });
    });

    // Yeni katılımcı
    realtimeService.on('room:participant-joined', (participant: Participant) => {
      const p = {
        ...participant,
        avatar: participant.avatar?.startsWith('http') ? participant.avatar
          : participant.avatar ? `https://sopranochat.com${participant.avatar}` : undefined,
      };
      set((s) => {
        if (s.participants.find((x) => x.userId === p.userId)) return s;
        return { participants: [...s.participants, p] };
      });
    });

    // Katılımcı ayrıldı
    realtimeService.on('room:participant-left', (data: { userId: string }) => {
      set((s) => ({
        participants: s.participants.filter((p) => p.userId !== data.userId),
      }));
    });

    // Chat mesajı
    realtimeService.on('chat:message', (message: ChatMessage) => {
      console.log('[Store] chat:message alındı:', (message as any).content || JSON.stringify(message).substring(0, 80));
      set((s) => ({ messages: [...s.messages, message] }));
    });

    // Chat temizlendi
    realtimeService.on('room:chat-cleared', () => {
      set({ messages: [] });
    });

    // Kullanıcı mesajları silindi
    realtimeService.on('room:clear-user-messages', (data: { userId: string }) => {
      set((s) => ({
        messages: s.messages.filter((m) => m.sender !== data.userId),
      }));
    });

    // Oda hatası
    realtimeService.on('room:error', (data: RoomError) => {
      set({ roomError: data, participants: [], messages: [] });
    });

    // Oda sayıları
    realtimeService.on('rooms:count-updated', (data: { roomCounts: Record<string, number> }) => {
      set((s) => ({
        socketRooms: s.socketRooms.map((r) => ({
          ...r,
          participantCount: data.roomCounts[r.slug] || 0,
        })),
      }));
    });

    // Ayar güncellemeleri
    realtimeService.on('settings:updated', (data: any) => {
      set((s) => ({ systemSettings: s.systemSettings ? { ...s.systemSettings, ...data } : data }));
    });
    realtimeService.on('room:settings-updated', (data: any) => {
      set({ roomSettings: data });
    });

    // Oturum güncellemesi
    realtimeService.on('auth:session-update', (data: { displayName?: string; role?: string; avatar?: string }) => {
      set((s) => {
        if (!s.user) return s;
        return {
          user: {
            ...s.user,
            ...(data.displayName && { displayName: data.displayName }),
            ...(data.role && { role: data.role as any }),
            ...(data.avatar && { avatar: data.avatar }),
          },
        };
      });
    });

    // Mikrofon konuşmacı değişti (eski event adı — geriye uyumluluk)
    realtimeService.on('mic:speaker-changed', (data: any) => {
      if (data?.userId) {
        set({ activeSpeaker: {
          userId: data.userId,
          displayName: data.displayName || '',
          role: data.role,
          duration: data.duration,
          startedAt: data.startedAt || Date.now(),
        }});
      } else {
        set({ activeSpeaker: null });
      }
    });

    // ★ Mikrofon alındı (sunucu bu event'i gönderiyor)
    realtimeService.on('mic:acquired', (data: any) => {
      console.log('[Store] mic:acquired:', data);
      if (data?.userId) {
        set({ activeSpeaker: {
          userId: data.userId,
          displayName: data.displayName || '',
          role: data.role,
          duration: data.duration,
          startedAt: data.startedAt || Date.now(),
        }});
      }
    });

    // ★ Mikrofon bırakıldı
    realtimeService.on('mic:released', (data: any) => {
      console.log('[Store] mic:released:', data);
      set({ activeSpeaker: null });
    });

    // ★ Room Reactions (emojiler)
    realtimeService.on('room:reaction', (data: { userId: string; emoji: string }) => {
      set({ lastReaction: { emoji: data.emoji, userId: data.userId, timestamp: Date.now() } });
    });

    // Mikrofon kuyruğu güncellendi
    realtimeService.on('mic:queue-updated', (data: any) => {
      set({ micQueue: data?.queue || [] });
    });

    // ★ Kullanıcı atıldı — odadan çıkış
    realtimeService.on('user:kicked', (data: any) => {
      const myUserId = get().user?.id;
      if (data?.userId === myUserId) {
        set({
          socketRoomId: null, participants: [], messages: [],
          activeSpeaker: null, micQueue: [],
          roomError: { message: data?.reason || 'Odadan atıldınız.' },
        });
      } else {
        // Başkası atıldı — listeden kaldır
        set((s) => ({
          participants: s.participants.filter((p) => p.userId !== data?.userId),
        }));
      }
    });

    // ★ Kullanıcı yasaklandı
    realtimeService.on('user:banned', (data: any) => {
      const myUserId = get().user?.id;
      if (data?.userId === myUserId) {
        set({
          socketRoomId: null, participants: [], messages: [],
          activeSpeaker: null, micQueue: [],
          roomError: { message: data?.reason || 'Bu odadan yasaklandınız.' },
        });
      } else {
        set((s) => ({
          participants: s.participants.filter((p) => p.userId !== data?.userId),
        }));
      }
    });

    // ★ Kullanıcı susturuldu/açıldı
    realtimeService.on('user:muted', (data: { userId: string }) => {
      set((s) => ({
        participants: s.participants.map((p) =>
          p.userId === data.userId ? { ...p, isMuted: true } : p
        ),
      }));
    });
    realtimeService.on('user:unmuted', (data: { userId: string }) => {
      set((s) => ({
        participants: s.participants.map((p) =>
          p.userId === data.userId ? { ...p, isMuted: false } : p
        ),
      }));
    });

    // ★ Yazma yasağı
    realtimeService.on('user:gagged', (data: { userId: string }) => {
      set((s) => ({
        participants: s.participants.map((p) =>
          p.userId === data.userId ? { ...p, isGagged: true } : p
        ),
      }));
    });
    realtimeService.on('user:ungagged', (data: { userId: string }) => {
      set((s) => ({
        participants: s.participants.map((p) =>
          p.userId === data.userId ? { ...p, isGagged: false } : p
        ),
      }));
    });

    // ★ Rol değişikliği
    realtimeService.on('user:role-changed', (data: { userId: string; newRole: string }) => {
      const myUserId = get().user?.id;
      // Katılımcı listesini güncelle
      set((s) => ({
        participants: s.participants.map((p) =>
          p.userId === data.userId ? { ...p, role: data.newRole } : p
        ),
      }));
      // Kendi rolüm değiştiyse user state güncelle
      if (data.userId === myUserId) {
        set((s) => ({
          user: s.user ? { ...s.user, role: data.newRole as any } : s.user,
        }));
        realtimeService.setUserRole(data.newRole);
      }
    });

    // ★ Genel katılımcı güncelleme
    realtimeService.on('room:participant-updated', (data: any) => {
      if (data?.userId) {
        set((s) => ({
          participants: s.participants.map((p) =>
            p.userId === data.userId ? { ...p, ...data } : p
          ),
        }));
      }
    });

    // ★ Chat Typing Indicator
    realtimeService.on('chat:typing', (data: { userId: string; username: string; isTyping: boolean }) => {
      set((s) => {
        const filtered = s.typingUsers.filter((u) => u !== data.username);
        return { typingUsers: data.isTyping ? [...filtered, data.username] : filtered };
      });
    });

    // ★ Message Reactions
    realtimeService.on('chat:reactionUpdate', (data: { messageId: string; emoji: string; username: string; action: string }) => {
      set((s) => ({
        messages: s.messages.map((msg) => {
          if (msg.id !== data.messageId) return msg;
          const reactions = { ...(msg.reactions || {}) } as Record<string, string[]>;
          const current = reactions[data.emoji] ? [...reactions[data.emoji]] : [];
          if (data.action === 'remove') {
            const filtered = current.filter((u) => u !== data.username);
            if (filtered.length === 0) delete reactions[data.emoji];
            else reactions[data.emoji] = filtered;
          } else {
            // add — önce diğer emojilerden kaldır (tek emoji kuralı)
            for (const key of Object.keys(reactions)) {
              const users = reactions[key].filter((u: string) => u !== data.username);
              if (users.length === 0) delete reactions[key];
              else reactions[key] = users;
            }
            if (!current.includes(data.username)) current.push(data.username);
            reactions[data.emoji] = current;
          }
          return { ...msg, reactions };
        }),
      }));
    });

    // ★ DM (Özel Mesaj)
    realtimeService.on('dm:receive', (data: { fromUserId: string; fromUsername: string; content: string; timestamp: number }) => {
      set((s) => {
        const key = data.fromUserId;
        const prev = s.dmMessages[key] || [];
        return {
          dmMessages: {
            ...s.dmMessages,
            [key]: [...prev, { id: `dm_${Date.now()}`, ...data }],
          },
        };
      });
    });

    // ★ Gift — hediye listesi response
    realtimeService.on('gift:listResponse', (data: { gifts: any[]; balance: number; points: number }) => {
      set({ giftList: data.gifts || [], balance: data.balance || 0, points: data.points || 0 });
    });

    // ★ Gift — bakiye güncelleme
    realtimeService.on('gift:balance', (data: { balance: number; points: number }) => {
      set({ balance: data.balance || 0, points: data.points || 0 });
    });

    // ★ Gift — hediye alındı (animasyon) — odanın tamamına broadcast
    realtimeService.on('gift:received', (data: any) => {
      set({ lastGiftAnimation: {
        senderName: data.senderName || '',
        receiverName: data.receiverName || '',
        giftEmoji: data.gift?.emoji || data.giftEmoji || '🎁',
        giftName: data.gift?.name || data.giftName || '',
        totalCost: data.totalCost || (data.gift?.price || 0) * (data.quantity || 1),
        giftCategory: data.gift?.category || data.giftCategory || 'basic',
      }});
    });
  },

  teardownSocketListeners: () => {
    // Socket cleanup'ı realtimeService.disconnect() ile yapılır
  },

  // ─── Chat Etkileşim Actions ───
  emitTyping: (isTyping) => {
    const roomId = get().socketRoomId;
    if (roomId) realtimeService.emit('chat:typing', { roomId, isTyping });
  },

  addReaction: (messageId, emoji) => {
    realtimeService.emit('chat:addReaction', { messageId, emoji });
  },

  sendDM: (targetUserId, content) => {
    realtimeService.emit('dm:send', { targetUserId, content });
    // Kendi mesajımızı da kaydet
    set((s) => {
      const prev = s.dmMessages[targetUserId] || [];
      return {
        dmMessages: {
          ...s.dmMessages,
          [targetUserId]: [...prev, {
            id: `dm_${Date.now()}`, fromUserId: get().user?.id || '', fromUsername: 'Ben',
            content, timestamp: Date.now(), isOwn: true,
          }],
        },
      };
    });
  },

  // ─── Gift & Jeton Actions ───
  fetchGiftList: () => {
    realtimeService.emit('gift:list');
  },

  sendGift: (receiverId, giftId, quantity) => {
    realtimeService.emit('gift:send', { receiverId, giftId, quantity });
  },

  clearGiftAnimation: () => {
    set({ lastGiftAnimation: null });
  },

  clearReaction: () => {
    set({ lastReaction: null });
  },

  // ─── Push Notification Action ───
  registerPush: async () => {
    try {
      const { pushService } = await import('../services/pushService');
      const token = await pushService.registerForPushNotifications();
      if (token) {
        set({ pushToken: token });
        pushService.savePushTokenToBackend(token);
      }
    } catch (e) {
      console.error('[Store] Push registration failed:', e);
    }
  },
}));

export default useStore;
