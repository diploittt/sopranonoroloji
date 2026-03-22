import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BanDuration, BanType } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { ChatService } from './chat.service';
import { RoomService } from '../room/room.service';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { FriendService } from '../friend/friend.service';
import { PushService } from '../push/push.service';
import { RedisService } from '../redis/redis.service';
import { AppLoggerService } from '../common/logger.service';

/**
 * In-memory participant for real-time presence.
 * DB-based session tracking (SessionService) is deferred to Phase 5.
 */
interface InMemoryParticipant {
  userId: string;
  displayName: string;
  avatar: string;
  role: string;
  socketId: string;
  roomId: string;   // Tenant-scoped Socket.IO room ID (tenantId:slug)
  roomSlug: string;  // Raw room slug (for DB queries and frontend)
  tenantId: string;
  isStealth: boolean;
  status: string; // 'online' | 'busy' | 'away' | 'brb' | 'phone' | 'stealth'
  isMuted?: boolean;
  isGagged?: boolean;
  isCamBlocked?: boolean;
  isBanned?: boolean;
  guestId?: string; // Explicitly store guest ID if available
  visibilityMode?: 'hidden' | 'visible' | 'disguised'; // GodMaster only
  disguisedName?: string; // Display name when in disguised mode
  nameColor?: string;
  gender?: string;
  godmasterIcon?: string;
  permissions?: Record<string, boolean>; // Bireysel kullanıcı yetkileri (admin panelinden atanır)
  platform?: 'web' | 'mobile' | 'embed'; // Bağlanan cihaz platformu
}

// ─── Role Hierarchy (shared 0–7 scale, matches frontend roomPermissions.ts) ─
const ROLE_HIERARCHY: Record<string, number> = {
  guest: 0,
  member: 1,
  vip: 2,
  operator: 3,
  moderator: 4,
  admin: 5,
  super_admin: 6,
  superadmin: 6,  // alias
  owner: 7,
  godmaster: 8,
};

/** Create tenant-scoped Socket.IO room ID to isolate tenants */
function scopeRoomId(tenantId: string, roomSlug: string): string {
  return `${tenantId}:${roomSlug}`;
}
const getRoleLevel = (role: string) => ROLE_HIERARCHY[role?.toLowerCase()] ?? 0;

// Action-level minimum role requirements (mirrors frontend ALL_PERMISSIONS)
const ACTION_MIN_LEVELS: Record<string, number> = {
  kick: 3,              // operator+
  hard_kick: 6,         // super_admin+
  mute: 3,              // operator+
  gag: 4,               // moderator+
  cam_block: 4,         // moderator+
  exit_browser: 6,      // super_admin+
  release_mic: 3,       // operator+
  take_mic: 3,          // operator+
  ban: 4,               // moderator+ (duration caps checked separately)
  unban: 4,             // moderator+
  setRole: 5,           // admin+
  clear_chat_global: 4, // moderator+
  clear_user_messages: 4, // moderator+
  stop_messages_global: 4, // moderator+
  move_to_meeting: 3,   // operator+
  nudge: 1,             // member+ (ekran titretme)
};

// ─── Aksiyon → bireysel yetki anahtarı eşlemesi ─────────────────
// Admin panelinden atanan bireysel yetkiler bu eşleme ile
// ACTION_MIN_LEVELS rol seviyesi kontrolünü bypass eder.
const ACTION_TO_USER_PERM: Record<string, string> = {
  kick: 'mod.kick',
  hard_kick: 'mod.kick',
  mute: 'mod.mute',
  gag: 'mod.gag',
  cam_block: 'mod.cam_block',
  ban: 'mod.ban_permanent',
  unban: 'mod.ban_remove',
  clear_chat_global: 'room.freeze_chat_global',
  clear_user_messages: 'mod.clear_text',
  stop_messages_global: 'room.freeze_chat_global',
  move_to_meeting: 'mod.move_to_meeting',
  nudge: 'mod.nudge',
  release_mic: 'mod.give_mic',
  take_mic: 'mod.take_mic',
};
const isHigherRole = (actorRole: string, targetRole: string) =>
  getRoleLevel(actorRole) > getRoleLevel(targetRole);

// ─── Convenience consts ─────────────────────────────────────
const VIP_LEVEL = ROLE_HIERARCHY['vip'];       // 2
const MEMBER_LEVEL = ROLE_HIERARCHY['member']; // 1

// ─── Mic Duration Config ────────────────────────────────────
const MIC_DURATION_GUEST = 180_000; // 3 minutes (fallback)
const MIC_DURATION_MEMBER = 300_000; // 5 minutes (fallback)

interface SpeakerState {
  socketId: string;
  userId: string;
  displayName: string;
  role: string;
  startedAt: number;
  duration: number; // ms
  timer: ReturnType<typeof setTimeout> | null; // null = unlimited
}

/** In-memory state for an active duel (Eristik Düello Arenası) */
interface DuelState {
  id: string;
  roomId: string;          // scoped room id
  tenantId: string;
  challengerId: string;
  challengerName: string;
  challengerAvatar: string;
  challengerSocketId: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar: string;
  opponentSocketId: string;
  startedAt: number;
  duration: number;        // ms (default 180000 = 3 min)
  timer?: ReturnType<typeof setTimeout>;
  tickInterval?: ReturnType<typeof setInterval>;
  // Reaksiyon sayaçları: { challengerId: {fallacy,logical,derailed}, opponentId: {…} }
  reactions: Record<string, { fallacy: number; logical: number; derailed: number }>;
  // Oy kutusu: voterId → candidateId
  votes: Map<string, string>;
  status: 'pending' | 'active' | 'voting' | 'finished';
}

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: restrict in production
  },
  namespace: '/',
  maxHttpBufferSize: 5 * 1024 * 1024, // 5MB — GIF data URI avatarları için
  pingInterval: 10000,  // 10sn — ölü bağlantıları hızlı tespit et
  pingTimeout: 5000,    // 5sn — yanıt gelmezse disconnect tetikle
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  /** In-memory participant store: socketId -> participant */

  private zombieSweepInterval: NodeJS.Timeout | null = null;
  private participants = new Map<string, InMemoryParticipant>();

  /** Active speaker per room: roomId -> SpeakerState */
  private roomSpeakers = new Map<string, SpeakerState>();
  // GodMaster visibility persistence — userId → last visibilityMode
  private godmasterVisibility = new Map<string, 'hidden' | 'visible' | 'disguised'>();

  /** Chat Lock state: roomId */
  private roomChatLocks = new Set<string>();

  /** Microphone Queue: roomId -> userId[] */
  private micQueues = new Map<string, string[]>();

  /** Debounce timers for broadcastParticipants per room */
  private broadcastDebounce = new Map<string, NodeJS.Timeout>();

  /** Moderation flags: roomId -> userId -> flags (persists across reconnects) */
  private roomModerations = new Map<string, Map<string, { isMuted?: boolean; isGagged?: boolean; isCamBlocked?: boolean }>>();

  /** Active duels: roomId -> DuelState (one duel per room at a time) */
  private activeDuels = new Map<string, DuelState>();

  /** Active YouTube TV URLs: roomId -> { url, setBy, setByLevel, setByRole } */
  private roomYoutubeUrls = new Map<string, { url: string; setBy: string; setByLevel: number; setByRole: string }>();

  /** ★ In-memory chat messages per room — DB yerine bellekte tutulur.
   *  Herkes odadan çıkınca 5dk sonra otomatik temizlenir. Oda değişiminde korunur. */
  private roomMessages = new Map<string, any[]>();
  private readonly MAX_ROOM_MESSAGES = 100; // Oda başına max mesaj
  /** Geciktirilmiş mesaj temizleme timer'ları: roomId -> timeout */
  private roomMessageCleanupTimers = new Map<string, NodeJS.Timeout>();
  /** ★ Odada daha önce mesaj görmüş kullanıcılar: roomId -> Set<userId>
   *  Yeni katılan = boş chat, geri dönen = mesajları görür */
  private roomUserSeen = new Map<string, Set<string>>();

  /** Duel reaction cooldowns: "duelId:userId" -> timestamp */
  private _duelReactionCooldowns = new Map<string, number>();

  /** Room entry bonus cooldowns: userId -> last bonus timestamp (15-min cooldown) */
  private roomEntryBonusCooldowns = new Map<string, number>();

  /** Helper: get or create moderation entry */
  private getModerationFlags(roomId: string, userId: string) {
    if (!this.roomModerations.has(roomId)) {
      this.roomModerations.set(roomId, new Map());
    }
    const roomMap = this.roomModerations.get(roomId)!;
    if (!roomMap.has(userId)) {
      roomMap.set(userId, {});
    }
    return roomMap.get(userId)!;
  }

  /** ★ Geciktirilmiş mesaj temizleme — oda boşaldığında 5dk bekle, biri gelmezse sil */
  private scheduleRoomMessageCleanup(roomId: string, roomSlug: string) {
    // Mevcut timer varsa iptal et (reset)
    this.cancelRoomMessageCleanup(roomId);
    const timer = setTimeout(() => {
      // 5dk sonra hâlâ boşsa temizle
      const stillEmpty = !Array.from(this.participants.values()).some(p => p.roomId === roomId);
      if (stillEmpty) {
        this.roomMessages.delete(roomId);
        this.roomUserSeen.delete(roomId); // Kullanıcı takibini de temizle
        this.logger.log(`[ROOM CLEANUP] Messages cleared for empty room ${roomSlug} (5min TTL expired)`);
      }
      this.roomMessageCleanupTimers.delete(roomId);
    }, 5 * 60 * 1000); // 5 dakika
    this.roomMessageCleanupTimers.set(roomId, timer);
    this.logger.log(`[ROOM CLEANUP] Scheduled 5min cleanup for room ${roomSlug}`);
  }

  /** ★ Biri odaya katıldığında temizleme timer'ını iptal et */
  private cancelRoomMessageCleanup(roomId: string) {
    const existingTimer = this.roomMessageCleanupTimers.get(roomId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.roomMessageCleanupTimers.delete(roomId);
    }
  }

  /** Helper: set a moderation flag */
  private setModerationFlag(roomId: string, userId: string, flag: string, value: boolean) {
    const flags = this.getModerationFlags(roomId, userId);
    (flags as any)[flag] = value;
    // Redis'e de yaz
    this.redis.setModFlags(roomId, userId, flags).catch(() => {});
  }

  // ═══════════ REDIS SYNC HELPERS ═══════════
  // Hibrit yaklaşım: in-memory (hız) + Redis (cluster sync + kalıcılık)

  /** Participant'ı Redis'e senkronize et */
  private syncParticipantToRedis(socketId: string, p: InMemoryParticipant) {
    // roomId ve socketId verileri ile Redis'e yaz
    this.redis.setParticipant(p.roomId, socketId, {
      userId: p.userId, displayName: p.displayName, avatar: p.avatar,
      role: p.role, socketId: p.socketId, roomId: p.roomId,
      roomSlug: p.roomSlug, tenantId: p.tenantId, status: p.status,
      isMuted: p.isMuted, isGagged: p.isGagged, gender: p.gender,
      platform: p.platform,
    }).catch(() => {});
    this.redis.setSocketRoom(socketId, p.roomId).catch(() => {});
  }

  /** Participant'ı Redis'ten sil */
  private removeParticipantFromRedis(socketId: string, roomId: string) {
    this.redis.removeParticipant(roomId, socketId).catch(() => {});
    this.redis.removeSocketRoom(socketId).catch(() => {});
  }

  /** Mic queue'yu Redis'e senkronize et */
  private syncMicQueueToRedis(roomId: string, queue: string[]) {
    this.redis.clearMicQueue(roomId).then(() => {
      for (const userId of queue) {
        this.redis.addToMicQueue(roomId, userId).catch(() => {});
      }
    }).catch(() => {});
  }

  /** Active speaker'ı Redis'e senkronize et */
  private syncSpeakerToRedis(roomId: string, speaker: SpeakerState | null) {
    if (speaker) {
      this.redis.setActiveSpeaker(roomId, {
        socketId: speaker.socketId, userId: speaker.userId,
        displayName: speaker.displayName, role: speaker.role,
        startedAt: speaker.startedAt, duration: speaker.duration,
      }).catch(() => {});
    } else {
      this.redis.clearActiveSpeaker(roomId).catch(() => {});
    }
  }

  /** Chat mesajını Redis'e kaydet (son 100) */
  private syncChatMessageToRedis(roomId: string, message: any) {
    this.redis.addChatMessage(roomId, message).catch(() => {});
  }

  /** Socket event rate limit kontrolü */
  private async checkSocketRateLimit(userId: string, event: string, max: number, windowSec: number): Promise<boolean> {
    try {
      return await this.redis.checkSocketRate(userId, event, max, windowSec);
    } catch {
      return true; // Redis down ise allow (graceful fallback)
    }
  }

  /**
   * Broadcast updated room participant counts to all connected clients
   * of a given tenant. Called after join/leave events.
   */
  private broadcastRoomCounts(tenantId: string) {
    // Compute per-room counts from in-memory participants (use slug for frontend)
    const roomCounts: Record<string, number> = {};
    this.participants.forEach(p => {
      if (p.tenantId === tenantId) {
        roomCounts[p.roomSlug] = (roomCounts[p.roomSlug] || 0) + 1;
      }
    });

    // Emit to all sockets belonging to this tenant
    this.participants.forEach(p => {
      if (p.tenantId === tenantId) {
        this.server.to(p.socketId).emit('rooms:count-updated', { roomCounts });
      }
    });
  }

  /** Temporary role assignments: `userId:roomId` -> { originalRole, newRole, roomId, timer, expiresAt } */
  private tempRoles = new Map<string, { originalRole: string; newRole: string; roomId: string; timer: ReturnType<typeof setTimeout>; expiresAt: Date }>();

  private TEMP_ROLE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /** Tenant settings cache: tenantId -> SystemSettings */
  private tenantSettings = new Map<string, any>();

  /** Anti-flood tracker: socketId -> timestamp[] */
  private floodTracker = new Map<string, number[]>();

  /** IP connection tracker: ip -> timestamp[] (for adminAutoHdLock) */
  private ipConnectionTracker = new Map<string, number[]>();
  /** Automatically HD-locked IPs: ip -> unlockTimestamp */
  private ipAutoLocked = new Map<string, number>();

  /** VM detection patterns in User-Agent */
  private VM_UA_PATTERNS = [
    /vmware/i, /virtualbox/i, /hyper-?v/i, /qemu/i,
    /parallels/i, /xen/i, /bochs/i, /kvm/i,
  ];

  /** Load (or return cached) tenant settings */
  // ★ TTL Cache: tenant settings 5 dakika cache'lenir
  private tenantSettingsExpiry = new Map<string, number>();
  private static SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 dakika

  private async loadTenantSettings(tenantId: string): Promise<any> {
    try {
      let resolvedTenantId = tenantId;

      // 'default' slug string gelirse gerçek UUID'yi bul
      if (tenantId === 'default') {
        const tenant = await this.adminService.findDefaultTenant();
        if (tenant) {
          resolvedTenantId = tenant.id;
        }
      }

      // ★ Cache hit — TTL dolmamışsa DB'ye gitme
      const cached = this.tenantSettings.get(resolvedTenantId);
      const expiry = this.tenantSettingsExpiry.get(resolvedTenantId) || 0;
      if (cached && Date.now() < expiry) {
        return cached;
      }

      const settings = await this.adminService.getSettings(resolvedTenantId);
      this.tenantSettings.set(resolvedTenantId, settings);
      this.tenantSettingsExpiry.set(resolvedTenantId, Date.now() + ChatGateway.SETTINGS_CACHE_TTL);
      return settings;
    } catch (e) {
      this.logger.warn(`Could not load tenant settings: ${e.message}`);
      return this.tenantSettings.get(tenantId) || null;
    }
  }



  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private roomService: RoomService,
    @Inject(forwardRef(() => AdminService))
    private adminService: AdminService,
    private jwtService: JwtService,
    private moduleRef: ModuleRef,
    private prisma: PrismaService,
    private friendService: FriendService,
    private pushService: PushService,
    private redis: RedisService,
  ) {
    // ★ Production logger referansı (opsiyonel — AppLoggerService NestJS app logger olarak set edildi)
    // Event logging için doğrudan this.logger kullanılır.
    // ★ STARTUP CLEANUP — Backend restart'ta tüm aktif oturumları temizle
    // (hiçbir socket bağlı değil, eski kayıtlar hayalet kullanıcı oluşturur)
    setTimeout(async () => {
      try {
        const result = await this.prisma.participant.updateMany({
          where: { isActive: true },
          data: { isActive: false, leftAt: new Date() },
        });
        if (result.count > 0) {
          this.logger.warn(`[STARTUP CLEANUP] ${result.count} stale participant(s) marked inactive`);
        }
        // Tüm kullanıcıları offline yap
        await this.prisma.user.updateMany({
          where: { isOnline: true },
          data: { isOnline: false },
        });
      } catch (e) {
        this.logger.warn(`[STARTUP CLEANUP] Failed: ${e.message}`);
      }
      // Gift seed
      this.seedDefaultGifts().catch(e => console.error('[GIFT] Seed error:', e));
    }, 3000);

    // ★ PERIODIC ZOMBIE SWEEP — Her 60sn'de bir bağlı olmayan socket'leri temizle
    this.zombieSweepInterval = setInterval(() => {
      const zombieIds: string[] = [];
      const now = Date.now();
      for (const [socketId, participant] of this.participants.entries()) {
        const socket = this.server?.sockets?.sockets?.get(socketId);
        if (!socket || !socket.connected) {
          // ★ GRACE PERIOD: Yeni katılmış kullanıcıları korumak için 30sn bekle
          // Socket.IO bazen geçici durumlar sırasında socket'i bulamayabiliyor
          const joinedAt = (participant as any)._joinedAt || 0;
          if (now - joinedAt < 30000) {
            continue; // Henüz çok yeni — silme
          }
          // ★ ADAPTER KONTROLÜ: Socket adapter room'unda hâlâ kayıtlı mı?
          const adapterRoom = this.server?.sockets?.adapter?.rooms?.get(participant.roomId);
          if (adapterRoom?.has(socketId)) {
            continue; // Adapter'da hâlâ var — muhtemelen aktif, silme
          }
          zombieIds.push(socketId);
        }
      }
      if (zombieIds.length > 0) {
        this.logger.warn(`[🧹 ZOMBIE SWEEP] Found ${zombieIds.length} stale participant(s), cleaning up...`);
        const affectedRooms = new Set<string>();
        for (const zombieId of zombieIds) {
          const p = this.participants.get(zombieId);
          if (p) {
            affectedRooms.add(p.roomId);
            this.server?.to(p.roomId).emit('room:participant-left', {
              userId: p.userId,
              socketId: zombieId,
            });
            this.logger.warn(`[🧹 ZOMBIE SWEEP] Removed: ${p.displayName} (socket ${zombieId}) from ${p.roomSlug}`);
          }
          this.participants.delete(zombieId);
          // ★ REDIS SYNC — Zombie cleanup
          if (p) this.removeParticipantFromRedis(zombieId, p.roomId);
        }
        // Etkilenen odaların katılımcı listesini güncelle
        for (const roomId of affectedRooms) {
          this._doBroadcastParticipants(roomId);
        }
      }
    }, 60000); // 60 saniye
  }

  // ═══════════ Gift Seed ═══════════
  private async seedDefaultGifts(attempt = 1) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5s between retries
    try {
      // Get all tenants
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        const existing = await this.prisma.gift.count({ where: { tenantId: tenant.id } });
        if (existing > 0) continue;

        const gifts = [
          { name: 'Kalp', emoji: '❤️', price: 5, animationType: 'hearts', category: 'basic', sortOrder: 1 },
          { name: 'Alkış', emoji: '👏', price: 10, animationType: 'applause', category: 'basic', sortOrder: 2 },
          { name: 'Gül', emoji: '🌹', price: 15, animationType: 'roses', category: 'basic', sortOrder: 3 },
          { name: 'Yıldız', emoji: '⭐', price: 30, animationType: 'stars', category: 'basic', sortOrder: 4 },
          { name: 'Müzik', emoji: '🎵', price: 40, animationType: 'music', category: 'premium', sortOrder: 5 },
          { name: 'Kelebek', emoji: '🦋', price: 50, animationType: 'butterfly', category: 'premium', sortOrder: 6 },
          { name: 'Taç', emoji: '👑', price: 100, animationType: 'crown', category: 'premium', sortOrder: 7 },
          { name: 'Araba', emoji: '🚗', price: 200, animationType: 'car', category: 'premium', sortOrder: 8 },
          { name: 'Elmas', emoji: '💎', price: 500, animationType: 'diamond', category: 'legendary', sortOrder: 9 },
          { name: 'Kale', emoji: '🏰', price: 1000, animationType: 'castle', category: 'legendary', sortOrder: 10 },
        ];

        await this.prisma.gift.createMany({
          data: gifts.map(g => ({ ...g, tenantId: tenant.id })),
        });
        this.logger.log(`🎁 Seeded ${gifts.length} gifts for tenant ${tenant.id}`);
      }
    } catch (err: any) {
      if (attempt < MAX_RETRIES && (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED'))) {
        this.logger.warn(`[GIFT] DB not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.seedDefaultGifts(attempt + 1);
      }
      throw err;
    }
  }

  // ═══════════ Push Notification Register ═══════════
  @SubscribeMessage('push:register')
  async handlePushRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { expoPushToken: string },
  ) {
    const user = client.data?.user;
    if (!user?.sub || !data?.expoPushToken) return;
    try {
      await this.prisma.user.update({
        where: { id: user.sub },
        data: { expoPushToken: data.expoPushToken },
      });
      this.logger.log(`[PUSH:REGISTER] Token saved for ${user.sub}`);
    } catch (e) {
      this.logger.error(`[PUSH:REGISTER] Error: ${e}`);
    }
  }

  // ═══════════ Gift: List Available Gifts ═══════════
  @SubscribeMessage('gift:list')
  async handleGiftList(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;

    const gifts = await this.prisma.gift.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { balance: true, points: true },
    });

    client.emit('gift:listResponse', {
      gifts,
      balance: Number(dbUser?.balance || 0),
      points: dbUser?.points || 0,
    });
  }

  // ═══════════ Gift: Send Gift ═══════════
  @SubscribeMessage('gift:send')
  async handleGiftSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; giftId: string; quantity?: number },
  ) {
    try {
      const user = client.data.user;
      if (!user) return { error: 'Giriş yapmalısınız.' };

      // ★ REDIS RATE LIMIT — gift:send (max 10/60sn)
      const giftAllowed = await this.checkSocketRateLimit(user.sub, 'gift:send', 10, 60);
      if (!giftAllowed) {
        return { error: 'Çok hızlı hediye gönderiyorsunuz. Lütfen biraz bekleyin.' };
      }

      const sender = this.participants.get(client.id);
      if (!sender) return { error: 'Oturumunuz bulunamadı.' };

      this.logger.log(`[GIFT:SEND] ${sender.displayName} → receiverId=${data.receiverId}, giftId=${data.giftId}`);

      const quantity = data.quantity || 1;

      // Get gift info — UUID ile ara, bulunamazsa name/emoji ile dene
      let gift = await this.prisma.gift.findUnique({ where: { id: data.giftId } });
      if (!gift) {
        // Client fallback hediye ID'si göndermiş olabilir ('rose', 'coffee' vb.)
        // Name veya emoji ile eşleştir
        const fallbackMap: Record<string, { name: string; emoji: string; price: number; animationType: string; category: string }> = {
          rose: { name: 'Gül', emoji: '🌹', price: 5, animationType: 'float', category: 'basic' },
          coffee: { name: 'Kahve', emoji: '☕', price: 5, animationType: 'float', category: 'basic' },
          heart: { name: 'Kalp', emoji: '❤️', price: 10, animationType: 'pulse', category: 'basic' },
          kiss: { name: 'Öpücük', emoji: '💋', price: 10, animationType: 'float', category: 'basic' },
          sunflower: { name: 'Ay Çiçeği', emoji: '🌻', price: 15, animationType: 'float', category: 'basic' },
          bear: { name: 'Ayıcık', emoji: '🧸', price: 15, animationType: 'float', category: 'basic' },
          candy: { name: 'Şeker', emoji: '🍬', price: 18, animationType: 'spin', category: 'basic' },
          icecream: { name: 'Dondurma', emoji: '🍦', price: 20, animationType: 'float', category: 'basic' },
          cake: { name: 'Pasta', emoji: '🎂', price: 25, animationType: 'float', category: 'basic' },
          balloon: { name: 'Balon', emoji: '🎈', price: 25, animationType: 'fly', category: 'basic' },
          rainbow: { name: 'Gökkuşağı', emoji: '🌈', price: 30, animationType: 'glow', category: 'basic' },
          perfume: { name: 'Parfüm', emoji: '🧴', price: 35, animationType: 'float', category: 'basic' },
          diamond: { name: 'Elmas', emoji: '💎', price: 50, animationType: 'spin', category: 'premium' },
          guitar: { name: 'Gitar', emoji: '🎸', price: 60, animationType: 'pulse', category: 'premium' },
          music: { name: 'Müzik Notu', emoji: '🎵', price: 65, animationType: 'float', category: 'premium' },
          bouquet: { name: 'Buket', emoji: '💐', price: 75, animationType: 'glow', category: 'premium' },
          fire: { name: 'Ateş', emoji: '🔥', price: 80, animationType: 'pulse', category: 'premium' },
          champagne: { name: 'Şampanya', emoji: '🍾', price: 90, animationType: 'fly', category: 'premium' },
          ring: { name: 'Yüzük', emoji: '💍', price: 100, animationType: 'spin', category: 'premium' },
          mic: { name: 'Mikrofon', emoji: '🎤', price: 100, animationType: 'pulse', category: 'premium' },
          crown: { name: 'Taç', emoji: '👑', price: 120, animationType: 'glow', category: 'premium' },
          sports_car: { name: 'Spor Araba', emoji: '🏎️', price: 150, animationType: 'fly', category: 'premium' },
          airplane: { name: 'Uçak', emoji: '✈️', price: 180, animationType: 'fly', category: 'premium' },
          trophy: { name: 'Kupa', emoji: '🏆', price: 200, animationType: 'glow', category: 'premium' },
          rocket: { name: 'Roket', emoji: '🚀', price: 300, animationType: 'fly', category: 'legendary' },
          unicorn: { name: 'Unicorn', emoji: '🦄', price: 400, animationType: 'fly', category: 'legendary' },
          dragon: { name: 'Ejderha', emoji: '🐉', price: 500, animationType: 'pulse', category: 'legendary' },
          castle: { name: 'Kale', emoji: '🏰', price: 600, animationType: 'glow', category: 'legendary' },
          shooting_star: { name: 'Kayan Yıldız', emoji: '🌠', price: 750, animationType: 'fly', category: 'legendary' },
          galaxy: { name: 'Galaksi', emoji: '🌌', price: 800, animationType: 'spin', category: 'legendary' },
          fireworks: { name: 'Havai Fişek', emoji: '🎆', price: 900, animationType: 'pulse', category: 'legendary' },
          yacht: { name: 'Yat', emoji: '🛥️', price: 1000, animationType: 'fly', category: 'legendary' },
          island: { name: 'Ada', emoji: '🏝️', price: 1500, animationType: 'glow', category: 'legendary' },
          planet: { name: 'Gezegen', emoji: '🪐', price: 2000, animationType: 'spin', category: 'legendary' },
          aurora: { name: 'Kuzey Işığı', emoji: '🌊', price: 3000, animationType: 'glow', category: 'legendary' },
          infinity: { name: 'Sonsuzluk', emoji: '♾️', price: 5000, animationType: 'spin', category: 'legendary' },
        };
        const fb = fallbackMap[data.giftId];
        if (fb) {
          // Fallback hediye bulundu — DB'ye bakmadan doğrudan kullan
          this.logger.log(`[GIFT:SEND] Using fallback gift: ${data.giftId} → ${fb.emoji} ${fb.name}`);
          gift = { id: data.giftId, name: fb.name, emoji: fb.emoji, price: fb.price, animationType: fb.animationType, category: fb.category, isActive: true } as any;
        } else {
          // Son çare: name ile DB'de ara
          gift = await this.prisma.gift.findFirst({ where: { tenantId: user.tenantId, isActive: true, name: { contains: data.giftId, mode: 'insensitive' } } });
        }
      }
      if (!gift || !(gift as any).isActive) {
        this.logger.warn(`[GIFT:SEND] Gift not found: ${data.giftId}`);
        return { error: 'Hediye bulunamadı.' };
      }

      const totalCost = gift.price * quantity;

      // Check sender balance
      const senderUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { balance: true },
      });

      if (!senderUser || Number(senderUser.balance) < totalCost) {
        return { error: 'Yetersiz jeton bakiyesi.' };
      }

      // Check receiver exists
      const receiverExists = await this.prisma.user.findUnique({
        where: { id: data.receiverId },
        select: { id: true, displayName: true },
      });
      if (!receiverExists) {
        this.logger.warn(`[GIFT:SEND] Receiver not found in DB: ${data.receiverId}`);
        return { error: 'Alıcı kullanıcı bulunamadı.' };
      }

      // Calculate points for receiver (50% of cost)
      const pointsGiven = Math.floor(totalCost * 0.5);

      // DB Transaction: deduct balance, add points, create record
      await this.prisma.$transaction([
        // Deduct from sender
        this.prisma.user.update({
          where: { id: user.sub },
          data: {
            balance: { decrement: totalCost },
            totalGiftsSent: { increment: quantity },
          },
        }),
        // Add points to receiver
        this.prisma.user.update({
          where: { id: data.receiverId },
          data: {
            points: { increment: pointsGiven },
            totalGiftsReceived: { increment: quantity },
          },
        }),
        // Create transaction record
        this.prisma.giftTransaction.create({
          data: {
            tenantId: user.tenantId,
            senderId: user.sub,
            receiverId: data.receiverId,
            giftId: data.giftId,
            quantity,
            totalCost,
            pointsGiven,
            roomId: sender.roomSlug || null,
          },
        }),
      ]);

      // Get receiver display name
      const receiverDb = receiverExists;

      // Broadcast gift animation to everyone in the room
      const roomSlug = sender.roomSlug;
      if (roomSlug) {
        for (const [, p] of this.participants) {
          if (p.roomSlug === roomSlug) {
            this.server.to(p.socketId).emit('gift:received', {
              senderName: sender.displayName,
              receiverName: receiverDb?.displayName || 'Bilinmeyen',
              gift: {
                name: gift.name,
                emoji: gift.emoji,
                animationType: gift.animationType,
                category: gift.category,
                price: gift.price,
              },
              quantity,
            });
          }
        }
      }

      // Send updated balance to sender
      const updatedSender = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { balance: true, points: true },
      });

      client.emit('gift:balance', {
        balance: Number(updatedSender?.balance || 0),
        points: updatedSender?.points || 0,
      });

      // Broadcast gift message to chat so everyone sees it
      if (roomSlug) {
        const giftChatMsg = {
          id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'gift' as const,
          senderName: sender.displayName,
          receiverName: receiverDb?.displayName || 'Bilinmeyen',
          giftEmoji: gift.emoji,
          giftName: gift.name,
          giftCategory: gift.category,
          giftPrice: gift.price,
          quantity,
          totalCost,
          timestamp: new Date().toISOString(),
        };
        for (const [, p] of this.participants) {
          if (p.roomSlug === roomSlug) {
            this.server.to(p.socketId).emit('chat:giftMessage', giftChatMsg);
          }
        }
      }

      this.logger.log(`🎁 ${sender.displayName} → ${receiverDb?.displayName}: ${quantity}x ${gift.emoji} ${gift.name} (${totalCost} jeton)`);

      // ★ Push Notification — alıcıya push bildirim gönder
      this.sendGiftPushIfNeeded(data.receiverId, sender.displayName, `${gift.emoji} ${gift.name}`, sender.roomSlug).catch(() => {});

      return { success: true };
    } catch (err: any) {
      this.logger.error(`[GIFT:SEND] Error: ${err.message}`, err.stack);
      return { error: `Hediye gönderilemedi: ${err.message}` };
    }
  }

  // ═══════════ Room Reactions (Emojiler) — Broadcast ═══════════
  @SubscribeMessage('room:reaction')
  async handleRoomReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; emoji: string },
  ) {
    const user = client.data?.user;
    if (!user || !data?.emoji) return;

    const sender = this.participants.get(client.id);
    if (!sender) return;

    // ★ REDIS RATE LIMIT — room:reaction (max 10/10sn)
    const allowed = await this.checkSocketRateLimit(user.sub, 'room:reaction', 10, 10);
    if (!allowed) return;

    // Odadaki herkese broadcast et (gönderen dahil)
    const roomSlug = sender.roomSlug;
    for (const [, p] of this.participants) {
      if (p.roomSlug === roomSlug) {
        this.server.to(p.socketId).emit('room:reaction', {
          userId: user.sub,
          emoji: data.emoji,
          displayName: sender.displayName,
        });
      }
    }
  }

  // ═══════════ Gift: Get Balance ═══════════
  @SubscribeMessage('gift:balance')
  async handleGiftBalance(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { balance: true, points: true, totalGiftsSent: true, totalGiftsReceived: true },
    });

    client.emit('gift:balanceResponse', {
      balance: Number(dbUser?.balance || 0),
      points: dbUser?.points || 0,
      totalGiftsSent: dbUser?.totalGiftsSent || 0,
      totalGiftsReceived: dbUser?.totalGiftsReceived || 0,
    });
  }

  // ═══════════ Token Shop: List Packages ═══════════
  @SubscribeMessage('token:packages')
  async handleTokenPackages(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;

    try {
      const packages = await this.prisma.tokenPackage.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { balance: true, points: true },
      });

      // Kullanıcının bekleyen siparişlerini de gönder
      const pendingOrders = await this.prisma.tokenOrder.findMany({
        where: { userId: user.sub, status: 'PENDING' },
        include: { package: { select: { name: true, emoji: true } } },
        orderBy: { createdAt: 'desc' },
      });

      client.emit('token:packagesResponse', {
        packages: packages.map(p => ({
          id: p.id,
          name: p.name,
          tokenAmount: p.tokenAmount,
          price: Number(p.price),
          currency: p.currency,
          emoji: p.emoji,
          description: p.description,
        })),
        balance: Number(dbUser?.balance || 0),
        points: dbUser?.points || 0,
        pendingOrders: pendingOrders.map(o => ({
          id: o.id,
          packageName: o.package.name,
          packageEmoji: o.package.emoji,
          tokenAmount: o.tokenAmount,
          price: Number(o.price),
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        })),
      });
    } catch (err: any) {
      this.logger.error(`[TOKEN:PACKAGES] Error: ${err.message}`);
      client.emit('token:packagesResponse', { packages: [], balance: 0, points: 0, pendingOrders: [] });
    }
  }

  // ═══════════ Token Shop: Buy Package ═══════════
  @SubscribeMessage('token:buy')
  async handleTokenBuy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { packageId: string },
  ) {
    const user = client.data.user;
    if (!user) return { error: 'Giriş yapmalısınız.' };

    if (user.sub.startsWith('guest_')) {
      return { error: 'Misafirler jeton satın alamaz. Üye olun.' };
    }

    try {
      const pkg = await this.prisma.tokenPackage.findUnique({
        where: { id: data.packageId },
      });

      if (!pkg || !pkg.isActive) {
        return { error: 'Paket bulunamadı veya aktif değil.' };
      }

      // Bekleyen sipariş kontrolü (max 3)
      const pendingCount = await this.prisma.tokenOrder.count({
        where: { userId: user.sub, status: 'PENDING' },
      });

      if (pendingCount >= 3) {
        return { error: 'En fazla 3 bekleyen sipariş olabilir. Lütfen mevcut siparişlerinizin onaylanmasını bekleyin.' };
      }

      // Sipariş oluştur
      const order = await this.prisma.tokenOrder.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          packageId: pkg.id,
          tokenAmount: pkg.tokenAmount,
          price: pkg.price,
          status: 'PENDING',
        },
      });

      this.logger.log(`[TOKEN:BUY] ${user.displayName} → ${pkg.name} (${pkg.tokenAmount} jeton, ${pkg.price} ${pkg.currency})`);

      return {
        success: true,
        orderId: order.id,
        message: `${pkg.name} siparişiniz oluşturuldu. Admin onayından sonra jetonlarınız yüklenecek.`,
      };
    } catch (err: any) {
      this.logger.error(`[TOKEN:BUY] Error: ${err.message}`, err.stack);
      return { error: `Sipariş oluşturulamadı: ${err.message}` };
    }
  }

  // ═══════════ Admin: Add Balance (Jeton Yükleme) ═══════════
  @SubscribeMessage('admin:addBalance')
  async handleAdminAddBalance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; amount: number },
  ) {
    const user = client.data.user;
    if (!user) return;

    const actor = this.participants.get(client.id);
    if (!actor) return;

    const roleLevel = getRoleLevel(actor.role || 'guest');
    if (roleLevel < ROLE_HIERARCHY['admin']) {
      return { error: 'Yetkiniz yok.' };
    }

    if (!data.userId || !data.amount || data.amount <= 0) {
      return { error: 'Geçersiz parametre.' };
    }

    await this.prisma.user.update({
      where: { id: data.userId },
      data: { balance: { increment: data.amount } },
    });

    this.logger.log(`💰 Admin ${actor.displayName} → ${data.userId}: +${data.amount} jeton`);

    return { success: true, amount: data.amount };
  }

  // ═══════════ Admin: Token Order — Listele ═══════════
  @SubscribeMessage('token:orders')
  async handleTokenOrders(@ConnectedSocket() client: Socket) {
    const user = client.data?.user;
    if (!user) return;

    const actor = this.participants.get(client.id);
    if (!actor || getRoleLevel(actor.role || 'guest') < ROLE_HIERARCHY['admin']) {
      return { error: 'Yetkiniz yok.' };
    }

    try {
      const orders = await this.prisma.tokenOrder.findMany({
        where: { tenantId: user.tenantId },
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
          package: { select: { name: true, emoji: true, tokenAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      client.emit('token:ordersResponse', {
        orders: orders.map(o => ({
          id: o.id,
          userId: o.userId,
          userName: o.user.displayName,
          userAvatar: o.user.avatarUrl,
          userEmail: o.user.email,
          packageName: o.package.name,
          packageEmoji: o.package.emoji,
          tokenAmount: o.tokenAmount,
          price: Number(o.price),
          status: o.status,
          paymentMethod: o.paymentMethod || 'manual',
          adminNote: o.adminNote,
          processedBy: o.processedBy,
          processedAt: o.processedAt?.toISOString(),
          createdAt: o.createdAt.toISOString(),
        })),
      });
    } catch (err: any) {
      this.logger.error(`[TOKEN:ORDERS] Hata: ${err.message}`);
      client.emit('token:ordersResponse', { orders: [] });
    }
  }

  // ═══════════ Admin: Token Order — Onayla ═══════════
  @SubscribeMessage('token:approveOrder')
  async handleTokenApproveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; adminNote?: string },
  ) {
    const user = client.data?.user;
    if (!user) return { error: 'Giriş yapmalısınız.' };

    const actor = this.participants.get(client.id);
    if (!actor || getRoleLevel(actor.role || 'guest') < ROLE_HIERARCHY['admin']) {
      return { error: 'Yetkiniz yok.' };
    }

    if (!data?.orderId) return { error: 'orderId gerekli.' };

    try {
      const order = await this.prisma.tokenOrder.findUnique({
        where: { id: data.orderId },
        include: { package: { select: { name: true, emoji: true } } },
      });

      if (!order) return { error: 'Sipariş bulunamadı.' };
      if (order.status !== 'PENDING') return { error: `Sipariş zaten işlenmiş (${order.status}).` };

      // Transaction: order → APPROVED + bakiye yükle
      await this.prisma.$transaction([
        this.prisma.tokenOrder.update({
          where: { id: data.orderId },
          data: {
            status: 'APPROVED',
            processedBy: user.sub,
            processedAt: new Date(),
            adminNote: data.adminNote || null,
          },
        }),
        this.prisma.user.update({
          where: { id: order.userId },
          data: { balance: { increment: order.tokenAmount } },
        }),
      ]);

      this.logger.log(`✅ Token Order onaylandı: ${data.orderId} → +${order.tokenAmount} jeton (admin: ${actor.displayName})`);

      // Push bildirim
      try {
        const targetUser = await this.prisma.user.findUnique({
          where: { id: order.userId },
          select: { expoPushToken: true },
        });
        if (targetUser?.expoPushToken) {
          await this.pushService.sendPushNotification({
            to: targetUser.expoPushToken,
            title: '✅ Sipariş Onaylandı!',
            body: `${order.tokenAmount.toLocaleString()} jeton hesabınıza yüklendi.`,
            data: { type: 'token_approved' },
          });
        }
      } catch { /* sessizce atla */ }

      // Kullanıcının bakiyesini güncelle — eğer online ise
      for (const [, p] of this.participants) {
        if (p.userId === order.userId) {
          const updatedUser = await this.prisma.user.findUnique({
            where: { id: order.userId },
            select: { balance: true, points: true },
          });
          this.server.to(p.socketId).emit('gift:balance', {
            balance: Number(updatedUser?.balance || 0),
            points: updatedUser?.points || 0,
          });
          break;
        }
      }

      return { success: true, message: `Sipariş onaylandı, ${order.tokenAmount} jeton yüklendi.` };
    } catch (err: any) {
      this.logger.error(`[TOKEN:APPROVE] Hata: ${err.message}`, err.stack);
      return { error: `İşlem hatası: ${err.message}` };
    }
  }

  // ═══════════ Admin: Token Order — Reddet ═══════════
  @SubscribeMessage('token:rejectOrder')
  async handleTokenRejectOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; adminNote?: string },
  ) {
    const user = client.data?.user;
    if (!user) return { error: 'Giriş yapmalısınız.' };

    const actor = this.participants.get(client.id);
    if (!actor || getRoleLevel(actor.role || 'guest') < ROLE_HIERARCHY['admin']) {
      return { error: 'Yetkiniz yok.' };
    }

    if (!data?.orderId) return { error: 'orderId gerekli.' };

    try {
      const order = await this.prisma.tokenOrder.findUnique({
        where: { id: data.orderId },
      });

      if (!order) return { error: 'Sipariş bulunamadı.' };
      if (order.status !== 'PENDING') return { error: `Sipariş zaten işlenmiş (${order.status}).` };

      await this.prisma.tokenOrder.update({
        where: { id: data.orderId },
        data: {
          status: 'REJECTED',
          processedBy: user.sub,
          processedAt: new Date(),
          adminNote: data.adminNote || null,
        },
      });

      this.logger.log(`❌ Token Order reddedildi: ${data.orderId} (admin: ${actor.displayName})`);

      // Push bildirim
      try {
        const targetUser = await this.prisma.user.findUnique({
          where: { id: order.userId },
          select: { expoPushToken: true },
        });
        if (targetUser?.expoPushToken) {
          await this.pushService.sendPushNotification({
            to: targetUser.expoPushToken,
            title: '❌ Sipariş Reddedildi',
            body: data.adminNote || 'Jeton siparişiniz reddedildi.',
            data: { type: 'token_rejected' },
          });
        }
      } catch { /* sessizce atla */ }

      return { success: true, message: 'Sipariş reddedildi.' };
    } catch (err: any) {
      this.logger.error(`[TOKEN:REJECT] Hata: ${err.message}`, err.stack);
      return { error: `İşlem hatası: ${err.message}` };
    }
  }


  // ═══════════ Admin Panel: Live User Update via Socket ═══════════
  @SubscribeMessage('admin:userUpdate')
  handleAdminUserUpdateSocket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; displayName?: string; role?: string; permissions?: any; avatarUrl?: string },
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) {
      this.logger.warn(`[admin:userUpdate] Actor not found for socket ${client.id}`);
      return;
    }

    // Only admin+ can push live updates
    if (getRoleLevel(actor.role) < ACTION_MIN_LEVELS['setRole']) {
      client.emit('room:error', { message: 'Bu işlem için yetkiniz yok.' });
      this.logger.warn(`[admin:userUpdate] ${actor.displayName} (${actor.role}) lacks permission — DENIED`);
      return;
    }

    if (!payload.userId) {
      this.logger.warn('[admin:userUpdate] Missing userId in payload');
      return;
    }

    this.logger.log(`[admin:userUpdate] ${actor.displayName} updating user ${payload.userId} — role=${payload.role}, displayName=${payload.displayName}`);
    this.handleAdminUserUpdate(payload.userId, payload);
  }

  // ═══════════ Self Profile Update (cross-tab sync from homepage) ═══════════
  @SubscribeMessage('user:profileUpdate')
  async handleUserProfileUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { displayName?: string; avatar?: string; nameColor?: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    // DB'den güncel bilgileri çek (profil zaten API'den kaydedilmiş)
    if (participant.userId && !participant.userId.startsWith('guest_')) {
      try {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: participant.userId },
          select: { displayName: true, avatarUrl: true, nameColor: true },
        });
        if (dbUser) {
          if (dbUser.displayName) participant.displayName = dbUser.displayName;
          if (dbUser.avatarUrl) participant.avatar = dbUser.avatarUrl;
          if (dbUser.nameColor !== undefined) participant.nameColor = dbUser.nameColor || undefined;
        }
      } catch (e) {
        // DB hatası — payload'daki bilgileri kullan
        if (payload.displayName) participant.displayName = payload.displayName;
        if (payload.avatar) participant.avatar = payload.avatar;
        if (payload.nameColor !== undefined) participant.nameColor = payload.nameColor || undefined;
      }
    } else {
      // Misafir — payload'daki bilgileri direkt kullan
      if (payload.displayName) participant.displayName = payload.displayName;
      if (payload.avatar) participant.avatar = payload.avatar;
    }

    // Socket data'yı da güncelle
    const clientSocket = this.server.sockets.sockets.get(client.id);
    if (clientSocket?.data?.user) {
      clientSocket.data.user.displayName = participant.displayName;
      clientSocket.data.user.avatar = participant.avatar;
      if (participant.nameColor) clientSocket.data.user.nameColor = participant.nameColor;
    }

    this.logger.log(`[user:profileUpdate] ${participant.displayName} profil güncellendi (room=${participant.roomId})`);

    // Odadaki herkese güncel katılımcı listesini yayınla
    this._doBroadcastParticipants(participant.roomId);
  }

  public handleAdminUserUpdate(userId: string, data: any) {
    let roomId: string | null = null;
    let found = false;

    // Find all sockets for this user (could be multiple tabs)
    for (const participant of this.participants.values()) {
      if (participant.userId === userId) {
        found = true;
        roomId = participant.roomId;

        // Update fields
        if (data.displayName) participant.displayName = data.displayName;
        if (data.role) participant.role = data.role;
        if (data.permissions !== undefined) participant.permissions = data.permissions;
        // Accept both 'avatar' and 'avatarUrl' keys (frontend sends 'avatar', API sends 'avatarUrl')
        const newAvatar = data.avatarUrl ?? data.avatar;
        if (newAvatar !== undefined) {
          participant.avatar = newAvatar || undefined;
        }

        // Update socket data
        const client = this.server.sockets.sockets.get(participant.socketId);
        if (client && client.data.user) {
          if (data.displayName) {
            client.data.user.displayName = data.displayName;
            client.data.user.username = data.displayName;
          }
          if (data.role) client.data.user.role = data.role;
          if (data.permissions !== undefined) client.data.user.permissions = data.permissions;
          if (newAvatar !== undefined) client.data.user.avatar = participant.avatar;

          // Notify user to update local state (e.g. if you have a useAuth hook)
          client.emit('auth:session-update', {
            displayName: participant.displayName,
            role: participant.role,
            avatar: participant.avatar,
          });
          // Bireysel yetki güncellemesi — context menu'yü canlı günceller
          if (data.permissions !== undefined) {
            client.emit('auth:permissions-update', {
              permissions: data.permissions,
            });
          }
        }
      }
    }

    if (found && roomId) {
      this._doBroadcastParticipants(roomId);
      this.logger.log(
        `[Sync] Admin update for user ${userId} applied in room ${roomId}`,
      );
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Read token from auth body first (avoids URL length limits), fallback to query
      const token = (client.handshake.auth?.token || client.handshake.query.token) as string;

      if (!token) {
        this.logger.warn(`Connection without token: ${client.id}`);
        client.data.user = null;
        return;
      }

      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'secretKey',
        });
        client.data.user = payload;
        (client.data as any).platform = client.handshake.auth?.platform || 'web';
        this.logger.log(
          `Connected: ${client.id} → ${payload.displayName || payload.username}`,
        );


        // DEBUG: Log ALL incoming admin events for this socket
        (client as any).onAny((eventName: string, ...args: any[]) => {
          if (eventName.startsWith('admin:')) {
            this.logger.log(`[onAny DEBUG] ${client.id} → event: "${eventName}", args: ${JSON.stringify(args).substring(0, 200)}`);
          }
        });

        // RAW handler for admin:pull-user (bypasses NestJS @SubscribeMessage which silently fails)
        client.on('admin:pull-user', async (data: any, ack?: Function) => {
          try {
            this.logger.log(`[RAW admin:pull-user] from ${client.id}: ${JSON.stringify(data)}`);
            await this._handlePullUserRaw(client, data, ack);
          } catch (err: any) {
            this.logger.error(`[admin:pull-user] CRASH CAUGHT: ${err.message}\n${err.stack}`);
            if (ack) ack({ success: false, error: err.message });
          }
        });
      } catch (jwtErr) {
        this.logger.warn(`Invalid JWT for ${client.id}: ${jwtErr.message}`);
        client.data.user = null;
      }
    } catch (e) {
      this.logger.error(`Connection error: ${e.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const participant = this.participants.get(client.id);
    if (participant) {
      // If this user was the speaker, release the mic
      this.autoReleaseSpeaker(participant.roomId, client.id);

      // ★ DUEL AUTO-FORFEIT on disconnect
      this.autoDuelForfeit(participant.roomId, participant.userId, participant.displayName, 'disconnected');

      // ★ GodMaster — disconnect olduğunda görünürlük tercihini sıfırla
      // Böylece tekrar girdiğinde varsayılan 'hidden' modu geçerli olur
      if (participant.role?.toLowerCase() === 'godmaster') {
        this.godmasterVisibility.delete(participant.userId);
      }

      this.participants.delete(client.id);
      // ★ REDIS SYNC — Disconnect'te Redis'ten de sil
      this.removeParticipantFromRedis(client.id, participant.roomId);

      // ★ Oda boşsa mesajları 5dk sonra temizle (kullanıcı geri dönebilir)
      const roomStillHasUsers = Array.from(this.participants.values()).some(p => p.roomId === participant.roomId);
      if (!roomStillHasUsers) {
        this.scheduleRoomMessageCleanup(participant.roomId, participant.roomSlug);
      }

      this.server.to(participant.roomId).emit('room:participant-left', {
        userId: participant.userId,
        socketId: client.id,
      });

      // ★ DIRECT CALL (no debounce) — disconnect anında liste güncellenmeli
      this._doBroadcastParticipants(participant.roomId);

      this.logger.log(
        `Disconnected: ${client.id} (${participant.displayName}) left ${participant.roomId}`,
      );

      // Broadcast updated room counts to all tenant clients
      this.broadcastRoomCounts(participant.tenantId);

      // ★ DB CLEANUP — Mark participant as inactive AND user as offline
      try {
        await this.prisma.participant.updateMany({
          where: { socketId: client.id, isActive: true },
          data: { isActive: false, leftAt: new Date() },
        });

        // Check if user has any other active sockets before marking offline
        if (participant.userId) {
          const hasOtherSockets = Array.from(this.participants.values()).some(
            (p) => p.userId === participant.userId,
          );
          if (!hasOtherSockets) {
            await this.prisma.user.updateMany({
              where: { id: participant.userId, isOnline: true },
              data: { isOnline: false },
            });
            this.logger.log(`[DB CLEANUP] User ${participant.displayName} marked offline`);
          }
        }
      } catch (e) {
        this.logger.warn(`[DB CLEANUP] Failed to mark participant/user inactive: ${e.message}`);
      }
    } else {
      this.logger.log(`Disconnected: ${client.id} (no room)`);
    }
  }

  // ═══════════ Room Leave Handler ═══════════
  @SubscribeMessage('room:leave')
  async handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    this.logger.log(`[room:leave] ${participant.displayName} leaving ${participant.roomSlug}`);

    // Release mic if speaker
    this.autoReleaseSpeaker(participant.roomId, client.id);

    // Duel auto-forfeit
    this.autoDuelForfeit(participant.roomId, participant.userId, participant.displayName, 'room_switch');

    // Notify room
    this.server.to(participant.roomId).emit('room:participant-left', {
      userId: participant.userId,
      socketId: client.id,
    });

    // Leave Socket.IO room
    client.leave(participant.roomId);

    // Remove from participants
    this.participants.delete(client.id);
    // ★ REDIS SYNC — room:leave'de Redis'ten de sil
    this.removeParticipantFromRedis(client.id, participant.roomId);

    // ★ Oda boşsa mesajları 5dk sonra temizle (kullanıcı geri dönebilir)
    const roomStillHasUsersAfterLeave = Array.from(this.participants.values()).some(p => p.roomId === participant.roomId);
    if (!roomStillHasUsersAfterLeave) {
      this.scheduleRoomMessageCleanup(participant.roomId, participant.roomSlug);
    }

    // Broadcast updated participant list and room counts
    this._doBroadcastParticipants(participant.roomId);
    this.broadcastRoomCounts(participant.tenantId);

    // ★ DB CLEANUP — Mark participant as inactive AND user as offline
    try {
      await this.prisma.participant.updateMany({
        where: { socketId: client.id, isActive: true },
        data: { isActive: false, leftAt: new Date() },
      });

      // Check if user has any other active sockets before marking offline
      if (participant.userId) {
        const hasOtherSockets = Array.from(this.participants.values()).some(
          (p) => p.userId === participant.userId,
        );
        if (!hasOtherSockets) {
          await this.prisma.user.updateMany({
            where: { id: participant.userId, isOnline: true },
            data: { isOnline: false },
          });
          this.logger.log(`[DB CLEANUP] User ${participant.displayName} marked offline on leave`);
        }
      }
    } catch (e) {
      this.logger.warn(`[DB CLEANUP] Failed to mark participant/user inactive on leave: ${e.message}`);
    }
  }

  /** Get participants for a room, filtering stealth users based on viewer role */
  private getRoomParticipants(
    roomId: string,
    viewerId: string,
    viewerRole?: string,
  ): InMemoryParticipant[] {
    const result: InMemoryParticipant[] = [];
    const isViewerGodMaster = viewerRole?.toLowerCase() === 'godmaster';

    this.participants.forEach((p) => {
      if (p.roomId !== roomId) return;

      // Always include self
      if (p.userId === viewerId) {
        result.push(p);
        return;
      }

      // ★ GODMASTER BYPASS — GodMaster herkesi görür, stealth dahil ★
      if (isViewerGodMaster) {
        result.push(p);
        return;
      }

      // GodMaster visibility — depends on visibilityMode
      if (p.role?.toLowerCase() === 'godmaster') {
        const mode = p.visibilityMode || 'visible';
        this.logger.log(`[getRoomParticipants] GodMaster ${p.displayName} | mode=${mode} | isStealth=${p.isStealth} | viewer=${viewerId} (${viewerRole})`);
        if (mode === 'hidden') return; // only hide when explicitly set
        // 'visible' or 'disguised' → show to everyone, skip stealth check
        result.push(p);
        return;
      }

      // If participant is stealth...
      if (p.isStealth) {
        this.logger.log(`[getRoomParticipants] STEALTH FILTER: ${p.displayName} (role=${p.role}, stealth=${p.isStealth}) hidden from ${viewerId} (${viewerRole})`);
        // If viewer has no role (guest), definitely hide
        if (!viewerRole) return;

        const viewerLevel = getRoleLevel(viewerRole);
        const targetLevel = getRoleLevel(p.role);

        // ★ Hiyerarşik görünürlük: üst veya eşit rol stealth kullanıcıyı görür
        // Aynı seviyedekiler birbirini görür (iki admin, iki moderator vb.)
        if (viewerLevel < targetLevel) {
          return; // hidden — viewer'ın seviyesi daha düşük
        }
      }
      result.push(p);
    });
    return result;
  }

  /** ★ roomSlug bazlı katılımcı listesi — tenantId uyumsuzluğunda bile aynı odadaki herkes görünür */
  private getRoomParticipantsMultiTenant(
    roomSlug: string,
    viewerId: string,
    viewerRole?: string,
  ): InMemoryParticipant[] {
    const result: InMemoryParticipant[] = [];
    const isViewerGodMaster = viewerRole?.toLowerCase() === 'godmaster';

    this.participants.forEach((p) => {
      if (p.roomSlug !== roomSlug) return;

      // Always include self
      if (p.userId === viewerId) {
        result.push(p);
        return;
      }

      // ★ GODMASTER BYPASS
      if (isViewerGodMaster) {
        result.push(p);
        return;
      }

      // GodMaster visibility
      if (p.role?.toLowerCase() === 'godmaster') {
        const mode = p.visibilityMode || 'visible';
        if (mode === 'hidden') return;
        result.push(p);
        return;
      }

      // Stealth filter
      if (p.isStealth) {
        if (!viewerRole) return;
        const viewerLevel = getRoleLevel(viewerRole);
        const targetLevel = getRoleLevel(p.role);
        if (viewerLevel < targetLevel) return;
      }
      result.push(p);
    });
    return result;
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; initialStatus?: string; password?: string; disguiseName?: string; avatar?: string; gender?: string; godmasterIcon?: string; urlTenantSlug?: string },
  ) {
    let { roomId } = payload;
    const user = client.data.user;

    // ─── RESOLVE EFFECTIVE TENANT (URL tenant slug overrides JWT tenant for cross-tenant access) ──
    let effectiveTenantId = user?.tenantId || 'default';
    if (payload.urlTenantSlug && user) {
      try {
        // URL'deki tenant slug'ından gerçek tenant'ı bul
        const urlTenant = await this.prisma.tenant.findFirst({
          where: {
            OR: [
              { slug: payload.urlTenantSlug },
              { accessCode: payload.urlTenantSlug },
            ],
          },
          select: { id: true },
        });
        if (!urlTenant) {
          // Oda slug'ı ile de dene
          const roomBySlug = await this.prisma.room.findFirst({
            where: { slug: payload.urlTenantSlug },
            select: { tenantId: true },
          });
          if (roomBySlug) {
            effectiveTenantId = roomBySlug.tenantId;
            this.logger.log(`[room:join] Resolved tenant from room slug "${payload.urlTenantSlug}" → tenantId=${effectiveTenantId}`);
          }
        } else {
          effectiveTenantId = urlTenant.id;
          this.logger.log(`[room:join] Resolved tenant from URL slug "${payload.urlTenantSlug}" → tenantId=${effectiveTenantId}`);
        }
      } catch (e) {
        this.logger.warn(`[room:join] Failed to resolve urlTenantSlug "${payload.urlTenantSlug}": ${e.message}`);
      }
    }

    // ─── LOAD TENANT SETTINGS (used for multiple checks below) ──
    let sysSettings: any = null;
    if (user) {
      this.logger.log(`[room:join] user.tenantId=${user.tenantId}, effectiveTenantId=${effectiveTenantId}`);
      sysSettings = await this.loadTenantSettings(effectiveTenantId);
      this.logger.log(`[room:join] sysSettings loaded: ${sysSettings ? 'YES' : 'NULL'}, rolePermissions: ${JSON.stringify(sysSettings?.rolePermissions || 'N/A')}`);
    }

    if (!user) {
      this.logger.warn(`room:join denied — no auth on socket ${client.id}`);
      client.emit('room:error', { message: 'Authentication required' });
      return;
    }

    // ─── CANONICAL ROOM RESOLUTION (Web & Mobile Sync Fix) ──
    let canonicalRoom: any = null;
    try {
      canonicalRoom = await this.roomService.findBySlug(effectiveTenantId, roomId);
      if (canonicalRoom && canonicalRoom.slug) {
        roomId = canonicalRoom.slug;
      }
    } catch(e) {
      this.logger.warn(`Could not resolve canonical room ${roomId}: ${e.message}`);
    }

    // ─── BAN CHECK ─────────────────────────────────────────
    // ★ TIERED BAN SYSTEM ★
    // < 1 week ban → soft ban: user enters but ALL features disabled
    // ≥ 1 week / permanent → hard ban: full block, cannot enter
    // ★ GODMASTER BYPASS — GodMaster ASLA banlı olamaz ★
    const clientIp = client.handshake.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || client.handshake.address
      || '0.0.0.0';

    const joinerRole = (user.role || 'guest').toLowerCase();
    const banBlockEnabled = sysSettings?.banBlockEntry !== false; // default: true
    let softBanInfo: { reason: string; expiresAt: string | null } | null = null;

    if (joinerRole !== 'godmaster' && banBlockEnabled) {
      try {
        // ★ PARALLEL: Both ban checks run simultaneously
        const joinerLevel = getRoleLevel(joinerRole);
        const needsIpCheck = joinerLevel < ROLE_HIERARCHY['admin'];
        const [activeBan, ipBan] = await Promise.all([
          this.adminService.checkActiveBan(user.sub),
          needsIpCheck ? this.adminService.checkActiveIpBan(clientIp, user.tenantId) : Promise.resolve(null),
        ]);

        // Layer 1: Check user ID ban
        if (activeBan) {
          const expiresAtStr = activeBan.expiresAt?.toISOString() || null;
          const remainingMs = activeBan.expiresAt
            ? activeBan.expiresAt.getTime() - Date.now()
            : Infinity; // permanent
          if (remainingMs === Infinity) {
            this.logger.warn(`[HARD BAN] ${user.sub} (role=${joinerRole}) blocked from room ${roomId}`);
            client.emit('room:banned', {
              reason: activeBan.reason || 'Yasaklısınız.',
              expiresAt: expiresAtStr,
              banLevel: 'hard',
            });
            client.disconnect(true);
            return;
          } else {
            this.logger.warn(`[SOFT BAN] ${user.sub} (role=${joinerRole}) allowed in room ${roomId} with restrictions (${Math.ceil(remainingMs / 3600000)}h left)`);
            softBanInfo = {
              reason: activeBan.reason || 'Geçici yasak.',
              expiresAt: expiresAtStr,
            };
          }
        }

        // Layer 2: Check IP ban
        if (ipBan) {
          this.logger.warn(`[IP BAN CHECK] IP ${clientIp} is banned, blocking user ${user.sub}`);
          client.emit('room:banned', {
            reason: ipBan.reason || 'IP adresiniz yasaklanmış.',
            expiresAt: null,
            banLevel: 'hard',
          });
          client.disconnect(true);
          return;
        } else if (!needsIpCheck) {
          this.logger.log(`[BAN CHECK] IP ban check skipped for staff user ${user.sub} (role=${joinerRole})`);
        }
      } catch (e) {
        this.logger.error(`[BAN CHECK] Error checking ban for ${user.sub}: ${e.message}`);
        // Continue anyway — don't block on DB failures
      }
    } else if (joinerRole === 'godmaster') {
      this.logger.log(`[GODMASTER] Ban check bypassed for GodMaster user ${user.sub}`);
    } else {
      this.logger.log(`[BAN CHECK] Ban blocking disabled (banBlockEntry=false), allowing user ${user.sub}`);
    }

    // ─── GUEST NICKNAME DUPLICATE CHECK ──────────────────────────────────
    // Misafir kullanıcıların aynı odadaki mevcut üyelerle nick çakışmasını engelle
    if (user.role === 'guest' || user.isGuest) {
      const guestDisplayName = user.displayName || user.username;
      if (guestDisplayName) {
        // 1) Odada aynı isimde başka biri var mı?
        const nickConflict = Array.from(this.participants.values()).find(
          (p) =>
            p.roomId === roomId &&
            p.userId !== user.sub &&
            p.displayName?.toLowerCase() === guestDisplayName.toLowerCase(),
        );
        if (nickConflict) {
          client.emit('room:error', {
            message: `"${guestDisplayName}" ismi bu odada zaten kullanılıyor. Lütfen farklı bir isim seçin.`,
            code: 'NICK_TAKEN',
          });
          return;
        }
        // 2) Bu tenanta kayıtlı üye aynı displayName'e sahip mi?
        try {
          const memberConflict = await this.prisma.user.findFirst({
            where: {
              tenantId: effectiveTenantId,
              displayName: { equals: guestDisplayName, mode: 'insensitive' },
            },
            select: { id: true },
          });
          if (memberConflict) {
            client.emit('room:error', {
              message: `"${guestDisplayName}" ismi kayıtlı bir üyeye ait. Lütfen farklı bir isim seçin.`,
              code: 'NICK_RESERVED',
            });
            return;
          }
        } catch (e) {
          this.logger.warn(`[NICK CHECK] DB check failed: ${e.message}`);
        }
      }
    }

    // ─── ROOM ACCESS CHECKS (password, lock, capacity, VIP) ──
    const userRole = (user.role || 'guest').toLowerCase();
    // GodMaster bypasses all room restrictions
    if (userRole !== 'godmaster') {
      try {
        const room = canonicalRoom;
        if (room) {
          // 0) MEETING ROOM — davet ile açık, kısıtlama kaldırıldı
          // (Hiyerarşi kontrolü meeting:invite handler'ında yapılıyor)

          // 1) LOCKED CHECK — Admin+ can enter locked rooms
          if (room.isLocked && getRoleLevel(userRole) < getRoleLevel('admin')) {
            client.emit('room:error', { message: 'Bu oda kilitli. Giriş yapılamaz.' });
            return;
          }

          // 2) PASSWORD CHECK
          if (room.password && room.password.trim() !== '') {
            if (!payload.password || payload.password !== room.password) {
              // Send room list so user can navigate to other rooms
              let roomList: any[] = [];
              try {
                const dbRooms = await this.roomService.findAll(effectiveTenantId);
                roomList = dbRooms.map((r: any) => ({
                  id: r.id, name: r.name, slug: r.slug, status: r.status,
                  isLocked: r.isLocked, isVipRoom: r.isVipRoom, isMeetingRoom: r.isMeetingRoom,
                  participantCount: r._count?.participants || 0,
                  buttonColor: r.buttonColor || null,
                }));
              } catch (_e) { }
              client.emit('room:password-required', { roomId, roomName: room.name, rooms: roomList });
              return;
            }
          }

          // 3) MAX PARTICIPANTS CHECK (oda bazlı)
          if (room.maxParticipants && room.maxParticipants > 0) {
            let currentCount = 0;
            this.participants.forEach(p => { if (p.roomId === roomId) currentCount++; });
            if (currentCount >= room.maxParticipants && getRoleLevel(userRole) < getRoleLevel('admin')) {
              client.emit('room:error', { message: 'Bu oda dolu. Maksimum katılımcı sayısına ulaşıldı.' });
              return;
            }
          }

          // 3b) TENANT USER LIMIT PER ROOM CHECK
          try {
            const tenant = await this.prisma.tenant.findUnique({
              where: { id: effectiveTenantId },
              select: { userLimitPerRoom: true },
            });
            if (tenant?.userLimitPerRoom && tenant.userLimitPerRoom > 0) {
              let currentRoomCount = 0;
              this.participants.forEach(p => { if (p.roomId === roomId && p.tenantId === user.tenantId) currentRoomCount++; });
              if (currentRoomCount >= tenant.userLimitPerRoom && getRoleLevel(userRole) < getRoleLevel('admin')) {
                this.logger.warn(`[LIMIT] Oda limiti aşıldı: ${currentRoomCount}/${tenant.userLimitPerRoom} — user ${user.sub}, room ${roomId}`);
                client.emit('room:error', {
                  message: `Bu odanın kullanıcı limiti doldu (${tenant.userLimitPerRoom} kişi). Lütfen başka bir odaya girin.`,
                  code: 'ROOM_LIMIT_REACHED',
                });
                return;
              }
            }
          } catch (limitErr) {
            this.logger.warn(`Tenant limit check failed: ${limitErr.message}`);
          }

          // 4) VIP ROOM CHECK — ekranda uyarı göster, 3sn sonra fallback odaya yönlendir
          if (room.isVipRoom && getRoleLevel(userRole) < getRoleLevel('vip')) {
            // Fallback: ilk VIP olmayan odayı bul
            let fallbackSlug: string | null = null;
            try {
              const dbRooms = await this.roomService.findAll(effectiveTenantId);
              const fallbackRoom = dbRooms.find((r: any) => !r.isVipRoom && !r.isMeetingRoom && r.slug !== roomId);
              if (fallbackRoom) fallbackSlug = fallbackRoom.slug;
            } catch (_e) {
              this.logger.warn(`VIP fallback room lookup failed: ${_e.message}`);
            }
            client.emit('room:error', {
              message: 'Bu oda sadece VIP üyelere açıktır.',
              code: 'VIP_ONLY',
              fallbackSlug,
            });
            return;
          }
        }
      } catch (e) {
        this.logger.warn(`Could not check room access for ${roomId}: ${e.message}`);
        // Room might not exist in DB — continue with join
      }
    }

    // Join the Socket.IO room (tenant-scoped to isolate tenants)
    const tenantId = effectiveTenantId;
    const scopedRoom = scopeRoomId(tenantId, roomId);

    // ★ DEBUG: Mevcut tüm katılımcıların roomId'lerini logla — tenantId uyumsuzluğunu tespit
    const allRoomIds = new Set<string>();
    this.participants.forEach(p => { if (p.roomSlug === roomId) allRoomIds.add(p.roomId); });
    this.logger.log(`[JOIN DEBUG] user=${user.username} tenantId=${tenantId} scopedRoom=${scopedRoom} existingRoomIds=[${[...allRoomIds].join(', ')}] totalParticipants=${this.participants.size}`);

    client.join(scopedRoom);

    // Store participant in memory
    const userRoleLevel = getRoleLevel(user.role || 'guest');

    // ★ Sadece GodMaster varsayılan olarak GÖRÜNMEZ girer
    // Owner ve diğer VIP+ roller ÇEVRİMİÇİ olarak başlar
    // GodMaster varsayılan olarak GÖRÜNMEZ girer (hidden mode)
    const hasStealthPermission = user.permissions?.['self.stealth'] === true;
    const isGodMasterRole = (user.role || 'guest').toLowerCase() === 'godmaster';
    // ★ GodMaster artık görünür olarak başlar — isterse dropdown'dan gizli moda geçebilir
    let initialStealth = false;
    let initialVisibilityMode: 'hidden' | 'visible' | 'disguised' | undefined = undefined;
    let initialDisguiseName: string | undefined = undefined;

    if (isGodMasterRole) {
      // GodMaster: varsayılan görünür, stealth değil
      initialVisibilityMode = 'visible';
    } else if (payload.initialStatus) {
      // ★ VIP altı kullanıcılar initialStatus payload'ını kullanabilir
      if (payload.initialStatus === 'stealth') {
        if (hasStealthPermission) {
          initialStealth = true;
        }
      }
      // 'online' veya başka statuslar → initialStealth zaten false
    }

    this.logger.log(
      `[Stealth Debug] User: ${user.username} | Role: ${user.role} | Level: ${userRoleLevel} | VIP_LEVEL: ${VIP_LEVEL} | InitialStealth: ${initialStealth} | Requested: ${payload.initialStatus} | IGNORED_PAYLOAD: ${initialStealth}`
    );

    // ★ DEFERRED DB REFRESH — join sonrasında async olarak güncellenir (join'i bloklamaz)
    // JWT'deki mevcut rol/profil kullanılır, DB refresh arka planda yapılır
    const deferredDbRefresh = async () => {
      if (!user.sub || user.sub.startsWith('guest_')) return;
      try {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.sub },
          select: { role: true, permissions: true, avatarUrl: true, displayName: true, nameColor: true },
        });
        if (dbUser) {
          let changed = false;
          const p = this.participants.get(client.id);
          if (!p) return; // Already disconnected

          if (dbUser.role && dbUser.role !== p.role) { p.role = dbUser.role; changed = true; }
          if (dbUser.permissions) { user.permissions = dbUser.permissions as any; p.permissions = dbUser.permissions as any; }
          if (dbUser.avatarUrl && dbUser.avatarUrl !== p.avatar) { p.avatar = dbUser.avatarUrl; changed = true; }
          if (dbUser.displayName && dbUser.displayName !== p.displayName) { p.displayName = dbUser.displayName; changed = true; }
          if (dbUser.nameColor) { p.nameColor = dbUser.nameColor; changed = true; }

          if (changed) {
            this._doBroadcastParticipants(p.roomId);
          }
        }
      } catch (e) {
        this.logger.warn(`[Deferred DB Refresh] ${user.sub}: ${e.message}`);
      }
    };

    // Restore temp role if user has an active one for this room
    const tempKey = `${user.sub}:${scopedRoom}`;
    const tempRole = this.tempRoles?.get(tempKey);
    if (tempRole && tempRole.expiresAt > new Date()) {
      this.logger.log(`[TEMP ROLE RESTORE] ${user.displayName || user.username}: ${user.role} → ${tempRole.newRole} (room=${roomId}, expires=${tempRole.expiresAt.toISOString()})`);
      user.role = tempRole.newRole;
    }

    const participant: InMemoryParticipant = {
      userId: user.sub,
      guestId: user.sub.startsWith('guest_') ? user.sub : undefined,
      displayName: user.displayName || user.username,
      avatar:
        payload.avatar ||    // ★ Frontend sessionStorage'dan (her zaman güncel)
        user.avatar ||       // JWT'den (genellikle boş — JWT avatar içermez)
        undefined,
      role: user.role || 'guest',
      socketId: client.id,
      roomId: scopedRoom,
      roomSlug: canonicalRoom?.slug || roomId,
      tenantId: effectiveTenantId,
      isStealth: initialStealth,
      status: initialStealth ? 'stealth' : 'online',
      nameColor: user.nameColor || undefined,
      gender: payload.gender || user.gender || undefined,
      visibilityMode: isGodMasterRole ? (initialVisibilityMode || this.godmasterVisibility.get(user.sub) || 'visible') : undefined,
      disguisedName: initialDisguiseName,
      godmasterIcon: isGodMasterRole ? (payload.godmasterIcon || undefined) : undefined,
      permissions: user.permissions || undefined,
      platform: (client.data as any).platform || 'web',
    };

    // Restore moderation flags from previous session
    const savedFlags = this.roomModerations.get(scopedRoom)?.get(user.sub);
    if (savedFlags) {
      participant.isMuted = savedFlags.isMuted ?? false;
      participant.isGagged = savedFlags.isGagged ?? false;
      participant.isCamBlocked = savedFlags.isCamBlocked ?? false;
      this.logger.log(`[Moderation Restore] ${participant.displayName}: muted=${participant.isMuted}, gagged=${participant.isGagged}, camBlocked=${participant.isCamBlocked}`);
    }
    // ─── ZOMBIE CLEANUP — Aynı userId ile eski socket'leri temizle (çoklu giriş ayarından BAĞIMSIZ) ───
    // Bu, hayalet kullanıcıları önler: kullanıcı yeni socket ile bağlandığında eski
    // zombie participant kayıtlarını temizle (disconnect event kaybolmuş olabilir).
    const zombieSocketIds: string[] = [];
    for (const [existingSocketId, existingParticipant] of this.participants.entries()) {
      if (existingParticipant.userId === user.sub && existingSocketId !== client.id) {
        // Bu gerçekten bağlı bir socket mi kontrol et
        const existingSocket = this.server.sockets.sockets.get(existingSocketId);
        if (!existingSocket || !existingSocket.connected) {
          // Zombie socket — bağlı değil ama participant listesinde kalıyor
          this.logger.warn(
            `[⚠️ ZOMBIE CLEANUP] Removing stale participant ${existingParticipant.displayName} (socket ${existingSocketId}) from ${existingParticipant.roomSlug}`,
          );
          zombieSocketIds.push(existingSocketId);
        }
      }
    }
    for (const zombieId of zombieSocketIds) {
      const zombieParticipant = this.participants.get(zombieId);
      if (zombieParticipant) {
        this.server.to(zombieParticipant.roomId).emit('room:participant-left', {
          userId: zombieParticipant.userId,
          socketId: zombieId,
        });
        this._doBroadcastParticipants(zombieParticipant.roomId);
        this.participants.delete(zombieId);
      }
    }

    // ─── ADMIN AUTO HD LOCK ─────────────────────────────────
    // Aynı IP'den 1 saat içinde 20+ bağlantı olursa otomatik 24 saat engelleme
    // ★ Localhost IP'leri muaf (geliştirme ortamı koruması)
    const isLocalhostIp = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    if (sysSettings?.adminAutoHdLock !== false && joinerRole !== 'godmaster' && !isLocalhostIp) {
      // Önce mevcut kilidi kontrol et
      const lockExpiry = this.ipAutoLocked.get(clientIp);
      if (lockExpiry && Date.now() < lockExpiry) {
        this.logger.warn(`[AUTO-HD-LOCK] IP ${clientIp} auto-locked until ${new Date(lockExpiry).toISOString()}`);
        client.emit('room:error', { message: 'Bu cihazdan çok fazla bağlantı yapıldı. Lütfen daha sonra tekrar deneyin.' });
        client.disconnect(true);
        return;
      } else if (lockExpiry) {
        this.ipAutoLocked.delete(clientIp); // Süre dolmuş, temizle
      }

      // Bağlantı sayacını güncelle
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 saat
      const attempts = (this.ipConnectionTracker.get(clientIp) || []).filter(t => now - t < windowMs);
      attempts.push(now);
      this.ipConnectionTracker.set(clientIp, attempts);

      if (attempts.length >= 20) {
        const lockDuration = 24 * 60 * 60 * 1000; // 24 saat
        this.ipAutoLocked.set(clientIp, now + lockDuration);
        this.ipConnectionTracker.delete(clientIp); // Sayacı sıfırla
        this.logger.warn(`[AUTO-HD-LOCK] IP ${clientIp} locked for 24h after ${attempts.length} connections in 1h`);
        client.emit('room:error', { message: 'Çok fazla bağlantı denemesi tespit edildi. 24 saat süreyle engellendiniz.' });
        client.disconnect(true);
        return;
      }
    }

    // ─── VIRTUAL MACHINE BLOCK ──────────────────────────────
    // Client User-Agent'ında VM kalıpları tespit edilirse bağlantıyı reddet
    if (sysSettings?.blockVirtualMachine && joinerRole !== 'godmaster') {
      const userAgent = client.handshake.headers['user-agent'] || '';
      const isVM = this.VM_UA_PATTERNS.some(p => p.test(userAgent));
      if (isVM) {
        this.logger.warn(`[VM-BLOCK] Virtual machine detected for ${user.sub}: ${userAgent.substring(0, 100)}`);
        client.emit('room:error', { message: 'Sanal makine kullanımı tespit edildi. Bu platform sanal makinelerden erişime kapalıdır.' });
        client.disconnect(true);
        return;
      }
    }

    // ─── DUPLICATE SESSION CHECK ────────────────────────────────
    // Çoklu giriş engelleme varsayılan olarak AÇIK (true). Admin panelinden kapatılabilir.
    // YENİ DAVRANIŞ: Mevcut oturum korunur, YENI giriş ENGELLENİR ve 3sn sonra atılır.
    // GodMaster bu kontrolden muaf.
    const multiLoginEnabled = sysSettings?.multiLoginBlock !== false;
    const isGodMaster = (user.role || '').toLowerCase() === 'godmaster';
    this.logger.log(`[MULTI-LOGIN] Check: enabled=${multiLoginEnabled}, userId=${user.sub}, isGodMaster=${isGodMaster}`);

    if (multiLoginEnabled && !isGodMaster) {
      for (const [existingSocketId, existingParticipant] of this.participants.entries()) {
        if (existingParticipant.userId === user.sub && existingSocketId !== client.id) {
          this.logger.warn(
            `[ROOM SWITCH] User ${user.sub} (${user.displayName}) joining new room — disconnecting old socket ${existingSocketId} from ${existingParticipant.roomSlug}`,
          );
          // Eski oturumu kapat — yeni oturum devam etsin (oda değiştirme desteklenir)
          const oldSocket = this.server.sockets.sockets.get(existingSocketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }
          this.participants.delete(existingSocketId);
          break;
        }
      }
    } // end multiLoginBlock

    // ─── ROOM SWITCH CLEANUP ─────────────────────────────────────
    // If this socket was already in another room, clean up the old room first
    const oldParticipant = this.participants.get(client.id);
    if (oldParticipant && oldParticipant.roomId !== scopedRoom) {
      // Preserve GodMaster visibility across room switches
      if (oldParticipant.role?.toLowerCase() === 'godmaster' && oldParticipant.visibilityMode) {
        this.godmasterVisibility.set(oldParticipant.userId, oldParticipant.visibilityMode);
      }

      // Release mic if this user was the speaker in the old room
      this.autoReleaseSpeaker(oldParticipant.roomId, client.id);

      // ★ DUEL AUTO-FORFEIT on room switch
      this.autoDuelForfeit(oldParticipant.roomId, oldParticipant.userId, oldParticipant.displayName, 'room_switch');

      // Notify old room that this user left
      this.server.to(oldParticipant.roomId).emit('room:participant-left', {
        userId: oldParticipant.userId,
        socketId: client.id,
      });

      // Leave the old Socket.IO room
      client.leave(oldParticipant.roomId);

      // Remove old participant entry
      this.participants.delete(client.id);

      // ★ Eski oda boşsa mesaj temizleme zamanla (5dk TTL)
      const oldRoomStillHasUsers = Array.from(this.participants.values()).some(p => p.roomId === oldParticipant.roomId);
      if (!oldRoomStillHasUsers) {
        this.scheduleRoomMessageCleanup(oldParticipant.roomId, oldParticipant.roomSlug);
      }

      // Broadcast updated counts for old room's tenant
      this.broadcastRoomCounts(oldParticipant.tenantId);

      this.logger.log(
        `[ROOM SWITCH] ${oldParticipant.displayName} left ${oldParticipant.roomSlug} → joining ${roomId}`,
      );
    }

    // ★ ZOMBIE CLEANUP — Aynı userId'li eski socket'leri temizle (F5/refresh durumu)
    const currentUserId = participant.userId || participant.guestId;
    if (currentUserId) {
      const staleEntries: string[] = [];
      this.participants.forEach((p, sid) => {
        if (sid !== client.id && (p.userId === currentUserId || p.guestId === currentUserId) && p.roomId === scopedRoom) {
          staleEntries.push(sid);
        }
      });
      for (const staleSid of staleEntries) {
        // Release mic if zombie was speaking
        this.autoReleaseSpeaker(scopedRoom, staleSid);
        // Disconnect old socket
        const staleSocket = this.server.sockets.sockets.get(staleSid);
        if (staleSocket) {
          staleSocket.leave(scopedRoom);
          staleSocket.disconnect(true);
        }
        this.participants.delete(staleSid);
        this.logger.log(`[ZOMBIE CLEANUP] Removed stale socket ${staleSid} for user ${currentUserId}`);
      }
    }

    this.participants.set(client.id, participant);
    (participant as any)._joinedAt = Date.now(); // ZOMBIE SWEEP grace period için
    // ★ REDIS SYNC — Participant'ı Redis'e yaz (cluster sync + restart kalıcılığı)
    this.syncParticipantToRedis(client.id, participant);

    // ★ SOFT BAN — mark participant as banned if soft ban applies
    if (softBanInfo) {
      participant.isBanned = true;
    }

    // *** KRİTİK: Socket.IO adapter room'una katıl ***
    client.join(scopedRoom);

    // ★ Yeni odaya katılırken bekleyen temizleme timer'ını iptal et
    this.cancelRoomMessageCleanup(scopedRoom);

    this.logger.log(
      `[Room Join Debug] Socket: ${client.id} | UserID: ${participant.userId} | GuestID: ${participant.guestId} | Role: ${participant.role} | Room: ${scopedRoom} | isBanned: ${participant.isBanned || false}`,
    );

    // ★ Emit soft ban info to client AFTER joining (so they see the room in restricted mode)
    if (softBanInfo) {
      client.emit('room:banned', {
        reason: softBanInfo.reason,
        expiresAt: softBanInfo.expiresAt,
        banLevel: 'soft',
      });
    }

    // Notify others in the room (stealth users are not announced)
    if (!initialStealth) {
      client.to(scopedRoom).emit('room:participant-joined', {
        userId: participant.userId,
        displayName: participant.displayName,
        avatar: participant.avatar,
        role: participant.role,
        socketId: participant.socketId,
        isBanned: participant.isBanned || false,
        isMuted: participant.isMuted || false,
        isGagged: participant.isGagged || false,
        isCamBlocked: participant.isCamBlocked || false,
        status: participant.status || 'online',
      });
    }

    // Get participants (filtered for this viewer's role) — roomSlug bazlı, tenantId uyumsuzluğuna dayanıklı
    const roomParticipants = this.getRoomParticipantsMultiTenant(
      canonicalRoom?.slug || roomId,
      participant.userId,
      participant.role,
    );

    this.logger.log(
      `${participant.displayName} joined room "${roomId}" (${roomParticipants.length} visible, stealth=${participant.isStealth}) | participantMap has clientId=${this.participants.has(client.id)} | roomId=${scopedRoom} | roomParticipants=${roomParticipants.map(p => `${p.displayName}(userId=${p.userId},stealth=${p.isStealth},roomId=${p.roomId})`).join(', ')}`,
    );

    // Send room data back to the joining client
    // ★ PERFORMANCE: All DB queries run in PARALLEL (not sequential)
    const inMemoryCounts: Record<string, number> = {};
    this.participants.forEach(p => {
      if (p.tenantId === tenantId) {
        inMemoryCounts[p.roomSlug] = (inMemoryCounts[p.roomSlug] || 0) + 1;
      }
    });

    const [messagesResult, roomsResult, themeResult, roomSettingsResult] = await Promise.all([
      // 1) ★ Messages — bellekten al, AMA sadece daha önce bu odada olanlara göster
      (() => {
        const userId = participant.userId || participant.guestId || '';
        const seen = this.roomUserSeen.get(scopedRoom);
        const isReturningUser = seen?.has(userId) || false;
        if (isReturningUser) {
          // Geri dönen kullanıcı — mesajları göster
          return Promise.resolve(this.roomMessages.get(scopedRoom) || []);
        }
        // Yeni katılan — boş chat göster, kullanıcıyı "görmüş" olarak işaretle
        if (!this.roomUserSeen.has(scopedRoom)) {
          this.roomUserSeen.set(scopedRoom, new Set());
        }
        this.roomUserSeen.get(scopedRoom)!.add(userId);
        return Promise.resolve([]);
      })(),
      // 2) Room list
      this.roomService.findAll(user.tenantId).then(dbRooms =>
        dbRooms.map((r: any) => ({
          id: r.id, name: r.name, slug: r.slug, status: r.status,
          isLocked: r.isLocked, isVipRoom: r.isVipRoom, isMeetingRoom: r.isMeetingRoom,
          participantCount: inMemoryCounts[r.slug] || 0,
          buttonColor: r.buttonColor || null,
        }))
      ).catch(e => {
        this.logger.warn(`Could not load rooms for tenant: ${e.message}`);
        return [] as any[];
      }),
      // 3) Theme settings
      this.adminService.getSettings(user.tenantId).catch(e => {
        this.logger.warn(`Could not load theme settings: ${e.message}`);
        return null;
      }),
      // 4) Current room settings
      this.roomService.findBySlug(user.tenantId, roomId).then(currentRoom => {
        if (!currentRoom) return null;
        return {
          roomId: currentRoom.id, name: currentRoom.name,
          announcement: currentRoom.announcement || null,
          isLocked: currentRoom.isLocked, isPublic: currentRoom.isPublic,
          isVipRoom: currentRoom.isVipRoom, isMeetingRoom: currentRoom.isMeetingRoom,
          isCameraAllowed: currentRoom.isCameraAllowed,
          maxParticipants: currentRoom.maxParticipants,
          micLimit: currentRoom.micLimit, cameraLimit: currentRoom.cameraLimit,
          hasPassword: !!(currentRoom.password && currentRoom.password.trim()),
          themeId: currentRoom.themeId || null,
          metadata: currentRoom.metadata || null,
        };
      }).catch(e => {
        this.logger.warn(`Could not load room settings: ${e.message}`);
        return null;
      }),
    ]);

    const messages = messagesResult;
    const allRooms = roomsResult;
    const themeSettings = themeResult;
    const currentRoomSettings = roomSettingsResult;

    client.emit('room:joined', {
      messages,
      participants: roomParticipants.map((p) => {
        const isSelf = p.userId === participant.userId;
        const viewerIsGodMaster = participant.role?.toLowerCase() === 'godmaster';

        // GodMaster disguised mode: mask appearance
        const isDisguised = p.role?.toLowerCase() === 'godmaster' && p.visibilityMode === 'disguised';
        // Self sees disguised appearance too (for visual confirmation), but keeps real role for controls
        const showDisguisedAppearance = isDisguised && (isSelf || !viewerIsGodMaster);
        const showDisguisedRole = isDisguised && !isSelf && !viewerIsGodMaster;

        return {
          id: p.socketId,
          userId: p.userId,
          displayName: (showDisguisedAppearance || showDisguisedRole) ? (p.disguisedName || 'Misafir') : p.displayName,
          avatar: (showDisguisedAppearance || showDisguisedRole) ? `/avatars/neutral_1.png` : p.avatar,
          role: showDisguisedRole ? 'guest' : p.role,
          socketId: p.socketId,
          isMuted: p.isMuted,
          isGagged: p.isGagged,
          isCamBlocked: p.isCamBlocked,
          isBanned: p.isBanned,
          isStealth: p.isStealth,
          status: p.status,
          visibilityMode: (isSelf || viewerIsGodMaster) ? p.visibilityMode : undefined,
        };
      }),
      rooms: allRooms,
      roomSettings: currentRoomSettings,
      theme: themeSettings ? {
        theme: themeSettings.theme || 'midnight',
        primaryColor: themeSettings.primaryColor || '#6366F1',
        accentColor: themeSettings.accentColor || '#A855F7',
        backgroundImage: themeSettings.backgroundImage || null,
      } : null,
      systemSettings: sysSettings ? (() => {
        const { id: _id, tenantId: _tid, createdAt: _ca, updatedAt: _ua, tenant, ...rest } = sysSettings;
        return {
          ...rest,
          packageType: tenant?.packageType || 'CAMERA',
          tenantDisplayName: tenant?.displayName || tenant?.name || null,
          tenantLogoUrl: tenant?.logoUrl || null,
          tenantSlug: tenant?.slug || null,
        };
      })() : null,
      userPermissions: user.permissions || null,
      tenantId: effectiveTenantId,
    });

    // ★ BROADCAST: Yeni katılan dahil tüm odadaki kullanıcılara güncel listeyi gönder
    this._doBroadcastParticipants(scopedRoom);

    // ★ GÜNLÜK GİRİŞ TAKİBİ — lastLoginAt güncelle (bonus 3. bölümde verilir)
    if (participant.userId && !participant.userId.startsWith('guest_')) {
      try {
        await this.prisma.user.update({
          where: { id: participant.userId },
          data: { lastLoginAt: new Date() },
        });
      } catch (e) {
        this.logger.warn(`[LOGIN TRACK] Error for ${participant.userId}: ${e.message}`);
      }
    }

    // ★ FIRE-AND-FORGET: DB profil güncellemesi (join'i bloklamaz)
    deferredDbRefresh();

    // ★ TV YOUTUBE SYNC — Aktif YouTube yayını varsa yeni katılana gönder
    const activeYoutube = this.roomYoutubeUrls.get(scopedRoom);
    if (activeYoutube) {
      client.emit('tv:youtubeUpdate', { url: activeYoutube.url, setBy: activeYoutube.setBy, setByLevel: activeYoutube.setByLevel || 5 });
      this.logger.log(`📺 TV YouTube synced to ${participant.displayName}: ${activeYoutube.url}`);
    }

    // ★ SPEAKER SYNC — Aktif konuşmacı varsa yeni katılana gönder
    const activeSpeaker = this.roomSpeakers.get(scopedRoom);
    if (activeSpeaker) {
      // ★ F5 FIX — Eğer yeni bağlanan kullanıcı KENDİSİ speaker ise, release et.
      // F5 = yeni socket = eski audio stream kayıp. Tekrar mic vermek zombi konuşmacı yaratır.
      if (activeSpeaker.userId === participant.userId) {
        this.logger.log(`🎤 F5 detected: ${participant.displayName} was speaker, releasing mic`);
        this.releaseSpeaker(scopedRoom, 'disconnected');
      } else {
        client.emit('mic:acquired', {
          userId: activeSpeaker.userId,
          displayName: activeSpeaker.displayName,
          socketId: activeSpeaker.socketId,
          role: activeSpeaker.role,
          startedAt: activeSpeaker.startedAt,
          duration: activeSpeaker.duration,
        });
        this.logger.log(`🎤 Speaker synced to ${participant.displayName}: ${activeSpeaker.displayName}`);
      }
    }

    // ★ MIC QUEUE SYNC — Mevcut sıra varsa yeni katılana gönder
    const currentQueue = this.micQueues.get(scopedRoom);
    if (currentQueue && currentQueue.length > 0) {
      client.emit('mic:queue-updated', currentQueue);
      this.logger.log(`📋 Mic queue synced to ${participant.displayName}: ${currentQueue.length} in queue`);
    }

    // ★ CHAT LOCK SYNC — Sohbet kilitliyse yeni katılana bildir
    if (this.roomChatLocks.has(scopedRoom)) {
      client.emit('room:chat-lock', { locked: true });
    }

    // ─── WELCOME MESSAGE ──────────────────────────────────────
    // Frontend banner zaten welcomeMessage gösteriyor, çift mesaj olmasın
    // if (sysSettings?.welcomeMessage) {
    //   client.emit('chat:message', {
    //     id: `sys_welcome_${Date.now()}`,
    //     content: sysSettings.welcomeMessage,
    //     sender: 'system',
    //     senderName: '🎉 Sistem',
    //     senderAvatar: null,
    //     type: 'SYSTEM',
    //     createdAt: new Date().toISOString(),
    //   });
    // }

    // (Oda giriş bonusu kaldırıldı — günlük bonus tek noktadan yönetiliyor)

    // ★ DUEL SYNC — Aktif düello varsa yeni katılana gönder (pending hariç)
    const activeDuel = this.activeDuels.get(scopedRoom);
    if (activeDuel && (activeDuel.status === 'active' || activeDuel.status === 'voting')) {
      const remaining = activeDuel.status === 'active'
        ? Math.max(0, Math.round((activeDuel.duration - (Date.now() - activeDuel.startedAt)) / 1000))
        : 0;

      // Önce düello başladı event'i gönder
      client.emit('duel:started', {
        duelId: activeDuel.id,
        challengerId: activeDuel.challengerId,
        challengerName: activeDuel.challengerName,
        challengerAvatar: activeDuel.challengerAvatar,
        opponentId: activeDuel.opponentId,
        opponentName: activeDuel.opponentName,
        opponentAvatar: activeDuel.opponentAvatar,
        duration: activeDuel.duration / 1000,
      });

      // Mevcut durum
      if (activeDuel.status === 'active') {
        client.emit('duel:tick', { remaining, duelId: activeDuel.id });
        client.emit('duel:reaction-update', { duelId: activeDuel.id, reactions: activeDuel.reactions });
      } else if (activeDuel.status === 'voting') {
        client.emit('duel:voting-phase', {
          duelId: activeDuel.id,
          challengerId: activeDuel.challengerId,
          challengerName: activeDuel.challengerName,
          challengerAvatar: activeDuel.challengerAvatar,
          opponentId: activeDuel.opponentId,
          opponentName: activeDuel.opponentName,
          opponentAvatar: activeDuel.opponentAvatar,
          reactions: activeDuel.reactions,
          votingDuration: 15,
        });
      }
    }

    // Broadcast full participant list to ALL existing users in the room
    // so everyone instantly sees the newly joined user (with proper role-based filtering)
    // ★ CRITICAL: Use scopedRoom (tenant:slug) not raw roomId (slug) — participants use scoped IDs
    // ★ DIRECT CALL (no debounce) — join sırasında debounce timing sorunu yaratıyor,
    //   diğer kullanıcılar yeni katılanı göremiyordu
    const adapterRoom = this.server?.sockets?.adapter?.rooms?.get(scopedRoom);
    this.logger.log(
      `[JOIN BROADCAST] scopedRoom=${scopedRoom} | adapterRoom.size=${adapterRoom?.size || 0} | participantsInRoom=${Array.from(this.participants.values()).filter(p => p.roomId === scopedRoom).length}`,
    );
    this._doBroadcastParticipants(scopedRoom);

    // ★ SAFETY RETRY — 300ms sonra tekrar broadcast (race condition'ları yakalar)
    setTimeout(() => {
      if (this.participants.has(client.id)) {
        this._doBroadcastParticipants(scopedRoom);
      }
    }, 300);

    // Broadcast updated room counts to all tenant clients
    if (user?.tenantId) {
      this.broadcastRoomCounts(user.tenantId);
    }

    // ─── PAYMENT REMINDER (only for owner/admin, 7 gün expire) ──────────────────
    if (user?.tenantId && (participant.role === 'owner' || participant.role === 'admin')) {
      try {
        const tenantData = await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { paymentReminderAt: true, name: true },
        });
        if (tenantData?.paymentReminderAt) {
          const reminderAge = Date.now() - new Date(tenantData.paymentReminderAt).getTime();
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (reminderAge < TWENTY_FOUR_HOURS) {
            client.emit('payment:reminder', {
              tenantName: tenantData.name,
              message: `Sayın ${tenantData.name}, ödeme süreniz yaklaşmaktadır. Lütfen ödemenizi gerçekleştiriniz.`,
              sentAt: tenantData.paymentReminderAt.toISOString(),
            });
          }
        }
      } catch (e) {
        this.logger.warn(`Could not check payment reminder: ${e.message}`);
      }
    }

    // ─── TENANT ANNOUNCEMENT (son 24 saat, owner/admin/superadmin) ──────────────────
    if (['owner', 'admin', 'superadmin'].includes(participant.role || '')) {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const latestAnnouncement = await this.prisma.announcement.findFirst({
          where: { createdAt: { gte: twentyFourHoursAgo } },
          orderBy: { createdAt: 'desc' },
        });
        if (latestAnnouncement) {
          client.emit('tenant:announcement', {
            id: latestAnnouncement.id,
            message: latestAnnouncement.message,
            createdAt: latestAnnouncement.createdAt.toISOString(),
          });
        }
      } catch (e) {
        this.logger.warn(`Could not load announcement: ${e.message}`);
      }
    }

    // ─── GÜNLÜK BONUS & VIP HAFTALIK BONUS ──────────────────
    if (user.sub && !user.sub.startsWith('guest_')) {
      try {
        const userRole = (participant.role || 'guest').toLowerCase();
        const isMember = ['member', 'vip', 'operator', 'moderator', 'admin', 'superadmin', 'owner', 'godmaster'].includes(userRole);
        const isVip = userRole === 'vip' || getRoleLevel(userRole) >= getRoleLevel('vip');

        if (isMember) {
          const now = new Date();
          const dbUserBonus = await this.prisma.user.findUnique({
            where: { id: user.sub },
            select: { lastDailyBonus: true, lastVipBonus: true, balance: true },
          });

          // Günlük bonus
          const lastDaily = dbUserBonus?.lastDailyBonus;
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (!lastDaily || (now.getTime() - new Date(lastDaily).getTime()) >= oneDayMs) {
            const dailyAmount = isVip
              ? (sysSettings?.dailyBonusVip || 100)
              : (sysSettings?.dailyBonusMember || 50);

            await this.prisma.user.update({
              where: { id: user.sub },
              data: {
                balance: { increment: dailyAmount },
                lastDailyBonus: now,
              },
            });

            const updatedUser = await this.prisma.user.findUnique({
              where: { id: user.sub },
              select: { balance: true, points: true },
            });

            client.emit('gift:balance', {
              balance: Number(updatedUser?.balance || 0),
              points: updatedUser?.points || 0,
            });

            client.emit('dailyBonus:received', {
              amount: dailyAmount,
              type: 'daily',
              message: `🎁 Günlük bonus: ${dailyAmount} jeton kazandınız!`,
            });

            this.logger.log(`[DAILY BONUS] ${participant.displayName}: +${dailyAmount} jeton`);
          }

          // VIP haftalık bonus
          if (isVip) {
            const lastVip = dbUserBonus?.lastVipBonus;
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            if (!lastVip || (now.getTime() - new Date(lastVip).getTime()) >= oneWeekMs) {
              const weeklyAmount = sysSettings?.vipWeeklyBonus || 500;

              await this.prisma.user.update({
                where: { id: user.sub },
                data: {
                  balance: { increment: weeklyAmount },
                  lastVipBonus: now,
                },
              });

              const updatedUser2 = await this.prisma.user.findUnique({
                where: { id: user.sub },
                select: { balance: true, points: true },
              });

              client.emit('gift:balance', {
                balance: Number(updatedUser2?.balance || 0),
                points: updatedUser2?.points || 0,
              });

              client.emit('dailyBonus:received', {
                amount: weeklyAmount,
                type: 'vipWeekly',
                message: `⭐ VIP haftalık bonus: ${weeklyAmount} jeton kazandınız!`,
              });

              this.logger.log(`[VIP WEEKLY BONUS] ${participant.displayName}: +${weeklyAmount} jeton`);
            }
          }
        }
      } catch (e) {
        this.logger.warn(`[BONUS] Error processing bonus for ${user.sub}: ${e.message}`);
      }
    }
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; content: string; type?: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    // ★ REDIS RATE LIMIT — chat:message (max 15/10sn)
    const chatAllowed = await this.checkSocketRateLimit(user.sub, 'chat:message', 15, 10);
    if (!chatAllowed) {
      client.emit('room:toast', { type: 'error', title: 'Rate Limit', message: 'Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.' });
      return;
    }

    // ★ BAN CHECK — Banlı kullanıcılar mesaj atamaz
    const msgSender = this.participants.get(client.id);
    if (msgSender?.isBanned) {
      client.emit('room:toast', { type: 'error', title: 'Yasak', message: 'Yasaklı olduğunuz için mesaj gönderemezsiniz.' });
      return;
    }

    // Check if chat is locked (Owner/Admin bypass)
    if (this.roomChatLocks.has(payload.roomId)) {
      const roleLevel = getRoleLevel(user.role || 'guest');
      if (roleLevel < ROLE_HIERARCHY['admin']) {
        client.emit('room:toast', { type: 'error', title: 'Sohbet Kilitli', message: 'Sohbet şu anda kilitli.' });
        return;
      }
    }

    // ─── ANTI-FLOOD CHECK ──────────────────────────────────
    let settings = this.tenantSettings.get(user.tenantId);
    if (!settings) {
      try { settings = await this.loadTenantSettings(user.tenantId); } catch (_) { }
    }
    if (settings?.antiFlood) {
      const now = Date.now();
      const limit = settings.antiFloodLimit || 5;
      const windowMs = 10_000; // 10 saniye penceresi
      const timestamps = this.floodTracker.get(client.id) || [];
      // Eski kayıtları temizle
      const recent = timestamps.filter(t => now - t < windowMs);
      if (recent.length >= limit) {
        client.emit('room:toast', { type: 'error', title: 'Anti-Flood', message: `Çok hızlı mesaj gönderiyorsunuz! ${limit} mesaj/${windowMs / 1000}sn limiti.` });
        this.floodTracker.set(client.id, recent);
        return;
      }
      recent.push(now);
      this.floodTracker.set(client.id, recent);
    }

    // ─── WORD FILTER ──────────────────────────────────────
    let filteredContent = payload.content;
    try {
      filteredContent = await this.adminService.filterMessage(user.tenantId, payload.content);
    } catch (e) {
      this.logger.warn(`Word filter error: ${e.message}`);
    }

    // ─── HTML COLOR BLOCKING ──────────────────────────────
    if (settings?.blockHtmlColors) {
      // Strip <font color="..."> tags, style="color:" attributes, etc.
      filteredContent = filteredContent
        .replace(/<font[^>]*color[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        .replace(/style\s*=\s*"[^"]*color[^"]*"/gi, '')
        .replace(/style\s*=\s*'[^']*color[^']*'/gi, '');
    }

    // Try to persist to DB (may fail if room doesn't exist in DB)
    // ★ Guest kullanıcılar için DB kaydetme ATLANIYOR (User tablosunda kayıtlı değiller → FK hatası)
    let message: any = null;
    const isGuestUser = user.sub?.startsWith('guest_');
    if (isGuestUser) {
      // Guest mesajları DB'ye kaydedilmez — sadece bellekte anlık yayınlanır
      message = {
        id: `msg_${Date.now()}`,
        content: filteredContent,
        sender: user.sub,
        type: payload.type || 'TEXT',
        createdAt: new Date().toISOString(),
      };
    } else {
      try {
        // ★ Slug → DB Room ID çözümle (Message.roomId FK olarak Room.id referans eder)
        const sender = this.participants.get(client.id);
        const tenantIdForRoom = sender?.tenantId || user.tenantId;
        const dbRoom = await this.prisma.room.findFirst({
          where: { tenantId: tenantIdForRoom, slug: payload.roomId },
          select: { id: true },
        });
        const dbRoomId = dbRoom?.id || payload.roomId;

        message = await this.chatService.sendMessage(
          dbRoomId,
          user.sub,
          filteredContent,
          // @ts-ignore
          payload.type || 'TEXT',
        );
      } catch (e) {
        // If DB save fails, create a transient message object
        this.logger.warn(
          `Could not persist message for room "${payload.roomId}": ${e.message}`,
        );
        message = {
          id: `msg_${Date.now()}`,
          content: filteredContent,
          sender: user.sub,
          type: payload.type || 'TEXT',
          createdAt: new Date().toISOString(),
        };
      }
    }

    // Broadcast to room (including sender)
    // Use participant's scoped roomId for tenant isolation
    const sender = this.participants.get(client.id);
    const broadcastTarget = sender?.roomId || payload.roomId;
    const fullMessage = {
      ...message,
      sender: user.sub, // userId — frontend isMe kontrolü için
      senderName: sender?.displayName || user.displayName || user.username,
      senderAvatar: sender?.avatar || user.avatar || null,
      senderNameColor: sender?.nameColor || (user as any).nameColor || null,
    };

    // ★ Belleğe ekle — oda değişiminde mesajlar korunur
    if (!this.roomMessages.has(broadcastTarget)) {
      this.roomMessages.set(broadcastTarget, []);
    }
    const roomMsgs = this.roomMessages.get(broadcastTarget)!;
    roomMsgs.push(fullMessage);
    // FIFO: max mesaj sınırını aş→ eskisini sil
    if (roomMsgs.length > this.MAX_ROOM_MESSAGES) {
      roomMsgs.shift();
    }
    // ★ REDIS SYNC — Mesajı Redis'e de kaydet (son 100, cluster sync)
    this.syncChatMessageToRedis(broadcastTarget, fullMessage);

    // ★ Mesajı gören herkesi "görmüş" olarak işaretle — oda değiştirip geri dönerlerse mesajları görür
    if (!this.roomUserSeen.has(broadcastTarget)) {
      this.roomUserSeen.set(broadcastTarget, new Set());
    }
    const seenSet = this.roomUserSeen.get(broadcastTarget)!;
    this.participants.forEach(p => {
      if (p.roomId === broadcastTarget) {
        seenSet.add(p.userId || p.guestId || '');
      }
    });

    this.server.to(broadcastTarget).emit('chat:message', fullMessage);
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; isTyping: boolean },
  ) {
    client.to(payload.roomId).emit('chat:typing', {
      userId: client.data.user?.sub,
      isTyping: payload.isTyping,
    });
  }

  // ═══════════ Message Reactions ═══════════
  @SubscribeMessage('chat:addReaction')
  handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    const actor = this.participants.get(client.id);
    if (!actor) return;

    const roomId = actor.roomId;
    if (!roomId) return;

    const username = actor.displayName || user.username || 'Anonim';
    this.server.to(roomId).emit('chat:reactionUpdate', {
      messageId: data.messageId,
      emoji: data.emoji,
      username,
      action: 'toggle',
    });
  }

  // ═══════════ Status / Stealth Toggle ═══════════
  @SubscribeMessage('status:change')
  handleStatusChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { status: string; disguiseName?: string },
  ) {
    const participant = this.participants.get(client.id);
    this.logger.log(`[status:change] socket=${client.id} | status=${payload.status} | participant=${participant ? participant.displayName : 'NOT FOUND'}`);
    if (!participant) return;

    const newStatus = payload.status;
    const isGodMaster = participant.role?.toLowerCase() === 'godmaster';

    // ═══ GodMaster Visibility Modes ═══
    if (newStatus === 'godmaster-visible' || newStatus === 'godmaster-disguised' || newStatus === 'godmaster-hidden') {
      if (!isGodMaster) {
        client.emit('room:error', { message: 'Bu özellik sadece GodMaster için.' });
        return;
      }

      if (newStatus === 'godmaster-visible') {
        participant.visibilityMode = 'visible';
        this.godmasterVisibility.set(participant.userId, 'visible');
        participant.disguisedName = undefined;
        participant.isStealth = false;
        participant.status = 'online';
        this.logger.log(`[GodMaster] ${participant.displayName} → VISIBLE as GodMaster`);
      } else if (newStatus === 'godmaster-disguised') {
        participant.visibilityMode = 'disguised';
        this.godmasterVisibility.set(participant.userId, 'disguised');
        participant.disguisedName = payload.disguiseName || 'Misafir';
        participant.isStealth = false;
        participant.status = 'online';
        this.logger.log(`[GodMaster] ${participant.displayName} → DISGUISED as "${participant.disguisedName}"`);
      } else {
        participant.visibilityMode = 'hidden';
        this.godmasterVisibility.set(participant.userId, 'hidden');
        participant.disguisedName = undefined;
        participant.isStealth = true;
        participant.status = 'stealth';
        this.logger.log(`[GodMaster] ${participant.displayName} → HIDDEN`);
      }

      // ★ Role-aware broadcast: hidden/visible geçişleri anlık yansıtılır
      this.participants.forEach((viewer, socketId) => {
        if (viewer.roomId !== participant.roomId) return;
        const isSelf = viewer.userId === participant.userId;
        const isViewerGodMaster = viewer.role?.toLowerCase() === 'godmaster';

        if (isSelf || isViewerGodMaster) {
          // Self ve GodMaster: tam status update
          this.server.to(socketId).emit('user-status-changed', {
            userId: participant.userId,
            status: participant.status,
            isInvisible: participant.visibilityMode === 'hidden',
          });
        } else if (participant.visibilityMode === 'hidden') {
          // Gizli moda geçiş: düşük seviye kullanıcılar → anında kaldır
          this.server.to(socketId).emit('room:participant-left', {
            userId: participant.userId,
            socketId: participant.socketId,
          });
        } else {
          // Görünür/disguised moda geçiş: düşük seviye kullanıcılar → anında ekle
          this.server.to(socketId).emit('room:participant-joined', {
            userId: participant.userId,
            displayName: participant.visibilityMode === 'disguised'
              ? (participant.disguisedName || 'Misafir')
              : participant.displayName,
            avatar: participant.visibilityMode === 'disguised'
              ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${participant.disguisedName || 'guest'}`
              : participant.avatar,
            role: participant.visibilityMode === 'disguised' ? 'guest' : participant.role,
            socketId: participant.socketId,
            isStealth: false,
            status: participant.status,
            nameColor: participant.visibilityMode === 'disguised' ? undefined : participant.nameColor,
            platform: participant.platform || 'web',
          });
        }
      });
      this._doBroadcastParticipants(participant.roomId);
      return;
    }

    // ═══ Normal Stealth Toggle ═══
    const isStealth = newStatus === 'stealth';

    // Permission veya VIP+ ile stealth izni kontrolü
    const user = client.data.user;
    const hasStealthPerm = user?.permissions?.['self.stealth'] === true;
    if (isStealth && !hasStealthPerm && getRoleLevel(participant.role) < VIP_LEVEL) {
      client.emit('room:error', {
        message: 'Görünmezlik yetkisi gerekiyor',
      });
      return;
    }

    participant.status = newStatus;
    participant.isStealth = isStealth;

    this.logger.log(
      `${participant.displayName} changed status to ${newStatus} (stealth=${isStealth})`,
    );

    // ★ Role-aware broadcast: stealth → düşük seviye kullanıcılara 'participant-left' gönder
    const targetLevel = getRoleLevel(participant.role);
    this.participants.forEach((viewer, socketId) => {
      if (viewer.roomId !== participant.roomId) return;
      const viewerLevel = getRoleLevel(viewer.role);
      const isSelf = viewer.userId === participant.userId;
      const isViewerGodMaster = viewer.role?.toLowerCase() === 'godmaster';

      if (isSelf || isViewerGodMaster || viewerLevel >= targetLevel) {
        // Self, GodMaster ve eşit/üst seviye roller: status update gönder
        this.server.to(socketId).emit('user-status-changed', {
          userId: participant.userId,
          status: newStatus,
          isInvisible: isStealth,
        });
      } else if (isStealth) {
        // Düşük seviye kullanıcılar: stealth olduğunda anında 'left' sinyali
        this.server.to(socketId).emit('room:participant-left', {
          userId: participant.userId,
          socketId: participant.socketId,
        });
        this.logger.log(`[stealth] Sent participant-left to ${viewer.displayName} for ${participant.displayName}`);
      } else {
        // Stealth'ten çıkış: participant-joined sinyali
        this.server.to(socketId).emit('room:participant-joined', {
          userId: participant.userId,
          displayName: participant.displayName,
          avatar: participant.avatar,
          role: participant.role,
          socketId: participant.socketId,
          isStealth: false,
          status: newStatus,
          nameColor: participant.nameColor,
          platform: participant.platform || 'web',
        });
        this.logger.log(`[stealth] Sent participant-joined to ${viewer.displayName} for ${participant.displayName}`);
      }
    });

    // Re-broadcast participant list to everyone in the room
    // Each viewer gets a filtered list based on their role
    this._doBroadcastParticipants(participant.roomId);
  }

  // ═══════════ Change Display Name ═══════════
  @SubscribeMessage('status:change-name')
  async handleChangeName(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { newName: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    const newName = payload.newName?.trim();
    if (!newName || newName.length < 2 || newName.length > 20) {
      client.emit('room:error', {
        message: 'İsim 2-20 karakter arasında olmalıdır.',
      });
      return;
    }

    const oldName = participant.displayName;
    participant.displayName = newName;

    // Also update client.data.user for future messages
    if (client.data.user) {
      client.data.user.displayName = newName;
      client.data.user.username = newName;
    }

    this.logger.log(
      `Temporary name change: "${oldName}" → "${newName}" in ${participant.roomId}`,
    );

    // Notify the user
    client.emit('room:name-changed', { oldName, newName });

    // ★ Session update — frontend sessionStorage/state'ini güncelle
    client.emit('auth:session-update', { displayName: newName });

    // Persist name change to DB (non-guest users only)
    try {
      if (participant.userId && !participant.userId.startsWith('guest_')) {
        await this.authService.updateProfile(
          { sub: participant.userId, role: participant.role },
          { displayName: newName } as any,
        );

        // Owner/admin profil değişikliğini sistem admin paneline bildir
        if (['owner', 'admin'].includes(participant.role)) {
          const allSockets = await this.server.fetchSockets();
          for (const s of allSockets) {
            const u = (s as any).data?.user;
            if (u && u.tenantId === participant.tenantId) {
              s.emit('tenant:ownerProfileUpdated', {
                tenantId: participant.tenantId,
                displayName: newName,
              });
            }
          }
        }
      }
    } catch (e) {
      this.logger.error(`Failed to persist name change for ${participant.userId}: ${e.message}`);
    }

    // Broadcast updated participant list
    this._doBroadcastParticipants(participant.roomId);
  }

  // ═══════════ Profile Update (Hesap Paneli → Room sync) ═══════════
  // Bu event, Hesap Paneli'nde avatar/isim değişikliği yapıldığında
  // useSocket.ts tarafından otomatik olarak emit edilir.
  @SubscribeMessage('user:profileUpdate')
  async handleProfileUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { displayName?: string; avatar?: string; nameColor?: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    let changed = false;

    if (payload.avatar?.trim() && payload.avatar !== participant.avatar) {
      participant.avatar = payload.avatar.trim();
      if (client.data.user) client.data.user.avatar = payload.avatar.trim();
      changed = true;
    }

    if (payload.displayName?.trim() && payload.displayName !== participant.displayName) {
      participant.displayName = payload.displayName.trim();
      if (client.data.user) client.data.user.displayName = payload.displayName.trim();
      changed = true;
    }

    if (payload.nameColor !== undefined && payload.nameColor !== participant.nameColor) {
      participant.nameColor = payload.nameColor || null;
      if (client.data.user) client.data.user.nameColor = payload.nameColor || null;
      changed = true;
    }

    if (changed) {
      this.logger.log(
        `[profileUpdate] ${participant.displayName} updated profile (avatar=${!!payload.avatar}, name=${!!payload.displayName})`,
      );
      this._doBroadcastParticipants(participant.roomId);
    }
  }

  // ═══════════ Change Avatar ═══════════
  @SubscribeMessage('status:change-avatar')
  async handleChangeAvatar(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { avatar: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    const avatar = payload.avatar?.trim();
    if (!avatar) return;

    participant.avatar = avatar;
    if (client.data.user) {
      client.data.user.avatar = avatar;
    }

    this.logger.log(`Avatar change: ${participant.displayName} in ${participant.roomId}`);

    try {
      if (participant.userId && !participant.userId.startsWith('guest_')) {
        await this.authService.updateProfile({ sub: participant.userId, role: participant.role }, { avatar: avatar });
      }
    } catch (e) {
      this.logger.error(`Failed to persist avatar change for ${participant.userId}: ${e.message}`);
    }

    this._doBroadcastParticipants(participant.roomId);
  }

  // ═══════════ Change Name Color ═══════════
  @SubscribeMessage('status:change-name-color')
  async handleChangeNameColor(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { color: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    const color = payload.color?.trim();
    if (!color) return;

    participant.nameColor = color;
    if (client.data.user) {
      client.data.user.nameColor = color;
    }

    this.logger.log(`Name color change: ${participant.displayName} → ${color}`);

    try {
      if (participant.userId && !participant.userId.startsWith('guest_')) {
        // Cast to any because nameColor isn't in the strict type yet
        await this.authService.updateProfile({ sub: participant.userId, role: participant.role }, { nameColor: color } as any);
      }
    } catch (e) {
      this.logger.error(`Failed to persist name color change for ${participant.userId}: ${e.message}`);
    }

    this._doBroadcastParticipants(participant.roomId);
  }

  // ═══════════ Change GodMaster Icon ═══════════
  @SubscribeMessage('status:change-godmaster-icon')
  async handleChangeGodmasterIcon(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { icon: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    if (participant.role?.toLowerCase() !== 'godmaster') {
      client.emit('room:error', { message: 'Bu özellik sadece GodMaster için.' });
      return;
    }

    const icon = payload.icon?.trim();
    if (!icon) return;

    participant.godmasterIcon = icon;

    this.logger.log(`GodMaster icon change: ${participant.displayName} → ${icon}`);

    this._doBroadcastParticipants(participant.roomId);
  }

  // ═══════════ Change Password ═══════════
  @SubscribeMessage('status:change-password')
  async handleChangePassword(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { oldPassword: string; newPassword: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    if (!payload.oldPassword || !payload.newPassword) {
      client.emit('room:error', { message: 'Eski ve yeni şifre gereklidir.' });
      return;
    }

    try {
      await this.authService.changePassword(participant.userId, payload.oldPassword, payload.newPassword);
      client.emit('room:toast', {
        type: 'success',
        title: 'Şifre Değiştirildi',
        message: 'Şifreniz başarıyla güncellendi.',
      });
      this.logger.log(`Password changed for user ${participant.displayName}`);
    } catch (e) {
      client.emit('room:error', { message: e.message || 'Şifre değiştirilemedi.' });
    }
  }

  // ═══════════ Admin User Action ═══════════
  @SubscribeMessage('admin:userAction')
  async handleAdminAction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { action: string; targetUserId: string; duration?: string; value?: boolean },
  ) {
    this.logger.log(`[handleAdminAction] RECEIVED — action=${payload.action}, targetUserId=${payload.targetUserId}, duration=${payload.duration}, from socketId=${client.id}`);
    const actor = this.participants.get(client.id);
    if (!actor) {
      this.logger.warn(`[handleAdminAction] ACTOR NOT FOUND in participants for socketId=${client.id}. Participants keys: ${[...this.participants.keys()].join(', ')}`);
      return;
    }
    this.logger.log(`[handleAdminAction] Actor found: ${actor.displayName} (${actor.role})`);

    // ★ BAN CHECK — Banlı kullanıcılar admin aksiyonu yapamaz ★
    if (actor.role?.toLowerCase() !== 'godmaster') {
      try {
        const activeBan = await this.adminService.checkActiveBan(actor.userId);
        if (activeBan) {
          client.emit('room:error', { message: 'Hesabınız yasaklanmış. İşlem yapamazsınız.' });
          this.logger.warn(`[handleAdminAction] BANNED actor ${actor.displayName} tried ${payload.action} — BLOCKED`);
          return;
        }
      } catch (e) {
        this.logger.error(`[handleAdminAction] Ban check error: ${e.message}`);
      }
    }

    // ─── Target-independent actions (don't need a live connected target) ───
    if (payload.action === 'clear_user_messages') {
      const minLevel = ACTION_MIN_LEVELS['clear_user_messages'];
      if (minLevel && getRoleLevel(actor.role) < minLevel) {
        client.emit('room:error', { message: 'Bu işlem için yetkiniz yok.' });
        return;
      }
      this.server.to(actor.roomId).emit('room:clear-user-messages', {
        userId: payload.targetUserId,
      });
      // ★ Backend'de de kullanıcı mesajlarını sil — F5'te geri gelmesin
      const existingMsgs = this.roomMessages.get(actor.roomId);
      if (existingMsgs) {
        const filtered = existingMsgs.filter((m: any) => m.sender !== payload.targetUserId && m.senderName !== payload.targetUserId);
        this.roomMessages.set(actor.roomId, filtered);
      }
      client.emit('room:toast', {
        type: 'success',
        title: 'Mesajlar',
        message: 'Kullanıcı mesajları temizlendi.',
      });
      this.logger.log(`[CLEAR MESSAGES] ${actor.displayName} cleared messages of ${payload.targetUserId} in ${actor.roomId}`);
      return;
    }

    if (payload.action === 'stop_messages_global') {
      const minLevel = ACTION_MIN_LEVELS['stop_messages_global'];
      if (minLevel && getRoleLevel(actor.role) < minLevel) {
        client.emit('room:error', { message: 'Bu işlem için yetkiniz yok.' });
        return;
      }
      const isLocked = this.roomChatLocks.has(actor.roomId);
      if (isLocked) {
        this.roomChatLocks.delete(actor.roomId);
      } else {
        this.roomChatLocks.add(actor.roomId);
      }
      this.server.to(actor.roomId).emit('room:chat-lock', {
        locked: !isLocked,
        by: actor.displayName,
      });
      client.emit('room:toast', {
        type: 'info',
        title: 'Sohbet',
        message: !isLocked ? 'Sohbet donduruldu.' : 'Sohbet açıldı.',
      });
      this.logger.log(`[CHAT LOCK] ${actor.displayName} ${!isLocked ? 'locked' : 'unlocked'} chat in ${actor.roomId}`);
      return;
    }

    if (payload.action === 'clear_chat_global') {
      const minLevel = ACTION_MIN_LEVELS['clear_chat_global'];
      if (minLevel && getRoleLevel(actor.role) < minLevel) {
        client.emit('room:error', { message: 'Bu işlem için yetkiniz yok.' });
        return;
      }
      this.server.to(actor.roomId).emit('room:chat-cleared', {
        by: actor.displayName,
      });
      // ★ Backend'de de tüm mesajları sil — F5'te geri gelmesin
      this.roomMessages.delete(actor.roomId);
      client.emit('room:toast', {
        type: 'success',
        title: 'Sohbet',
        message: 'Tüm mesajlar temizlendi.',
      });
      this.logger.log(`[CLEAR CHAT] ${actor.displayName} cleared all messages in ${actor.roomId}`);
      return;
    }

    // ─── Target-dependent actions (need a live connected target) ───
    // Find target participant
    let target: InMemoryParticipant | undefined;
    this.participants.forEach((p) => {
      if (
        p.userId === payload.targetUserId ||
        p.socketId === payload.targetUserId
      ) {
        target = p;
      }
    });

    if (!target) {
      // ★ SPECIAL CASE: Unban can work even if the user is disconnected (hard-banned users are kicked)
      if (payload.action === 'unban') {
        try {
          await this.adminService.removeAllActiveBansForUser(
            actor.userId,
            payload.targetUserId,
            actor.tenantId,
            client.handshake.address,
          );
          // ★ Kullanıcı odadaysa (farklı socketId ile) isBanned flag'ini temizle
          for (const [, p] of this.participants) {
            if (p.userId === payload.targetUserId) {
              p.isBanned = false;
            }
          }
          // ★ room:ban-lifted — hedef kullanıcının TÜM aktif socket'lerine gönder
          for (const [sid, p] of this.participants) {
            if (p.userId === payload.targetUserId) {
              this.server.to(sid).emit('room:ban-lifted', {
                message: 'Yasağınız kaldırıldı.',
              });
            }
          }
          // Broadcast to room so sidebar updates
          this.server.to(actor.roomId).emit('room:user-unbanned', {
            userId: payload.targetUserId,
          });
          this.server.to(actor.roomId).emit('room:notification', {
            type: 'info',
            message: 'Yasak kaldırıldı.',
          });
          client.emit('room:toast', {
            type: 'success',
            title: 'Yasak Kaldırıldı',
            message: 'Kullanıcının yasağı başarıyla kaldırıldı.',
          });
          this.logger.log(`[UNBAN-OFFLINE] ${actor.displayName} unbanned user ${payload.targetUserId}`);
          this._doBroadcastParticipants(actor.roomId);
        } catch (e) {
          this.logger.error(`Failed to unban user: ${e.message}`);
          client.emit('room:error', { message: 'Yasak kaldırma başarısız oldu.' });
        }
        return;
      }
      client.emit('room:error', { message: 'Target user not found' });
      return;
    }

    // Self-action bypass — aktör kendisine aksiyon uyguladığında role kontrolü atlanır
    const isSelfAction = actor.socketId === target.socketId || actor.userId === target.userId;

    // ★ Social actions — peer-to-peer, no role hierarchy needed
    const SOCIAL_ACTIONS = new Set(['invite_one2one', 'nudge', 'send_gift']);
    const isSocialAction = SOCIAL_ACTIONS.has(payload.action);

    if (!isSelfAction && !isSocialAction) {
      // ★ GODMASTER KORUMA BARİYERİ — Sadece başka GodMaster tarafından işlem uygulanabilir ★
      if (target.role?.toLowerCase() === 'godmaster' && actor.role?.toLowerCase() !== 'godmaster') {
        client.emit('room:error', { message: 'Bu kullanıcıya işlem uygulanamaz.' });
        this.logger.warn(`[GODMASTER PROTECTION] ${actor.displayName} tried ${payload.action} on GodMaster — BLOCKED`);
        return;
      }

      // Enforce role hierarchy: actor must outrank target (GodMaster bypasses)
      // Bireysel yetki ile verilmişse hiyerarşi kontrolünü bypass et
      const userPermKey = ACTION_TO_USER_PERM[payload.action];
      const hasIndividualPerm = userPermKey && actor.permissions?.[userPermKey] === true;
      if (actor.role?.toLowerCase() !== 'godmaster' && !isHigherRole(actor.role, target.role) && !hasIndividualPerm) {
        client.emit('room:error', {
          message:
            'You cannot perform this action on a user with equal or higher rank',
        });
        this.logger.warn(
          `${actor.displayName} (${actor.role}) tried ${payload.action} on ${target.displayName} (${target.role}) — DENIED`,
        );
        return;
      }
    }

    // Action-level permission check (bireysel yetki varsa bypass)
    const actionMinLevel = ACTION_MIN_LEVELS[payload.action];
    const actionPermKey = ACTION_TO_USER_PERM[payload.action];
    const actorHasUserPerm = actionPermKey && actor.permissions?.[actionPermKey] === true;
    if (actionMinLevel && getRoleLevel(actor.role) < actionMinLevel && !actorHasUserPerm) {
      client.emit('room:error', {
        message: 'Bu işlem için yetkiniz yok.',
      });
      this.logger.warn(
        `${actor.displayName} (${actor.role}) lacks permission for ${payload.action} (needs ${actionMinLevel}) — DENIED`,
      );
      return;
    }

    this.logger.log(
      `Admin action: ${actor.displayName} → ${payload.action} → ${target.displayName} (duration=${payload.duration || 'N/A'})`,
    );

    // Execute action
    switch (payload.action) {
      case 'kick': {
        this.server
          .to(target.socketId)
          .emit('room:kicked', { reason: 'kick' });
        // ★ Önce in-memory sil, sonra broadcast — anlık yansıma
        this.participants.delete(target.socketId);
        this.server.to(target.roomId).emit('room:participant-left', {
          userId: target.userId,
          socketId: target.socketId,
        });
        this._doBroadcastParticipants(target.roomId);
        const targetSocketKick = this.server.sockets.sockets.get(target.socketId);
        if (targetSocketKick) {
          targetSocketKick.leave(target.roomId);
          targetSocketKick.disconnect(true);
        }
        // ★ Oda genelinde bildirim — herkes görsün
        this.server.to(target.roomId).emit('room:action-notify', {
          type: 'warning',
          icon: '👢',
          actor: actor.displayName,
          actorUserId: actor.userId,
          target: target.displayName,
          targetUserId: target.userId,
          action: 'kick',
          message: `${actor.displayName}, ${target.displayName} kullanıcısını odadan attı.`,
        });
        this.logger.log(`[KICK] ${actor.displayName} kicked ${target.displayName}`);
        break;
      }

      case 'hard_kick': {
        // Hard kick = 1 gün geçici ban + disconnect
        try {
          await this.adminService.createBan(actor.userId, target.tenantId, {
            userId: target.userId,
            type: BanType.BAN,
            duration: BanDuration.ONE_DAY,
            reason: 'Zorla atıldı (hard kick)',
          });
          this.logger.log(`[HARD_KICK] ${actor.displayName} hard-kicked ${target.displayName} with 1-day temp ban`);
        } catch (e) {
          this.logger.error(`[HARD_KICK] Ban creation failed: ${e.message}`);
        }

        // ★ Release mic if banned user is speaking
        const speakerHK = this.roomSpeakers.get(target.roomId);
        if (speakerHK && speakerHK.userId === target.userId) {
          this.releaseSpeaker(target.roomId, 'force_taken');
        }

        this.server
          .to(target.socketId)
          .emit('room:hard-kicked', {
            reason: 'Zorla atıldınız.',
          });
        // ★ Önce in-memory sil, sonra broadcast — anlık yansıma
        this.participants.delete(target.socketId);
        this.server.to(target.roomId).emit('room:participant-left', {
          userId: target.userId,
          socketId: target.socketId,
        });
        this._doBroadcastParticipants(target.roomId);
        const targetSocketHardKick = this.server.sockets.sockets.get(target.socketId);
        if (targetSocketHardKick) {
          targetSocketHardKick.leave(target.roomId);
          targetSocketHardKick.disconnect(true);
        }
        // ★ Oda genelinde bildirim
        this.server.to(target.roomId).emit('room:action-notify', {
          type: 'danger',
          icon: '⛔',
          actor: actor.displayName,
          actorUserId: actor.userId,
          target: target.displayName,
          targetUserId: target.userId,
          action: 'hard_kick',
          message: `${actor.displayName}, ${target.displayName} kullanıcısını zorla attı.`,
        });
        break;
      }

      case 'nudge': {
        // MSN-style screen shake — send to target user
        this.server.to(target.socketId).emit('room:nudge', {
          from: actor.displayName,
        });
        client.emit('room:toast', {
          type: 'info',
          title: 'Titretme',
          message: `${target.displayName} titretildi!`,
        });
        this.logger.log(`[NUDGE] ${actor.displayName} nudged ${target.displayName}`);
        break;
      }


      case 'mute': {
        // Explicit SET instead of toggle — idempotent
        target.isMuted = payload.value !== undefined ? payload.value : !target.isMuted;
        this.setModerationFlag(target.roomId, target.userId, 'isMuted', target.isMuted);
        this.logger.log(`[MUTE] ${target.displayName} isMuted → ${target.isMuted} (explicit=${payload.value})`);

        this.server
          .to(target.socketId)
          .emit('room:moderation', { action: 'mute', isMuted: target.isMuted });

        // If user is speaking and gets muted, release mic
        if (target.isMuted) {
          const currentSpeakerMute = this.roomSpeakers.get(target.roomId);
          if (currentSpeakerMute && currentSpeakerMute.userId === target.userId) {
            this.releaseSpeaker(target.roomId, 'force_taken');
          }
        }

        this._doBroadcastParticipants(target.roomId);
        // ★ Oda genelinde bildirim
        this.server.to(target.roomId).emit('room:action-notify', {
          type: target.isMuted ? 'danger' : 'success',
          icon: target.isMuted ? '🔇' : '🔊',
          actor: actor.displayName,
          actorUserId: actor.userId,
          target: target.displayName,
          targetUserId: target.userId,
          action: target.isMuted ? 'mute' : 'unmute',
          message: target.isMuted
            ? `${actor.displayName}, ${target.displayName} kullanıcısını susturdu.`
            : `${actor.displayName}, ${target.displayName} kullanıcısının sesini açtı.`,
        });
        break;
      }

      case 'gag': {
        // Explicit SET instead of toggle — idempotent
        target.isGagged = payload.value !== undefined ? payload.value : !target.isGagged;
        this.setModerationFlag(target.roomId, target.userId, 'isGagged', target.isGagged);
        this.logger.log(`[GAG] ${target.displayName} isGagged → ${target.isGagged} (explicit=${payload.value})`);

        this.server
          .to(target.socketId)
          .emit('room:moderation', { action: 'gag', isGagged: target.isGagged });

        this._doBroadcastParticipants(target.roomId);
        // ★ Oda genelinde bildirim
        this.server.to(target.roomId).emit('room:action-notify', {
          type: target.isGagged ? 'warning' : 'success',
          icon: target.isGagged ? '🤐' : '💬',
          actor: actor.displayName,
          actorUserId: actor.userId,
          target: target.displayName,
          targetUserId: target.userId,
          action: target.isGagged ? 'gag' : 'ungag',
          message: target.isGagged
            ? `${actor.displayName}, ${target.displayName} kullanıcısına yazı yasağı verdi.`
            : `${actor.displayName}, ${target.displayName} kullanıcısının yazı yasağını kaldırdı.`,
        });
        break;
      }

      case 'cam_block': {
        // Explicit SET instead of toggle — idempotent
        target.isCamBlocked = payload.value !== undefined ? payload.value : !target.isCamBlocked;
        this.setModerationFlag(target.roomId, target.userId, 'isCamBlocked', target.isCamBlocked);
        this.logger.log(`[CAM_BLOCK] ${target.displayName} isCamBlocked → ${target.isCamBlocked} (explicit=${payload.value})`);

        this.server
          .to(target.socketId)
          .emit('room:moderation', { action: 'cam_block', isCamBlocked: target.isCamBlocked });

        this._doBroadcastParticipants(target.roomId);
        // ★ Oda genelinde bildirim
        this.server.to(target.roomId).emit('room:action-notify', {
          type: target.isCamBlocked ? 'cyan' : 'success',
          icon: target.isCamBlocked ? '📷' : '📹',
          actor: actor.displayName,
          actorUserId: actor.userId,
          target: target.displayName,
          targetUserId: target.userId,
          action: target.isCamBlocked ? 'cam_block' : 'cam_unblock',
          message: target.isCamBlocked
            ? `${actor.displayName}, ${target.displayName} kullanıcısının kamerasını engelledi.`
            : `${actor.displayName}, ${target.displayName} kullanıcısının kamera iznini açtı.`,
        });
        break;
      }

      case 'exit_browser': {
        this.server
          .to(target.socketId)
          .emit('room:moderation', { action: 'exit_browser' });
        // ★ Oda genelinde bildirim
        this.server.to(target.roomId).emit('room:action-notify', {
          type: 'danger',
          icon: '🖥️',
          actor: actor.displayName,
          actorUserId: actor.userId,
          target: target.displayName,
          targetUserId: target.userId,
          action: 'exit_browser',
          message: `${actor.displayName}, ${target.displayName} kullanıcısının tarayıcısını kapattı.`,
        });
        break;
      }

      case 'release_mic': {
        // Actually release the speaker on the server if the target is currently speaking
        const currentSpeakerRelease = this.roomSpeakers.get(target.roomId);
        if (currentSpeakerRelease && currentSpeakerRelease.userId === target.userId) {
          // Notify the target that their mic was force-released
          this.server.to(target.socketId).emit('mic:force-released', {
            by: actor.displayName,
            byRole: actor.role,
          });
          this.releaseSpeaker(target.roomId, 'force_taken');
          client.emit('room:toast', {
            type: 'success',
            title: 'Mikrofon',
            message: `${target.displayName} mikrofonu serbest bırakıldı.`,
          });
          this.logger.log(`[RELEASE MIC] ${actor.displayName} released mic of ${target.displayName}`);
        } else {
          client.emit('room:toast', {
            type: 'info',
            title: 'Mikrofon',
            message: `${target.displayName} şu anda konuşmuyor.`,
          });
        }
        break;
      }

      case 'take_mic': {
        // Force-take mic: the ACTOR (admin) takes the mic, not the target
        // 1. Release current speaker if any
        const currentSpeakerTake = this.roomSpeakers.get(actor.roomId);
        if (currentSpeakerTake) {
          this.server.to(currentSpeakerTake.socketId).emit('mic:force-released', {
            by: actor.displayName,
            byRole: actor.role,
          });
          this.releaseSpeaker(actor.roomId, 'force_taken');
        }

        // 2. Assign mic to the ACTOR (person who clicked)
        const micDuration = this.getMicDuration(actor.role, actor.tenantId);
        const micStartedAt = Date.now();
        // null = unlimited (no auto-release timer)
        const micTimer = micDuration != null
          ? setTimeout(() => {
              this.releaseSpeaker(actor.roomId, 'timer_expired');
            }, micDuration)
          : null;

        const actorSpeakerState: SpeakerState = {
          socketId: client.id,
          userId: actor.userId,
          displayName: actor.displayName,
          role: actor.role,
          startedAt: micStartedAt,
          duration: micDuration ?? 0,
          timer: micTimer,
        };
        this.roomSpeakers.set(actor.roomId, actorSpeakerState);

        // 3. Broadcast mic:acquired to the entire room
        this.server.to(actor.roomId).emit('mic:acquired', {
          userId: actor.userId,
          displayName: actor.displayName,
          socketId: client.id,
          role: actor.role,
          startedAt: micStartedAt,
          duration: micDuration,
        });

        // 4. Tell the actor's client to auto-activate mic locally
        client.emit('room:moderation', { action: 'take_mic' });

        // 5. Remove actor from queue if present
        const actorQueue = this.micQueues.get(actor.roomId) || [];
        if (actorQueue.includes(actor.userId)) {
          const newQueue = actorQueue.filter(id => id !== actor.userId);
          this.micQueues.set(actor.roomId, newQueue);
          this.server.to(actor.roomId).emit('mic:queue-updated', newQueue);
        }

        this.logger.log(`[TAKE MIC] ${actor.displayName} force-took mic in ${actor.roomId}`);
        break;
      }

      case 'invite_one2one': {
        // Hedef kullanıcıya bire bir davet gönder
        this.server.to(target.socketId).emit('one2one:invite', {
          fromUserId: actor.userId || actor.socketId,
          fromDisplayName: actor.displayName || 'Bilinmeyen',
          fromAvatar: actor.avatar || '',
          fromRole: actor.role || 'guest',
          roomSlug: actor.roomSlug || actor.roomId || '',
        });
        // Aktöre bilgi toast'ı gönder
        client.emit('room:toast', {
          type: 'success',
          title: 'Davet Gönderildi',
          message: `${target.displayName} kullanıcısına bire bir davet gönderildi.`,
        });
        console.log(`[ONE2ONE] ${actor.displayName} → ${target.displayName} davet gönderdi`);
        break;
      }

      case 'ban': {
        // Map duration string to Enum
        let durationEnum: BanDuration = BanDuration.PERMANENT;
        switch (payload.duration) {
          case '1h':
            durationEnum = BanDuration.ONE_DAY;
            break; // 1h not in enum yet, fallback to 1d
          case '1d':
            durationEnum = BanDuration.ONE_DAY;
            break;
          case '1w':
            durationEnum = BanDuration.ONE_WEEK;
            break;
          case '1m':
            durationEnum = BanDuration.ONE_MONTH;
            break;
          case 'permanent':
            durationEnum = BanDuration.PERMANENT;
            break;
        }

        // Ban duration caps by role level:
        // Level < 6 (admin and below): max 1 week
        // Level < 7 (super_admin and below): no permanent
        const actorLevel = getRoleLevel(actor.role);

        if (actorLevel < 7 && durationEnum === BanDuration.PERMANENT) {
          client.emit('room:error', {
            message: 'Kalıcı ban sadece Owner yapabilir.',
          });
          this.logger.warn(
            `${actor.displayName} (level=${actorLevel}) tried permanent ban — DENIED`,
          );
          return;
        }

        if (actorLevel < 6 && durationEnum === BanDuration.ONE_MONTH) {
          client.emit('room:error', {
            message: 'Admin maksimum 1 hafta ban yapabilir.',
          });
          this.logger.warn(
            `${actor.displayName} (level=${actorLevel}) tried 1-month ban — DENIED`,
          );
          return;
        }

        try {
          // Scan all sockets for the target to get their IP for IP ban
          const allSockets = await this.server.fetchSockets();
          let targetIp: string | null = null;
          for (const s of allSockets) {
            const p = this.participants.get(s.id);
            if (
              p?.userId === target.userId ||
              (p?.guestId && p.guestId === target.userId)
            ) {
              targetIp = s.handshake.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
                || s.handshake.address
                || null;
              break;
            }
          }

          await this.adminService.createBan(actor.userId, target.tenantId, {
            userId: target.userId,
            type: BanType.BAN,
            duration: durationEnum,
            reason: 'Banned by admin via room controls',
            ip: targetIp || null,
          });

          // Also create an IP ban so guest can't rejoin with a new ID
          // CRITICAL: Do NOT IP ban if target shares IP with actor (same network)
          const actorIp = client.handshake.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
            || client.handshake.address || null;
          if (targetIp && targetIp !== '0.0.0.0' && targetIp !== actorIp) {
            try {
              await this.adminService.createIpBan(
                actor.userId,
                actor.tenantId,
                { ip: targetIp, reason: 'Auto IP ban from user ban' },
              );
              this.logger.log(`Auto IP Ban Created for ${targetIp}`);
            } catch (ipBanErr) {
              this.logger.warn(`Failed to auto-create IP ban: ${ipBanErr.message}`);
            }
          } else if (targetIp === actorIp) {
            this.logger.warn(`Skipping IP ban — actor and target share same IP: ${targetIp}`);
          }

          // Kick user immediately — send ban event (not kick) so frontend shows ban overlay
          const expiresAt = durationEnum === BanDuration.PERMANENT ? null
            : durationEnum === BanDuration.ONE_DAY ? new Date(Date.now() + 86400000).toISOString()
              : durationEnum === BanDuration.ONE_WEEK ? new Date(Date.now() + 604800000).toISOString()
                : durationEnum === BanDuration.ONE_MONTH ? new Date(Date.now() + 2592000000).toISOString()
                  : null;

          // ★ TIERED BAN — Only permanent bans are hard bans
          // 1 day, 1 week, 1 month → soft ban (user stays, restricted)
          // Permanent → hard ban (disconnect + full-screen block)
          const isHardBan = durationEnum === BanDuration.PERMANENT;

          // ★ Release mic if banned user is speaking
          const speakerBan = this.roomSpeakers.get(target.roomId);
          if (speakerBan && speakerBan.userId === target.userId) {
            this.releaseSpeaker(target.roomId, 'force_taken');
          }

          if (isHardBan) {
            // ★ HARD BAN — kalıcı → disconnect
            this.server
              .to(target.socketId)
              .emit('room:banned', {
                reason: 'Yönetici tarafından yasaklandınız.',
                expiresAt,
                banLevel: 'hard',
              });
            // ★ Önce in-memory sil, anlık broadcast, sonra disconnect
            this.participants.delete(target.socketId);
            this.server.to(target.roomId).emit('room:participant-left', {
              userId: target.userId,
              socketId: target.socketId,
            });
            this.server.in(target.socketId).disconnectSockets(true);
          } else {
            // ★ SOFT BAN — < 1 hafta → kısıtlı mod, bağlantı korunur
            target.isBanned = true;
            this.server
              .to(target.socketId)
              .emit('room:banned', {
                reason: 'Yönetici tarafından geçici yasaklandınız.',
                expiresAt,
                banLevel: 'soft',
              });
          }

          this.server.to(target.roomId).emit('room:notification', {
            type: 'warning',
            message: `${target.displayName} yasaklandı.`,
          });

          // ★ Broadcast ban status to ALL users in the room for instant sidebar update
          this.server.to(target.roomId).emit('room:user-banned', {
            userId: target.userId,
            displayName: target.displayName,
            banLevel: isHardBan ? 'hard' : 'soft',
          });

          this._doBroadcastParticipants(target.roomId);
        } catch (e) {
          this.logger.error(
            `Failed to ban user ${target.userId}: ${e.message}`,
          );
          client.emit('room:error', { message: 'Ban işlemi başarısız oldu.' });
        }
        break;
      }

      case 'unban': {
        try {
          await this.adminService.removeAllActiveBansForUser(
            actor.userId,
            target.userId,
            target.tenantId,
            client.handshake.address,
          );

          // Update in-memory state — TÜM socket'lerdeki isBanned flag'ini temizle
          target.isBanned = false;
          for (const [, p] of this.participants) {
            if (p.userId === target.userId) {
              p.isBanned = false;
            }
          }

          // ★ Notify unbanned user to remove ban overlay immediately
          // Hedef kullanıcının TÜM aktif socket'lerine gönder (reconnect sonrası farklı socketId olabilir)
          for (const [sid, p] of this.participants) {
            if (p.userId === target.userId) {
              this.server.to(sid).emit('room:ban-lifted', {
                message: 'Yasağınız kaldırıldı.',
              });
            }
          }

          this.server.to(target.roomId).emit('room:notification', {
            type: 'info',
            message: `${target.displayName} yasağı kaldırıldı.`,
          });

          this.logger.log(
            `[UNBAN] ${target.displayName} unbanned by ${actor.displayName}`,
          );

          // ★ Broadcast unban status to ALL users in the room for instant sidebar update
          this.server.to(target.roomId).emit('room:user-unbanned', {
            userId: target.userId,
            displayName: target.displayName,
          });
          // ★ Oda genelinde bildirim
          this.server.to(target.roomId).emit('room:action-notify', {
            type: 'success',
            icon: '✅',
            actor: actor.displayName,
            actorUserId: actor.userId,
            target: target.displayName,
            targetUserId: target.userId,
            action: 'unban',
            message: `${actor.displayName}, ${target.displayName} kullanıcısının yasağını kaldırdı.`,
          });

          this._doBroadcastParticipants(target.roomId);
        } catch (e) {
          this.logger.error(
            `Failed to unban user ${target.userId}: ${e.message}`,
          );
          client.emit('room:error', {
            message: 'Yasak kaldırma işlemi başarısız oldu.',
          });
        }
        break;
      }

      case 'setRole': {
        try {
          const newRole = payload.duration; // "moderator", "admin" passed in duration field
          console.log(`[setRole] ENTERED — newRole=${newRole}, target=${target.displayName}, actor=${actor.displayName}`);
          if (!newRole) {
            console.warn('[setRole] newRole is empty — aborting');
            return;
          }

          // Defensive init (hot-reload may not reinitialize class properties)
          if (!this.tempRoles) {
            (this as any).tempRoles = new Map();
          }

          const previousRole = target.role;
          const tempKey = `${target.userId}:${target.roomId}`;

          // Clear any existing temp role timer for this user in this room
          const existingTemp = this.tempRoles.get(tempKey);
          if (existingTemp) {
            clearTimeout(existingTemp.timer);
            this.tempRoles.delete(tempKey);
          }

          // Store original role and set 24h expiry timer
          const originalRole = existingTemp?.originalRole || previousRole;
          const expiresAt = new Date(Date.now() + this.TEMP_ROLE_DURATION);

          const timer = setTimeout(() => {
            // Revert role back to original after 24 hours
            this.tempRoles.delete(tempKey);

            // Find the user in participants in this room
            for (const [, p] of this.participants) {
              if (p.userId === target.userId && p.roomId === target.roomId) {
                p.role = originalRole;
                this.server.to(p.socketId).emit('room:toast', {
                  type: 'info',
                  title: 'Rol',
                  message: `Rolünüz ${originalRole} olarak geri alındı.`,
                });
                this.server.to(p.socketId).emit('auth:session-update', {
                  role: originalRole,
                });
                this._doBroadcastParticipants(p.roomId);
                this.logger.log(`[TEMP ROLE EXPIRED] ${p.displayName}: ${newRole} → ${originalRole}`);
              }
            }
          }, this.TEMP_ROLE_DURATION);

          this.tempRoles.set(tempKey, { originalRole, newRole, roomId: target.roomId, timer, expiresAt });

          // Apply role change in-memory immediately
          target.role = newRole;

          // Update socket auth data
          const targetClient = this.server?.sockets?.sockets?.get(target.socketId);
          if (targetClient?.data?.user) {
            targetClient.data.user.role = newRole;
          }

          // Notify the target user
          this.server.to(target.socketId).emit('room:toast', {
            type: 'success',
            title: 'Rol',
            message: `Rolünüz: ${newRole}`,
          });
          this.server.to(target.socketId).emit('auth:session-update', {
            role: newRole,
          });

          // Notify the admin
          client.emit('room:toast', {
            type: 'success',
            title: 'Rol',
            message: `${target.displayName} → ${newRole}`,
          });

          this._doBroadcastParticipants(target.roomId);

          this.logger.log(
            `[TEMP ROLE] ${actor.displayName} → ${target.displayName}: ${previousRole} → ${newRole} (expires: ${expiresAt.toISOString()})`,
          );
        } catch (e) {
          console.error(`[setRole] ERROR:`, e);
          client.emit('room:toast', { type: 'error', title: 'Hata', message: `Rol atama hatası: ${e.message}` });
        }
        break;
      }

      case 'moveToMeeting': {
        // Pull user to the staff-meeting room
        this.server.to(target.socketId).emit('room:moveToMeeting', {
          roomSlug: 'staff-meeting',
          by: actor.displayName,
        });
        client.emit('room:toast', {
          type: 'success',
          title: 'Toplantı',
          message: `${target.displayName} toplantıya çekildi.`,
        });
        this.logger.log(`[MOVE TO MEETING] ${actor.displayName} pulled ${target.displayName} to staff-meeting`);
        break;
      }

      case 'makeRoomOperator': {
        // Temporary room operator — reuse the setRole logic with 'operator'
        const previousRoleOp = target.role;
        target.role = 'operator';
        const targetClientOp = this.server?.sockets?.sockets?.get(target.socketId);
        if (targetClientOp?.data?.user) {
          targetClientOp.data.user.role = 'operator';
        }
        this.server.to(target.socketId).emit('room:toast', {
          type: 'success', title: 'Rol', message: 'Oda operatörü yapıldınız.',
        });
        this.server.to(target.socketId).emit('auth:session-update', { role: 'operator' });
        client.emit('room:toast', {
          type: 'success', title: 'Rol', message: `${target.displayName} → oda operatörü`,
        });
        this._doBroadcastParticipants(target.roomId);
        this.logger.log(`[MAKE OPERATOR] ${actor.displayName} → ${target.displayName}: ${previousRoleOp} → operator`);
        break;
      }

      case 'revokeRole': {
        // Revoke temp role — reset to member
        const previousRoleRevoke = target.role;
        target.role = 'member';
        const targetClientRevoke = this.server?.sockets?.sockets?.get(target.socketId);
        if (targetClientRevoke?.data?.user) {
          targetClientRevoke.data.user.role = 'member';
        }
        this.server.to(target.socketId).emit('room:toast', {
          type: 'info', title: 'Rol', message: 'Yetkiniz geri alındı.',
        });
        this.server.to(target.socketId).emit('auth:session-update', { role: 'member' });
        client.emit('room:toast', {
          type: 'success', title: 'Rol', message: `${target.displayName}: ${previousRoleRevoke} → member`,
        });
        this._doBroadcastParticipants(target.roomId);
        this.logger.log(`[REVOKE ROLE] ${actor.displayName} → ${target.displayName}: ${previousRoleRevoke} → member`);
        break;
      }

      default:
        this.logger.warn(`Unknown admin action: ${payload.action}`);
        break;
    }
  }

  // ═══════════ Tüm Çevrimiçi Kullanıcıları Listele (operator+) ═══════════
  @SubscribeMessage('admin:getAllOnlineUsers')
  handleGetAllOnlineUsers(
    @ConnectedSocket() client: Socket,
  ) {
    const actor = this.participants.get(client.id);
    // Fallback: backend restart sonrası participants Map boş olabilir — socket auth verisini kullan
    const actorUser = actor || (client.data?.user ? {
      userId: client.data.user.sub || client.data.user.userId,
      displayName: client.data.user.displayName || client.data.user.username || 'Unknown',
      role: client.data.user.role || 'guest',
    } : null);
    if (!actorUser) {
      client.emit('room:error', { message: 'Yetki yok.' });
      return;
    }

    const actorLevel = getRoleLevel(actorUser.role);
    if (actorLevel < 3) { // operator+
      client.emit('room:error', { message: 'Kullanıcı listesi için yetkiniz yok.' });
      return;
    }

    // Group participants by roomId
    const roomMap = new Map<string, any[]>();
    this.participants.forEach((p) => {
      // GodMaster kullanıcıları herkesten gizle (kendisi hariç)
      if (p.role?.toLowerCase() === 'godmaster' && p.userId !== actorUser.userId) return;
      // Stealth kullanıcıları sadece admin+ görebilir
      if (p.isStealth && actorLevel < 5) return;
      // Kendini her zaman göster
      const userEntry = {
        userId: p.userId,
        displayName: p.displayName,
        avatar: p.avatar,
        role: p.role,
        status: p.status,
        isMuted: p.isMuted || false,
        isGagged: p.isGagged || false,
        isBanned: p.isBanned || false,
        isCamBlocked: p.isCamBlocked || false,
        isStealth: p.isStealth || false,
      };

      const list = roomMap.get(p.roomId) || [];
      list.push(userEntry);
      roomMap.set(p.roomId, list);
    });

    const rooms: { roomId: string; users: any[] }[] = [];
    roomMap.forEach((users, roomId) => {
      rooms.push({ roomId, users });
    });

    client.emit('admin:allOnlineUsers', { rooms });
    this.logger.log(`getAllOnlineUsers → ${rooms.length} oda, actor: ${actorUser.displayName}`);
  }

  // ═══════════ Uzaktan Moderasyon Aksiyonu (cross-room) ═══════════
  @SubscribeMessage('admin:remoteAction')
  async handleRemoteAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { action: string; targetUserId: string; duration?: string },
  ) {
    const actor = this.participants.get(client.id);
    // Fallback: backend restart sonrası participants Map boş olabilir
    const actorUser = actor || (client.data?.user ? {
      userId: client.data.user.sub || client.data.user.userId,
      displayName: client.data.user.displayName || client.data.user.username || 'Unknown',
      role: client.data.user.role || 'guest',
      tenantId: client.data.user.tenantId || 'default',
    } : null);
    if (!actorUser) {
      client.emit('room:error', { message: 'Yetki yok.' });
      return;
    }

    // Find target across all rooms
    let target: InMemoryParticipant | null = null;
    this.participants.forEach((p) => {
      if (p.userId === payload.targetUserId) target = p;
    });

    if (!target) {
      client.emit('room:error', { message: 'Hedef kullanıcı bulunamadı.' });
      return;
    }

    // ★ GODMASTER KORUMA BARİYERİ — Sadece başka GodMaster tarafından işlem uygulanabilir ★
    if (target.role?.toLowerCase() === 'godmaster' && actorUser.role?.toLowerCase() !== 'godmaster') {
      client.emit('admin:remoteActionResult', { success: false, message: 'Bu kullanıcıya işlem uygulanamaz.' });
      this.logger.warn(`[GODMASTER PROTECTION] Remote action ${payload.action} on GodMaster by ${actorUser.displayName} — BLOCKED`);
      return;
    }

    const actorLevel = getRoleLevel(actorUser.role);
    const targetLevel = getRoleLevel(target.role);

    // Check if actor outranks target (GodMaster bypasses)
    if (actorUser.role?.toLowerCase() !== 'godmaster' && actorLevel <= targetLevel) {
      client.emit('room:error', { message: 'Bu kullanıcı üzerinde yetkiniz yok.' });
      return;
    }

    // Check minimum level for action
    const minLevel = ACTION_MIN_LEVELS[payload.action];
    if (minLevel !== undefined && actorLevel < minLevel) {
      client.emit('room:error', { message: 'Bu aksiyon için yetkiniz yok.' });
      return;
    }

    this.logger.log(`RemoteAction: ${actorUser.displayName}(${actorUser.role}) → ${payload.action} → ${target.displayName}(${target.role}) in room ${target.roomId}`);

    // Execute action on target's room
    const targetRoomId = target.roomId;

    switch (payload.action) {
      case 'mute': {
        target.isMuted = !target.isMuted;
        this.setModerationFlag(targetRoomId, target.userId, 'isMuted', target.isMuted);
        // Notify the target user directly
        this.server.to(target.socketId).emit('room:moderation', { action: 'mute', isMuted: target.isMuted });
        // Broadcast updated participant list to all viewers (per-viewer filtered)
        this._doBroadcastParticipants(targetRoomId);
        client.emit('admin:remoteActionResult', { success: true, message: `${target.displayName} ${target.isMuted ? 'susturuldu' : 'sesi açıldı'}.` });
        break;
      }
      case 'gag': {
        target.isGagged = !target.isGagged;
        this.setModerationFlag(targetRoomId, target.userId, 'isGagged', target.isGagged);
        // Notify the target user directly
        this.server.to(target.socketId).emit('room:moderation', { action: 'gag', isGagged: target.isGagged });
        // Broadcast updated participant list to all viewers (per-viewer filtered)
        this._doBroadcastParticipants(targetRoomId);
        client.emit('admin:remoteActionResult', { success: true, message: `${target.displayName} ${target.isGagged ? 'yazı yasağı verildi' : 'yazı yasağı kaldırıldı'}.` });
        break;
      }
      case 'kick': {
        const targetSocket = this.server.sockets.sockets.get(target.socketId);
        if (targetSocket) {
          targetSocket.emit('room:kicked', { reason: `${actor.displayName} tarafından atıldınız.` });
        }
        // ★ Önce in-memory sil, sonra broadcast — anlık yansıma
        this.participants.delete(target.socketId);
        this.server.to(targetRoomId).emit('room:participant-left', {
          userId: target.userId,
          socketId: target.socketId,
        });
        this._doBroadcastParticipants(targetRoomId);
        if (targetSocket) {
          targetSocket.leave(targetRoomId);
          targetSocket.disconnect(true);
        }
        client.emit('admin:remoteActionResult', { success: true, message: `${target.displayName} odadan atıldı.` });
        break;
      }
      case 'ban': {
        const dur = payload.duration || 'permanent';
        try {
          let durationEnum: BanDuration = BanDuration.PERMANENT;
          if (dur === '1d') durationEnum = BanDuration.ONE_DAY;
          else if (dur === '1w') durationEnum = BanDuration.ONE_WEEK;
          else if (dur === '1m') durationEnum = BanDuration.ONE_MONTH;

          await this.adminService.createBan(actorUser.userId, target.tenantId || 'default', {
            userId: target.userId,
            type: BanType.BAN,
            duration: durationEnum,
            reason: `${actorUser.displayName} tarafından uzaktan yasaklandı`,
          });

          const expiresAt = durationEnum === BanDuration.PERMANENT ? null
            : durationEnum === BanDuration.ONE_DAY ? new Date(Date.now() + 86400000).toISOString()
              : durationEnum === BanDuration.ONE_WEEK ? new Date(Date.now() + 604800000).toISOString()
                : durationEnum === BanDuration.ONE_MONTH ? new Date(Date.now() + 2592000000).toISOString()
                  : null;

          const targetSocket = this.server.sockets.sockets.get(target.socketId);
          if (targetSocket) {
            targetSocket.emit('room:banned', {
              reason: `${actorUser.displayName} tarafından yasaklandınız.`,
              expiresAt: expiresAt || null,
            });
          }
          // ★ Önce in-memory sil, sonra broadcast — anlık yansıma
          this.participants.delete(target.socketId);
          this.server.to(targetRoomId).emit('room:participant-left', {
            userId: target.userId,
            socketId: target.socketId,
          });
          this._doBroadcastParticipants(targetRoomId);
          if (targetSocket) {
            targetSocket.leave(targetRoomId);
            targetSocket.disconnect(true);
          }
          client.emit('admin:remoteActionResult', { success: true, message: `${target.displayName} yasaklandı (${dur}).` });
        } catch (e) {
          client.emit('admin:remoteActionResult', { success: false, message: 'Yasaklama başarısız.' });
        }
        break;
      }
      default:
        client.emit('admin:remoteActionResult', { success: false, message: `Bilinmeyen aksiyon: ${payload.action}` });
        break;
    }
  }

  // ═══════════ Room List (for Room Monitor Modal) ═══════════
  @SubscribeMessage('room:list')
  async handleRoomList(
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      const tenantId = user.tenantId;
      const dbRooms = tenantId ? await this.roomService.findAll(tenantId) : [];

      const rooms = dbRooms
        .filter((r: any) => !r.isMeetingRoom) // ★ Toplantı odası listede GİZLİ ★
        .map((r: any) => {
          let userCount = 0;
          this.participants.forEach(p => { if (p.roomId === r.slug) userCount++; });

          return {
            id: r.id,
            name: r.name,
            slug: r.slug,
            userCount,
            maxParticipants: r.maxParticipants || null,
            status: r.status || 'ACTIVE',
            isLocked: !!r.isLocked,
            isMeetingRoom: !!r.isMeetingRoom,
            isVipRoom: !!r.isVipRoom,
          };
        });

      return { rooms };
    } catch (err) {
      this.logger.error('room:list error', err);
      return { rooms: [] };
    }
  }

  // ═══════════ Room Monitor (Admin-Only — per-room user lists) ═══════════
  @SubscribeMessage('room:monitor')
  async handleRoomMonitor(
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user;
    if (!user) return { rooms: [] };

    // Sadece yetkili roller görebilir
    const userRole = user.role?.toLowerCase() || '';
    const minLevel = ROLE_HIERARCHY['admin'] || 5; // admin+
    if (getRoleLevel(userRole) < minLevel) {
      this.logger.warn(`[room:monitor] Unauthorized: ${user.username} (${userRole})`);
      return { rooms: [] };
    }

    try {
      const tenantId = user.tenantId;
      const dbRooms = tenantId ? await this.roomService.findAll(tenantId) : [];

      // Her oda için katılımcıları topla (toplantı odalarını gizle)
      const rooms = dbRooms.filter((r: any) => !r.isMeetingRoom).map((r: any) => {
        const scopedId = `${tenantId}:${r.slug}`;
        const roomUsers: any[] = [];
        this.participants.forEach((p) => {
          if (p.roomId === scopedId) {
            roomUsers.push({
              userId: p.userId,
              displayName: p.displayName,
              avatar: p.avatar,
              role: p.role,
              status: p.status || 'online',
              socketId: p.socketId,
              isMuted: p.isMuted || false,
              isGagged: p.isGagged || false,
              isBanned: p.isBanned || false,
              isCamBlocked: p.isCamBlocked || false,
            });
          }
        });

        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          userCount: roomUsers.length,
          maxParticipants: r.maxParticipants || null,
          status: r.status || 'ACTIVE',
          isLocked: !!r.isLocked,
          isMeetingRoom: !!r.isMeetingRoom,
          isVipRoom: !!r.isVipRoom,
          users: roomUsers,
        };
      });

      return { rooms };
    } catch (err) {
      this.logger.error('room:monitor error', err);
      return { rooms: [] };
    }
  }

  // ═══════════ Admin: Pull User to Room (RAW handler — bypasses NestJS routing) ═══════════
  private async _handlePullUserRaw(
    client: Socket,
    payload: { userId: string; targetRoomSlug: string },
    ack?: Function,
  ) {
    this.logger.log(`[admin:pull-user] RECEIVED: userId=${payload?.userId}, targetRoomSlug=${payload?.targetRoomSlug}`);

    const admin = client.data?.user;
    if (!admin) {
      this.logger.warn('[admin:pull-user] No admin user on socket');
      if (ack) ack({ success: false, error: 'Not authenticated' });
      return;
    }

    const adminRole = admin.role?.toLowerCase() || '';
    const adminLevel = getRoleLevel(adminRole);

    this.logger.log(`[admin:pull-user] Admin: ${admin.username} (${adminRole}, level ${adminLevel})`);

    if (adminLevel < ROLE_HIERARCHY['admin']) {
      this.logger.warn(`[admin:pull-user] Unauthorized: ${admin.username} (level ${adminLevel} < ${ROLE_HIERARCHY['admin']})`);
      if (ack) ack({ success: false, error: 'Unauthorized' });
      return;
    }

    // Hedef kullanıcının socket'ini bul
    const { socketId, participant } = this.findTargetSocket(payload.userId);
    this.logger.log(`[admin:pull-user] findTargetSocket result: socketId=${socketId}, found=${!!participant}`);

    if (!socketId || !participant) {
      this.logger.warn(`[admin:pull-user] Target not found: ${payload.userId}. Total participants: ${this.participants.size}`);
      const allIds: string[] = [];
      this.participants.forEach((p) => allIds.push(`${p.userId}(${p.displayName})`));
      this.logger.log(`[admin:pull-user] All participant userIds: ${allIds.join(', ')}`);
      if (ack) ack({ success: false, error: 'Target not found' });
      return;
    }

    this.logger.log(`[admin:pull-user] Target found: ${participant.displayName} (${participant.role}) in room ${participant.roomId}`);

    // ★ GODMASTER KORUMA
    if (participant.role?.toLowerCase() === 'godmaster' && adminRole !== 'godmaster') {
      client.emit('room:error', { message: 'GodMaster kullanıcısı çekilemez.' });
      this.logger.warn(`[admin:pull-user] ${admin.username} tried to pull GodMaster ${participant.displayName} — BLOCKED`);
      if (ack) ack({ success: false, error: 'Cannot pull GodMaster' });
      return;
    }

    // ★ HİYERARŞİ KONTROLÜ
    const targetLevel = getRoleLevel(participant.role);
    if (adminRole !== 'godmaster' && adminLevel <= targetLevel) {
      client.emit('room:error', { message: 'Bu kullanıcı üzerinde yetkiniz yok.' });
      this.logger.warn(`[admin:pull-user] ${admin.username}(${adminRole}, ${adminLevel}) cannot pull ${participant.displayName}(${participant.role}, ${targetLevel}) — outranked`);
      if (ack) ack({ success: false, error: 'Outranked' });
      return;
    }

    // Eski odadan çıkar ve katılımcı listesini güncelle
    const oldRoomId = participant.roomId;
    this.logger.log(`[admin:pull-user] server=${!!this.server}, sockets=${!!this.server?.sockets}, socketsMap=${!!this.server?.sockets?.sockets}`);

    // Use Socket.IO v4 admin API (safer — doesn't require direct socket reference)
    try {
      await this.server.in(socketId).socketsLeave(oldRoomId);
      this.logger.log(`[admin:pull-user] Target socket left room ${oldRoomId} via socketsLeave`);
    } catch (leaveErr: any) {
      this.logger.warn(`[admin:pull-user] socketsLeave failed: ${leaveErr.message}`);
    }
    this.participants.delete(socketId);
    this._doBroadcastParticipants(oldRoomId);

    // Kullanıcıya yönlendirme emri gönder
    this.server.to(socketId).emit('room:force-navigate', {
      roomSlug: payload.targetRoomSlug,
      by: admin.username || admin.displayName,
    });

    this.logger.log(`[admin:pull-user] SUCCESS: ${admin.username} pulled ${participant.displayName} from ${oldRoomId} to ${payload.targetRoomSlug}`);
    if (ack) ack({ success: true, message: `${participant.displayName} odaya çekildi.` });
  }

  // ═══════════ Meeting Room — Singleton Gizli Oda ═══════════
  @SubscribeMessage('meeting:join')
  async handleMeetingJoin(
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user;
    if (!user) return;

    // Minimum yetki: operator+ (level >= 3)
    const roleLevel = getRoleLevel(user.role || 'guest');
    if (roleLevel < ROLE_HIERARCHY['operator']) {
      client.emit('room:error', { message: 'Toplantı odasına erişim yetkiniz yok.' });
      return;
    }

    const MEETING_SLUG = 'staff-meeting';
    const tenantId = user.tenantId;

    try {
      // Mevcut toplantı odasını bul veya otomatik oluştur
      let meetingRoom = await this.roomService.findBySlug(tenantId, MEETING_SLUG);

      if (!meetingRoom) {
        // İlk kez oluştur
        meetingRoom = await this.roomService.create(tenantId, {
          name: '🔒 Toplantı Odası',
          slug: MEETING_SLUG,
          isLocked: false,
          maxParticipants: 50,
        } as any);

        // isMeetingRoom flag'ini set et
        await (this.roomService as any).prisma?.room?.update?.({
          where: { id: meetingRoom.id },
          data: { isMeetingRoom: true },
        });

        this.logger.log(`[MEETING] Created meeting room: ${meetingRoom.id}`);
      }

      // Kullanıcıyı toplantı odasına yönlendir
      client.emit('meeting:redirect', { slug: MEETING_SLUG });
      this.logger.log(`[MEETING] ${user.displayName || user.sub} redirected to meeting room`);
    } catch (err) {
      this.logger.error('[MEETING] Error:', err);
      client.emit('room:error', { message: 'Toplantı odasına bağlanılamadı.' });
    }
  }

  // ═══════════ Meeting Room — Hiyerarşik Çekme ═══════════
  @SubscribeMessage('meeting:invite')
  async handleMeetingInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: string },
  ) {
    console.log('\n\n========== MEETING:INVITE HANDLER START ==========');
    console.log('payload:', JSON.stringify(payload));
    console.log('client.id:', client.id);

    // Actor bilgisini al
    let user = client.data?.user;
    const actorParticipant = this.participants.get(client.id);
    console.log('client.data.user:', user ? `${user.displayName || user.username} (role=${user.role})` : 'NULL');
    console.log('actorParticipant:', actorParticipant ? `${actorParticipant.displayName} (role=${actorParticipant.role})` : 'NULL');

    if (!user && actorParticipant) {
      user = actorParticipant;
    }
    if (!user) {
      console.log('ERROR: Actor bulunamadı!');
      client.emit('room:error', { message: 'Oturum bulunamadı.' });
      return;
    }

    const actorRole = user.role || actorParticipant?.role || 'guest';
    const actorLevel = getRoleLevel(actorRole);
    console.log(`Actor: ${user.displayName || user.username}, role=${actorRole}, level=${actorLevel}`);

    if (actorLevel < ROLE_HIERARCHY['operator']) {
      console.log('ERROR: Yetki yetersiz');
      client.emit('room:error', { message: 'Toplantıya çekme yetkiniz yok.' });
      return;
    }

    // Hedef kullanıcıyı bul
    let target: any = null;
    console.log(`\nHedef aranıyor: "${payload.targetUserId}"`);
    console.log(`Toplam katılımcı: ${this.participants.size}`);
    this.participants.forEach((p, key) => {
      console.log(`  Katılımcı: socketId=${p.socketId}, userId=${p.userId}, displayName=${p.displayName}, role=${p.role}`);
      if (
        p.userId === payload.targetUserId ||
        p.socketId === payload.targetUserId ||
        p.displayName === payload.targetUserId ||
        (p as any).id === payload.targetUserId
      ) {
        target = p;
        console.log(`  >> EŞLEŞME BULUNDU!`);
      }
    });

    if (!target) {
      console.log('ERROR: Hedef bulunamadı!');
      client.emit('room:error', { message: 'Hedef kullanıcı bulunamadı.' });
      return;
    }

    console.log(`\nHedef bulundu: ${target.displayName} (role=${target.role})`);

    // Hiyerarşi kontrolü
    const targetLevel = getRoleLevel(target.role);
    console.log(`Hiyerarşi: actor=${actorLevel} vs target=${targetLevel}`);
    if (actorLevel <= targetLevel) {
      console.log('ERROR: Hiyerarşi engeli!');
      client.emit('room:error', { message: 'Eşit veya üst seviyedeki kullanıcıları toplantıya çekemezsiniz.' });
      return;
    }

    if (target.role?.toLowerCase() === 'godmaster') {
      console.log('ERROR: GodMaster koruması!');
      client.emit('room:error', { message: 'Bu kullanıcı toplantıya çekilemez.' });
      return;
    }

    const MEETING_SLUG = 'staff-meeting';

    // Hedef socket'e doğrudan emit gönder
    console.log(`\nRedirect gönderiliyor: socketId=${target.socketId}, slug=${MEETING_SLUG}`);
    this.server.to(target.socketId).emit('meeting:redirect', { slug: MEETING_SLUG });

    // Aktör (yetkili) de toplantıya girer
    client.emit('meeting:redirect', { slug: MEETING_SLUG });

    client.emit('room:toast', { type: 'success', title: 'Toplantı', message: `${target.displayName} ile birlikte toplantı odasına giriyorsunuz.` });
    console.log(`SUCCESS! ${user.displayName || user.username} ve ${target.displayName} toplantıya yönlendirildi.`);
    console.log('========== MEETING:INVITE HANDLER END ==========\n');
  }

  // ═══════════ One-to-One — Kabul ═══════════
  @SubscribeMessage('one2one:accept')
  async handleOne2OneAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { fromUserId: string },
  ) {
    const acceptor = this.participants.get(client.id);
    if (!acceptor) {
      client.emit('room:error', { message: 'Oturum bulunamadı.' });
      return;
    }

    console.log(`[ONE2ONE:ACCEPT] ${acceptor.displayName} accepted invite from ${payload.fromUserId}`);

    // Davetçiyi bul
    let inviter: any = null;
    let inviterSocketId: string | null = null;
    this.participants.forEach((p, key) => {
      if (p.userId === payload.fromUserId || p.socketId === payload.fromUserId) {
        inviter = p;
        inviterSocketId = key;
      }
    });

    if (!inviter || !inviterSocketId) {
      client.emit('room:error', { message: 'Davetçi artık çevrimiçi değil.' });
      return;
    }

    // ★ Generate unique one2one room slug
    const roomSlug = `one2one-${Date.now()}`;

    // Davetçiye: "kabul eden kişi" bilgilerini gönder → overlay açılsın
    this.server.to(inviterSocketId).emit('one2one:start', {
      otherDisplayName: acceptor.displayName || 'Bilinmeyen',
      otherAvatar: acceptor.avatar || '',
      otherRole: acceptor.role || 'guest',
      otherUserId: acceptor.userId || acceptor.socketId,
      roomSlug,
    });

    // Kabul edene: "davetçi" bilgilerini gönder
    client.emit('one2one:start', {
      otherDisplayName: inviter.displayName || 'Bilinmeyen',
      otherAvatar: inviter.avatar || '',
      otherRole: inviter.role || 'guest',
      otherUserId: inviter.userId || inviter.socketId,
      roomSlug,
    });

    // Davetçiye toast gönder
    this.server.to(inviterSocketId).emit('room:toast', {
      type: 'success',
      title: 'Bire Bir Görüşme',
      message: `${acceptor.displayName} davetinizi kabul etti!`,
    });

    console.log(`[ONE2ONE:ACCEPT] Call started between ${inviter.displayName} <-> ${acceptor.displayName} in room ${roomSlug}`);
  }

  // ═══════════ One-to-One — Ret ═══════════
  @SubscribeMessage('one2one:reject')
  async handleOne2OneReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { fromUserId: string },
  ) {
    const rejector = this.participants.get(client.id);
    if (!rejector) return;

    console.log(`[ONE2ONE:REJECT] ${rejector.displayName} rejected invite from ${payload.fromUserId}`);

    // Davetçiyi bul ve bilgilendir
    let inviterSocketId: string | null = null;
    this.participants.forEach((p, key) => {
      if (p.userId === payload.fromUserId || p.socketId === payload.fromUserId) {
        inviterSocketId = key;
      }
    });

    if (inviterSocketId) {
      this.server.to(inviterSocketId).emit('room:toast', {
        type: 'error',
        title: 'Davet Reddedildi',
        message: `${rejector.displayName} bire bir davetinizi reddetti.`,
      });
    }
  }

  // ═══════════ One-to-One — Sonlandır ═══════════
  @SubscribeMessage('one2one:end')
  async handleOne2OneEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { otherUserId: string },
  ) {
    const ender = this.participants.get(client.id);
    if (!ender) return;

    console.log(`[ONE2ONE:END] ${ender.displayName} ended call with ${payload.otherUserId}`);

    // Karşı tarafı bul ve bilgilendir
    let otherSocketId: string | null = null;
    this.participants.forEach((p, key) => {
      if (p.userId === payload.otherUserId || p.socketId === payload.otherUserId) {
        otherSocketId = key;
      }
    });

    if (otherSocketId) {
      this.server.to(otherSocketId).emit('one2one:ended', {
        byDisplayName: ender.displayName || 'Bilinmeyen',
      });
      this.server.to(otherSocketId).emit('room:toast', {
        type: 'info',
        title: 'Görüşme Sonlandı',
        message: `${ender.displayName} görüşmeyi sonlandırdı.`,
      });
    }
  }

  // ═══════════ One-to-One — Özel Mesaj ═══════════
  @SubscribeMessage('one2one:message')
  async handleOne2OneMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { otherUserId: string; text: string },
  ) {
    const sender = this.participants.get(client.id);
    if (!sender || !payload.text?.trim()) return;

    const msgData = {
      id: `o2o-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: payload.text.trim(),
      senderDisplayName: sender.displayName || 'Bilinmeyen',
      senderAvatar: sender.avatar || '',
      senderRole: sender.role || 'guest',
      senderId: sender.userId || sender.socketId,
      timestamp: new Date().toISOString(),
    };

    // Karşı tarafı bul
    let otherSocketId: string | null = null;
    this.participants.forEach((p, key) => {
      if (p.userId === payload.otherUserId || p.socketId === payload.otherUserId) {
        otherSocketId = key;
      }
    });

    // Karşı tarafa gönder
    if (otherSocketId) {
      this.server.to(otherSocketId).emit('one2one:message', msgData);
    }

    // Gönderene de geri gönder (kendi mesajını görmesi için)
    client.emit('one2one:message', msgData);
  }

  // ═══════════ Admin Room Action ═══════════
  @SubscribeMessage('admin:roomAction')
  async handleRoomAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { action: string; roomId: string },
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    // Only Owner/SuperAdmin/Admin can perform room actions
    // (Simple check for now, can be more granular)
    if (getRoleLevel(actor.role) < ROLE_HIERARCHY['admin']) {
      client.emit('room:error', { message: 'Insufficient permissions' });
      return;
    }

    const { action, roomId: rawRoomId } = payload;
    // Scope roomId for tenant isolation
    const roomId = scopeRoomId(actor.tenantId, rawRoomId);
    this.logger.log(
      `Admin Room Action: ${actor.displayName} → ${action} in ${roomId}`,
    );

    switch (action) {
      case 'mute_all':
        // Release all speakers except the actor
        const speaker = this.roomSpeakers.get(roomId);
        if (speaker && speaker.userId !== actor.userId) {
          this.releaseSpeaker(roomId, 'force_taken');
          this.server.to(roomId).emit('room:notification', {
            type: 'info',
            message: 'Tüm mikrofonlar yönetici tarafından kapatıldı.',
          });
        }
        break;

      case 'close_room':
        try {
          // Resolve slug to ID
          const roomObj = await this.roomService.findBySlug(
            actor.tenantId,
            roomId,
          );
          if (roomObj) {
            await this.adminService.closeRoom(actor.userId, roomObj.id);
          }

          this.server.to(roomId).emit('room:closed', { by: actor.displayName });
          this.server.in(roomId).disconnectSockets(true);
          this.roomSpeakers.delete(roomId);
        } catch (e) {
          this.logger.error(`Failed to close room ${roomId}: ${e.message}`);
        }
        break;

      case 'record_start':
        // Mock recording start
        this.server.to(roomId).emit('room:notification', {
          type: 'error',
          message: 'Kayıt sistemi henüz aktif değil (Mock).',
        });
        break;

      default:
        this.logger.warn(`Unknown room action: ${action}`);
    }
  }

  /** Get mic duration based on role — reads from tenant settings with hardcoded fallbacks.
   * Returns null if no duration is configured (= unlimited).
   */
  private getMicDuration(role: string, tenantId?: string): number | null {
    const settings = tenantId ? this.tenantSettings.get(tenantId) : null;
    const roleLevel = getRoleLevel(role);

    if (settings) {
      // Admin+ → use admin duration or unlimited
      if (roleLevel >= ROLE_HIERARCHY['admin'] && settings.micDurationAdmin != null) {
        return settings.micDurationAdmin * 1000;
      }
      // VIP
      if (roleLevel >= ROLE_HIERARCHY['vip'] && settings.micDurationVip != null) {
        return settings.micDurationVip * 1000;
      }
      // Member
      if (roleLevel >= ROLE_HIERARCHY['member'] && settings.micDurationMember != null) {
        return settings.micDurationMember * 1000;
      }
      // Guest
      if (settings.micDurationGuest != null) {
        return settings.micDurationGuest * 1000;
      }
      // Settings exist but no duration configured for this role → unlimited
      return null;
    }

    // No settings at all → unlimited (don't apply a default limit)
    return null;
  }

  /** Release the current speaker for a room */
  private releaseSpeaker(
    roomId: string,
    reason: 'released' | 'timer_expired' | 'force_taken' | 'disconnected' | 'duel_started',
  ) {
    const speaker = this.roomSpeakers.get(roomId);
    if (!speaker) return;

    clearTimeout(speaker.timer);
    this.roomSpeakers.delete(roomId);

    const event =
      reason === 'timer_expired' ? 'mic:timer-expired' : 'mic:released';
    this.server.to(roomId).emit(event, {
      userId: speaker.userId,
      displayName: speaker.displayName,
      socketId: speaker.socketId,
      reason,
    });

    this.logger.log(
      `Mic released in ${roomId}: ${speaker.displayName} (reason=${reason})`,
    );
  }

  /** Auto-release if the disconnecting socket is the current speaker */
  private autoReleaseSpeaker(roomId: string, socketId: string) {
    const speaker = this.roomSpeakers.get(roomId);
    if (speaker && speaker.socketId === socketId) {
      this.releaseSpeaker(roomId, 'disconnected');
    }
  }


  @SubscribeMessage('mic:release')
  handleMicRelease(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    const roomId = participant.roomId; // scoped roomId

    // ★ DUEL AUTO-FORFEIT on mic release — düello katılımcısı mikrofonu bırakırsa kaybeder
    // Düello mikrofonları roomSpeakers'a eklenmediği için bu kontrolü ÖNCEden yapmak gerekir
    const activeDuel = this.activeDuels.get(roomId);
    if (activeDuel && activeDuel.status === 'active') {
      const isDuelist = activeDuel.challengerId === participant.userId || activeDuel.opponentId === participant.userId;
      if (isDuelist) {
        this.logger.log(`[DUEL] Mic released by duelist ${participant.displayName} — auto-forfeit triggered`);
        this.autoDuelForfeit(roomId, participant.userId, participant.displayName, 'mic_released');
        return; // Düello bitti, normal release'e gerek yok
      }
    }

    const currentSpeaker = this.roomSpeakers.get(roomId);

    // Only the current speaker can release (or if no speaker, ignore)
    if (!currentSpeaker) return;

    // ★ FIX: socketId değişmiş olabilir (reconnect sonrası). userId ile de kontrol et.
    if (currentSpeaker.socketId !== client.id) {
      if (currentSpeaker.userId === participant.userId) {
        // Aynı kullanıcı, farklı socket (reconnect) — socketId güncelle ve devam et
        this.logger.log(`🎤 mic:release socketId mismatch but userId matches — updating socketId and releasing`);
        currentSpeaker.socketId = client.id;
      } else {
        return; // Farklı kullanıcı, izin verme
      }
    }

    this.releaseSpeaker(roomId, 'released');
  }

  @SubscribeMessage('mic:force-take')
  handleMicForceTake(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; targetSocketId?: string },
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    // ★ BAN CHECK — Banlı kullanıcılar mikrofon alamaz
    if (actor.isBanned) {
      client.emit('room:toast', { type: 'error', title: 'Yasak', message: 'Yasaklı olduğunuz için mikrofon kullanamazsınız.' });
      return;
    }

    const roomId = actor.roomId; // scoped roomId
    const currentSpeaker = this.roomSpeakers.get(roomId);

    if (!currentSpeaker) {
      // No one speaking, grant to actor immediately
      const duration = this.getMicDuration(actor.role, actor.tenantId);
      const startedAt = Date.now();

      // ★ FIX: duration null ise (sınırsız) timer oluşturma!
      const timer = duration != null ? setTimeout(() => {
        this.releaseSpeaker(roomId, 'timer_expired');
      }, duration) : null;

      this.roomSpeakers.set(roomId, {
        socketId: client.id,
        userId: actor.userId,
        displayName: actor.displayName,
        role: actor.role,
        startedAt,
        duration,
        timer,
      });

      this.server.to(roomId).emit('mic:acquired', {
        userId: actor.userId,
        displayName: actor.displayName,
        socketId: client.id,
        role: actor.role,
        startedAt,
        duration,
      });

      this.logger.log(
        `Mic force-taken (silent room) in ${roomId}: ${actor.displayName}`,
      );
      return;
    }

    // Enforce hierarchy: actor must outrank current speaker
    if (
      !isHigherRole(actor.role, currentSpeaker.role) &&
      actor.role.toLowerCase() !== 'owner'
    ) {
      client.emit('mic:denied', {
        reason: 'insufficient_rank',
        currentSpeaker: {
          userId: currentSpeaker.userId,
          displayName: currentSpeaker.displayName,
        },
      });
      return;
    }

    // Notify the displaced speaker
    this.server.to(currentSpeaker.socketId).emit('mic:force-released', {
      by: actor.displayName,
      byRole: actor.role,
    });

    // Release old speaker and grant to actor
    this.releaseSpeaker(roomId, 'force_taken');

    // Now grant mic to the actor
    const duration = this.getMicDuration(actor.role, actor.tenantId);
    const startedAt = Date.now();

    // ★ FIX: duration null ise (sınırsız) timer oluşturma!
    const timer = duration != null ? setTimeout(() => {
      this.releaseSpeaker(roomId, 'timer_expired');
    }, duration) : null;

    this.roomSpeakers.set(roomId, {
      socketId: client.id,
      userId: actor.userId,
      displayName: actor.displayName,
      role: actor.role,
      startedAt,
      duration,
      timer,
    });

    this.server.to(roomId).emit('mic:acquired', {
      userId: actor.userId,
      displayName: actor.displayName,
      socketId: client.id,
      role: actor.role,
      startedAt,
      duration,
    });

    this.logger.log(
      `Mic force-taken in ${roomId}: ${actor.displayName} took from ${currentSpeaker.displayName}`,
    );
  }

  // ═══════════ Direct Messages (DM) ═══════════

  @SubscribeMessage('dm:send')
  handleDmSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: string; content: string },
  ) {
    const sender = this.participants.get(client.id);
    // Fallback: backend restart sonrası participants Map boş olabilir
    const senderUser = sender || (client.data?.user ? {
      userId: client.data.user.sub || client.data.user.userId,
      displayName: client.data.user.displayName || client.data.user.username || 'Unknown',
      role: client.data.user.role || 'guest',
      tenantId: client.data.user.tenantId || 'default',
    } : null);
    if (!senderUser) return;

    // ─── GUEST DM PERMISSION CHECK ──────────────────────────
    if (senderUser.role === 'guest') {
      const settings = this.tenantSettings.get(senderUser.tenantId);
      if (settings && !settings.guestPrivateMessage) {
        client.emit('dm:error', { message: 'Misafirler özel mesaj gönderemez.' });
        return;
      }
    }

    const { content, targetUserId } = payload;
    if (!content?.trim() || !targetUserId) return;

    const { socketId: targetSocketId, participant: target } =
      this.findTargetSocket(targetUserId);

    if (!targetSocketId || !target) {
      client.emit('dm:error', { message: 'Kullanıcı bulunamadı.' });
      return;
    }

    const dmMessage = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: senderUser.displayName,
      fromUserId: senderUser.userId,
      to: target.displayName,
      toUserId: target.userId,
      message: content.trim(),
      timestamp: Date.now(),
    };

    // Send to target
    this.server.to(targetSocketId).emit('dm:receive', {
      ...dmMessage,
      isSelf: false,
    });

    // Send confirmation back to sender
    client.emit('dm:receive', {
      ...dmMessage,
      isSelf: true,
    });

    this.logger.log(
      `[DM] ${senderUser.displayName} → ${target.displayName}: ${content.trim().slice(0, 50)}`,
    );

    // ★ Push Notification — hedef kullanıcı offline olabilir, push gönder
    this.sendDmPushIfNeeded(target.userId, senderUser.displayName, content.trim()).catch(() => {});
  }

  /**
   * DM push bildirimi — hedef kullanıcının expoPushToken'ı varsa gönder
   */
  private async sendDmPushIfNeeded(targetUserId: string, senderName: string, content: string) {
    try {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { expoPushToken: true },
      });
      if (targetUser?.expoPushToken) {
        await this.pushService.sendDMNotification(
          targetUser.expoPushToken,
          senderName,
          content,
          { fromUserId: targetUserId },
        );
      }
    } catch (e) {
      this.logger.warn(`[PUSH:DM] Failed: ${e}`);
    }
  }

  /**
   * Gift push bildirimi — alıcının expoPushToken'ı varsa gönder
   */
  private async sendGiftPushIfNeeded(receiverId: string, senderName: string, giftName: string, roomSlug?: string) {
    try {
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { expoPushToken: true },
      });
      if (receiver?.expoPushToken) {
        await this.pushService.sendGiftNotification(
          receiver.expoPushToken,
          senderName,
          giftName,
          { roomSlug: roomSlug || '' },
        );
      }
    } catch (e) {
      this.logger.warn(`[PUSH:GIFT] Failed: ${e}`);
    }
  }

  // ─── DM NUDGE (MSN-style screen shake via DM) ───
  @SubscribeMessage('dm:nudge')
  handleDmNudge(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUsername: string },
  ) {
    const sender = this.participants.get(client.id);
    if (!sender) return;

    const { targetUsername } = payload;
    if (!targetUsername) return;

    // Cooldown: 5 saniye — aynı kullanıcıya tekrar nudge atılamaz
    const cooldownKey = `nudge:${sender.userId}:${targetUsername}`;
    const lastNudge = this._duelReactionCooldowns.get(cooldownKey) || 0;
    if (Date.now() - lastNudge < 5000) {
      client.emit('room:toast', { type: 'warning', title: 'Bekle', message: 'Titretmek için 5 saniye bekle.' });
      return;
    }
    this._duelReactionCooldowns.set(cooldownKey, Date.now());

    // Find target by displayName in same room
    let targetSocketId: string | null = null;
    let targetParticipant: any = null;
    for (const [sid, p] of this.participants.entries()) {
      if (p.displayName === targetUsername && p.roomId === sender.roomId) {
        targetSocketId = sid;
        targetParticipant = p;
        break;
      }
    }

    if (!targetSocketId || !targetParticipant) {
      client.emit('room:toast', { type: 'error', title: 'Hata', message: 'Kullanıcı bulunamadı.' });
      return;
    }

    // Send nudge to target
    this.server.to(targetSocketId).emit('dm:nudge-received', {
      from: sender.displayName,
      fromUserId: sender.userId,
    });

    // Confirmation to sender
    client.emit('room:toast', { type: 'info', title: '📳 Titretme', message: `${targetParticipant.displayName} titretildi!` });
    this.logger.log(`[DM-NUDGE] ${sender.displayName} nudged ${targetParticipant.displayName} via DM`);
  }

  @SubscribeMessage('dm:typing')
  handleDmTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: string; isTyping: boolean },
  ) {
    const sender = this.participants.get(client.id) || (client.data?.user ? {
      userId: client.data.user.sub || client.data.user.userId,
      displayName: client.data.user.displayName || client.data.user.username || 'Unknown',
    } : null) as any;
    if (!sender) return;

    const { socketId: targetSocketId } =
      this.findTargetSocket(payload.targetUserId);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('dm:typing', {
        fromUserId: sender.userId,
        from: sender.displayName,
        isTyping: payload.isTyping,
      });
    }
  }

  // ═══════════ Helpers ═══════════

  /** Find a target socket by userId, socketId, or guestId */
  private findTargetSocket(targetUserId: string): {
    socketId: string | undefined;
    participant: InMemoryParticipant | undefined;
  } {
    for (const [sid, p] of this.participants.entries()) {
      if (
        p.userId === targetUserId ||
        p.socketId === targetUserId ||
        (p.guestId && p.guestId === targetUserId)
      ) {
        return { socketId: sid, participant: p };
      }
    }
    return { socketId: undefined, participant: undefined };
  }

  /** Broadcasts an updated participant list to each socket in a room, filtered by their role.
   *  Debounced: if called multiple times for the same room within 200ms, only the last call executes. */
  private broadcastParticipants(roomId: string) {
    // Clear existing debounce timer for this room
    const existing = this.broadcastDebounce.get(roomId);
    if (existing) clearTimeout(existing);

    // Schedule broadcast with 50ms debounce (fast enough for near-instant updates)
    const timer = setTimeout(() => {
      this.broadcastDebounce.delete(roomId);
      this._doBroadcastParticipants(roomId);
    }, 50);
    this.broadcastDebounce.set(roomId, timer);
  }

  /** Actual broadcast implementation (called by debounced wrapper) */
  private _doBroadcastParticipants(roomId: string) {
    // ★ UNION: Combine adapter room AND participants map to ensure NO socket is missed
    const socketIds = new Set<string>();

    // Source 1: Socket.IO adapter room
    const adapterRoom = this.server?.sockets?.adapter?.rooms?.get(roomId);
    if (adapterRoom) {
      for (const sid of adapterRoom) socketIds.add(sid);
    }

    // Source 2: In-memory participants map (catches sockets not yet in adapter room)
    this.participants.forEach((p, sid) => {
      if (p.roomId === roomId) socketIds.add(sid);
    });

    // ★ Source 3: roomSlug fallback — farklı tenantId'lerle aynı odada olan kullanıcıları yakala
    // Bu, tenantId uyumsuzluğu durumunda bile tüm katılımcılara broadcast yapılmasını sağlar
    const roomSlug = roomId.includes(':') ? roomId.split(':').slice(1).join(':') : roomId;
    if (socketIds.size === 0) {
      this.participants.forEach((p, sid) => {
        if (p.roomSlug === roomSlug) socketIds.add(sid);
      });
      if (socketIds.size > 0) {
        this.logger.warn(`[broadcastParticipants] SLUG FALLBACK: roomId=${roomId} had 0 sockets, found ${socketIds.size} via roomSlug=${roomSlug}`);
      }
    } else {
      // Scoped roomId ile bulunanların yanına, aynı slug'daki farklı tenant kullananları da ekle
      this.participants.forEach((p, sid) => {
        if (p.roomSlug === roomSlug && !socketIds.has(sid)) {
          socketIds.add(sid);
          this.logger.warn(`[broadcastParticipants] CROSS-TENANT: Added ${p.displayName} (roomId=${p.roomId}) to broadcast for ${roomId}`);
        }
      });
    }

    this.logger.log(`[broadcastParticipants] roomId=${roomId} | sockets=${socketIds.size} | adapter=${adapterRoom?.size || 0}`);
    if (socketIds.size === 0) return;

    for (const socketId of socketIds) {
      const viewer = this.participants.get(socketId);
      if (!viewer) continue;

      // ★ getRoomParticipants'a viewer'in kendi roomId'sini ver — böylece aynı slug'daki herkes GÖRÜNÜR
      const viewerRoomId = viewer.roomId;
      const filtered = this.getRoomParticipantsMultiTenant(
        roomSlug,
        viewer.userId,
        viewer.role,
      );

      const mapped = filtered.map((p) => {
        // GodMaster disguised mode: mask appearance
        const isDisguised = p.role?.toLowerCase() === 'godmaster' && p.visibilityMode === 'disguised';
        const viewerIsGodMaster = viewer.role?.toLowerCase() === 'godmaster';
        const isSelf = p.userId === viewer.userId;

        // Self sees disguised appearance too (for visual confirmation), but keeps real role for controls
        const showDisguisedAppearance = isDisguised && (isSelf || !viewerIsGodMaster);
        // Only mask role for non-godmaster, non-self viewers
        const showDisguisedRole = isDisguised && !isSelf && !viewerIsGodMaster;

        return {
          userId: p.userId,
          displayName: (showDisguisedAppearance || showDisguisedRole) ? (p.disguisedName || 'Misafir') : p.displayName,
          avatar: (showDisguisedAppearance || showDisguisedRole) ? `/avatars/neutral_1.png` : p.avatar,
          role: showDisguisedRole ? 'guest' : p.role,
          socketId: p.socketId,
          isStealth: p.isStealth,
          status: p.status,
          isMuted: p.isMuted,
          isGagged: p.isGagged,
          isCamBlocked: p.isCamBlocked,
          isBanned: p.isBanned,
          nameColor: (showDisguisedAppearance || showDisguisedRole) ? undefined : p.nameColor,
          godmasterIcon: (showDisguisedAppearance || showDisguisedRole) ? undefined : p.godmasterIcon,
          visibilityMode: (isSelf || viewerIsGodMaster) ? p.visibilityMode : undefined,
          platform: p.platform || 'web',
        };
      });

      this.server.to(socketId).emit('room:participants', {
        participants: mapped,
      });
    }
  }


  // ═══════════ MIC QUEUE HANDLERS ═══════════

  @SubscribeMessage('mic:take')
  async handleMicTake(
    @MessageBody() data: { roomId: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    const participant = this.participants.get(client.id);
    if (!user || !participant) return;

    // Use authenticated user.sub (JWT) — ignore client-sent userId which may mismatch
    const userId = user.sub;

    // ★ BAN CHECK — Banlı kullanıcılar mikrofon alamaz
    if (participant.isBanned) {
      client.emit('room:toast', { type: 'error', title: 'Yasak', message: 'Yasaklı olduğunuz için mikrofon kullanamazsınız.' });
      return;
    }

    // ★ DUEL LOCK — Düello sırasında doğrudan mic alınamaz (sıraya girilebilir)
    const activeDuel = this.activeDuels.get(participant.roomId);
    if (activeDuel && (activeDuel.status === 'active' || activeDuel.status === 'voting')) {
      client.emit('room:toast', { type: 'info', title: 'Düello Devam Ediyor', message: 'Düello bitince mikrofon alabilirsiniz. Mikrofon sırasına girebilirsiniz.' });
      return;
    }

    const roomId = participant.roomId; // scoped roomId

    // Check if someone is speaking
    const currentSpeaker = this.roomSpeakers.get(roomId);
    if (currentSpeaker) {
      if (currentSpeaker.userId === userId) return;
      client.emit('mic:error', { message: 'Mikrofon şu an dolu.' });
      return;
    }

    // Grant mic immediately
    const duration = this.getMicDuration(user.role, user.tenantId);
    const startedAt = Date.now();

    // ★ FIX: duration null ise (sınırsız) timer oluşturma!
    // setTimeout(fn, null) = setTimeout(fn, 0) → anında release oluyordu
    const timer = duration != null ? setTimeout(() => {
      this.releaseSpeaker(roomId, 'timer_expired');
    }, duration) : null;

    const speakerState: SpeakerState = {
      socketId: client.id,
      userId: user.sub,
      displayName: user.username,
      role: user.role,
      startedAt,
      duration,
      timer,
    };

    this.roomSpeakers.set(roomId, speakerState);

    // Broadcast
    this.server.to(roomId).emit('mic:acquired', {
      userId: user.sub,
      displayName: user.username,
      socketId: client.id,
      role: user.role,
      startedAt,
      duration,
    });

    // Also remove from queue if they were in it
    const queue = this.micQueues.get(roomId) || [];
    if (queue.includes(userId)) {
      const newQueue = queue.filter(id => id !== userId);
      this.micQueues.set(roomId, newQueue);
      this.server.to(roomId).emit('mic:queue-updated', newQueue);
    }

    this.logger.log(`mic:take success: ${user.username}`);
  }


  @SubscribeMessage('mic:request')
  async handleMicRequest(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    const participant = this.participants.get(client.id);

    if (!user || !participant) {
      return;
    }

    // Use authenticated user.sub (JWT) — ignore client-sent userId which may mismatch
    const userId = user.sub;

    // ★ BAN CHECK — Banlı kullanıcılar mikrofon alamaz
    if (participant.isBanned) {
      client.emit('room:toast', { type: 'error', title: 'Yasak', message: 'Yasaklı olduğunuz için mikrofon kullanamazsınız.' });
      return;
    }

    // ★ DUEL LOCK — Düello sırasında sıraya girebilir ama bilgi verilir
    const activeDuel = this.activeDuels.get(participant.roomId);
    if (activeDuel && (activeDuel.status === 'active' || activeDuel.status === 'voting')) {
      client.emit('room:toast', { type: 'info', title: 'Düello Devam Ediyor', message: 'Sıraya girdiniz. Düello bitince sıranız gelecek.' });
      // Sıraya eklemeye devam et (aşağıdaki kod çalışacak)
    }
    const roomId = participant.roomId; // scoped roomId

    // Check if user is already speaker
    const currentSpeaker = this.roomSpeakers.get(roomId);
    if (currentSpeaker && currentSpeaker.userId === userId) {
      return;
    }

    // Get current queue
    const queue = this.micQueues.get(roomId) || [];

    // Add if not present
    if (!queue.includes(userId)) {
      queue.push(userId);
      this.micQueues.set(roomId, queue);

      // Broadcast update
      this.server.to(roomId).emit('mic:queue-updated', queue);
      this.logger.log(`🎤 User ${userId} joined mic queue in ${roomId}. Queue: ${queue.length}`);
    }
  }

  @SubscribeMessage('mic:leave-queue')
  async handleMicLeaveQueue(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const user = client.data.user;
    const participant = this.participants.get(client.id);
    if (!participant) return;
    const roomId = participant.roomId; // scoped roomId

    // Check permission if removing someone else
    if (user.sub !== userId) {
      const actorLevel = getRoleLevel(user.role);
      if (actorLevel < 3) return; // Only operator+ can remove others
    }

    const queue = this.micQueues.get(roomId) || [];
    if (queue.includes(userId)) {
      const newQueue = queue.filter(id => id !== userId);
      this.micQueues.set(roomId, newQueue);

      this.server.to(roomId).emit('mic:queue-updated', newQueue);
      this.logger.log(`🎤 User ${userId} left mic queue in ${roomId}`);
    }
  }

  @SubscribeMessage('mic:grant')
  async handleMicGrant(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const actor = client.data.user;
    if (getRoleLevel(actor.role) < 3) return; // Operator+ required

    const { userId } = data;
    const actorParticipant = this.participants.get(client.id);
    if (!actorParticipant) return;
    const roomId = actorParticipant.roomId; // scoped roomId
    const queue = this.micQueues.get(roomId) || [];

    // Remove from queue
    const newQueue = queue.filter(id => id !== userId);
    this.micQueues.set(roomId, newQueue);

    // Broadcast queue update
    this.server.to(roomId).emit('mic:queue-updated', newQueue);

    // Notify target user
    const sockets = await this.server.in(roomId).fetchSockets();
    // @ts-ignore
    const targetSocket = sockets.find(s => s.data.user?.sub === userId);

    if (targetSocket) {
      targetSocket.emit('mic:granted', { grantedBy: actor.username });
      this.server.to(roomId).emit('mic:user-granted', { userId, grantedBy: actor.username });
    }

    this.logger.log(`🎤 Mic granted to ${userId} by ${actor.username}`);
  }

  @SubscribeMessage('mic:deny')
  async handleMicDeny(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const actor = client.data.user;
    if (getRoleLevel(actor.role) < 3) return;

    const { userId } = data;
    const actorParticipant = this.participants.get(client.id);
    if (!actorParticipant) return;
    const roomId = actorParticipant.roomId; // scoped roomId
    const queue = this.micQueues.get(roomId) || [];

    // Remove from queue
    const newQueue = queue.filter(id => id !== userId);
    this.micQueues.set(roomId, newQueue);

    this.server.to(roomId).emit('mic:queue-updated', newQueue);

    // Notify target
    const sockets = await this.server.in(roomId).fetchSockets();
    // @ts-ignore
    const targetSocket = sockets.find(s => s.data.user?.sub === userId);

    if (targetSocket) {
      targetSocket.emit('mic:denied', { deniedBy: actor.username });
    }

    this.logger.log(`🎤 Mic denied for ${userId} by ${actor.username}`);
  }

  // ─── ADMIN: REFRESH SETTINGS (broadcast to all tenant sockets) ──
  @SubscribeMessage('admin:refreshSettings')
  async handleRefreshSettings(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;
    const tenantId = user.tenantId || 'default';

    try {
      // ★ Cache'i invalidate et — admin yeni ayar kaydetti, eski cache'i kullanma
      const resolvedTenantId = tenantId === 'default'
        ? (await this.adminService.findDefaultTenant())?.id || tenantId
        : tenantId;
      this.tenantSettings.delete(resolvedTenantId);
      this.tenantSettingsExpiry.delete(resolvedTenantId);

      const settings = await this.loadTenantSettings(resolvedTenantId);
      if (!settings) return;

      // Spread all settings, excluding internal DB fields
      const { id, tenantId: _tid, createdAt, updatedAt, tenant, ...payload } = settings as any;

      this.logger.log(`⚙️ [refreshSettings] tenant=${tenantId} payload keys: ${Object.keys(payload).join(', ')}`);
      this.logger.log(`⚙️ [refreshSettings] rolePermissions: ${JSON.stringify(payload.rolePermissions || 'NULL')}`);
      this.logger.log(`⚙️ [refreshSettings] duelEnabled=${payload.duelEnabled} nudgeEnabled=${payload.nudgeEnabled}`);

      // Broadcast to ALL connected sockets in this tenant
      const allSockets = await this.server.fetchSockets();
      let broadcastCount = 0;
      for (const s of allSockets) {
        // @ts-ignore
        const socketTenant = s.data.user?.tenantId || 'default';
        if (socketTenant === tenantId) {
          s.emit('settings:updated', payload);
          broadcastCount++;
        }
      }

      this.logger.log(`⚙️ Settings refreshed for tenant ${user.tenantId}, broadcast to ${broadcastCount} sockets`);
    } catch (e) {
      this.logger.warn(`Could not refresh settings: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TV: SET YOUTUBE (Owner+ can play YouTube on TV)
  // ═══════════════════════════════════════════════════════════
  @SubscribeMessage('tv:setYoutube')
  async handleTvSetYoutube(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { url?: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    const actor = this.participants.get(client.id);
    if (!actor) return;

    // Admin+ only (level 5+)
    const roleLevel = getRoleLevel(actor.role || 'guest');
    if (roleLevel < ROLE_HIERARCHY['admin']) {
      return { error: 'Bu özelliği kullanmak için yetkiniz yok.' };
    }

    const roomSlug = actor.roomSlug;
    const scopedRoom = actor.roomId; // already scoped as tenantId:roomSlug
    if (!scopedRoom) return;

    const youtubeUrl = data?.url?.trim() || null;

    // ★ HIERARCHY CHECK — yayını açan kişi daha yüksek yetkili ise alt yetkililer müdahale edemez
    const existingBroadcast = this.roomYoutubeUrls.get(scopedRoom);
    if (existingBroadcast && existingBroadcast.setByLevel > roleLevel) {
      this.logger.warn(`📺 TV YouTube BLOCKED — ${actor.displayName} (level ${roleLevel}) cannot override broadcast by ${existingBroadcast.setBy} (level ${existingBroadcast.setByLevel})`);
      return { error: `Bu yayını sadece ${existingBroadcast.setBy} veya daha yetkili biri durdurabilir.` };
    }

    this.logger.log(`📺 TV YouTube ${youtubeUrl ? 'SET' : 'CLEARED'} by ${actor.displayName} in ${roomSlug}`);

    // Store/clear YouTube URL in memory for newcomer sync
    if (youtubeUrl) {
      this.roomYoutubeUrls.set(scopedRoom, {
        url: youtubeUrl,
        setBy: actor.displayName,
        setByLevel: roleLevel,
        setByRole: actor.role || 'admin',
      });
    } else {
      this.roomYoutubeUrls.delete(scopedRoom);
    }

    // Broadcast to all users in the room (include setByLevel for frontend hierarchy control)
    this.server.to(scopedRoom).emit('tv:youtubeUpdate', {
      url: youtubeUrl,
      setBy: actor.displayName,
      setByLevel: roleLevel,
    });

    return { success: true, url: youtubeUrl };
  }



  // ═══════════════════════════════════════════════════════════
  //  ADMIN: GET TENANT INFO (Hakkında Sayfası)
  // ═══════════════════════════════════════════════════════════
  @SubscribeMessage('admin:getTenantInfo')
  async handleGetTenantInfo(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data?.user;
      if (!user) {
        client.emit('admin:tenantInfo', { error: 'Yetkisiz erişim' });
        return;
      }

      let tenantId = user.tenantId;
      // Eski JWT fallback
      if (!tenantId || tenantId === 'default') {
        const defaultTenant = await this.adminService.findDefaultTenant();
        if (defaultTenant) tenantId = defaultTenant.id;
      }

      // Prisma'dan tenant bilgilerini çek
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          packageType: true,
          status: true,
          roomLimit: true,
          userLimitPerRoom: true,
          maxConcurrentRooms: true,
          createdAt: true,
          expiresAt: true,
          billingPeriod: true,
          logoUrl: true,
          primaryColor: true,
        },
      });

      if (!tenant) {
        client.emit('admin:tenantInfo', { error: 'Tenant bulunamadı' });
        return;
      }

      // ★ Oda sayıları: normal + toplantı ayrı
      const normalRooms = await this.prisma.room.count({ where: { tenantId, isMeetingRoom: false } });
      const meetingRooms = await this.prisma.room.count({ where: { tenantId, isMeetingRoom: true } });

      // ★ Kullanıcı sayısı: GodMaster hariç (gizli her yerde)
      const users = await this.prisma.user.count({
        where: { tenantId, role: { not: 'godmaster' } },
      });

      // ★ Çevrimiçi sayısı: in-memory socket Map'ten (DB yerine — gerçek zamanlı)
      let onlineCount = 0;
      this.participants.forEach((p) => {
        if (p.tenantId === tenantId && p.role?.toLowerCase() !== 'godmaster') {
          onlineCount++;
        }
      });

      client.emit('admin:tenantInfo', {
        tenant: {
          ...tenant,
          createdAt: tenant.createdAt?.toISOString(),
          expiresAt: tenant.expiresAt?.toISOString(),
        },
        stats: {
          totalRooms: normalRooms,
          meetingRooms,
          totalUsers: users,
          onlineUsers: onlineCount,
        },
      });

      this.logger.log(`ℹ️ Tenant info sent to ${user.displayName}`);
    } catch (e) {
      this.logger.warn(`Could not get tenant info: ${e.message}`);
      client.emit('admin:tenantInfo', { error: 'Bilgi alınamadı' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ═══════════ DUEL (Eristik Düello Arenası) ═══════════════════
  // ═══════════════════════════════════════════════════════════════

  @SubscribeMessage('duel:challenge')
  async handleDuelChallenge(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: string },
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    // Minimum rol kontrolü: member+ düello başlatabilir
    const actorLevel = getRoleLevel(actor.role);
    if (actorLevel < ROLE_HIERARCHY['member']) {
      client.emit('room:toast', { type: 'error', title: 'Yetki Yok', message: 'Düello başlatmak için üye olmanız gerekir.' });
      return;
    }

    // Hedef kullanıcıyı bul
    let targetSocket: string | null = null;
    let targetParticipant: InMemoryParticipant | null = null;
    for (const [sid, p] of this.participants.entries()) {
      if (p.userId === payload.targetUserId && p.roomId === actor.roomId) {
        targetSocket = sid;
        targetParticipant = p;
        break;
      }
    }
    if (!targetParticipant || !targetSocket) {
      client.emit('room:toast', { type: 'error', title: 'Hata', message: 'Kullanıcı bulunamadı.' });
      return;
    }

    // Kendine meydan okuyamaz
    if (targetParticipant.userId === actor.userId) {
      client.emit('room:toast', { type: 'error', title: 'Hata', message: 'Kendinize meydan okuyamazsınız!' });
      return;
    }

    // Bu odada zaten aktif düello var mı?
    if (this.activeDuels.has(actor.roomId)) {
      client.emit('room:toast', { type: 'warning', title: 'Düello', message: 'Bu odada zaten bir düello devam ediyor!' });
      return;
    }

    // Düello state oluştur (pending)
    const duelId = `duel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const duel: DuelState = {
      id: duelId,
      roomId: actor.roomId,
      tenantId: actor.tenantId || '',
      challengerId: actor.userId,
      challengerName: actor.displayName,
      challengerAvatar: actor.avatar || '',
      challengerSocketId: client.id,
      opponentId: targetParticipant.userId,
      opponentName: targetParticipant.displayName,
      opponentAvatar: targetParticipant.avatar || '',
      opponentSocketId: targetSocket,
      startedAt: 0,
      duration: 180_000, // 3 dakika
      reactions: {
        [actor.userId]: { fallacy: 0, logical: 0, derailed: 0 },
        [targetParticipant.userId]: { fallacy: 0, logical: 0, derailed: 0 },
      },
      votes: new Map(),
      status: 'pending',
    };

    this.activeDuels.set(actor.roomId, duel);

    // Rakibe meydan okuma gönder
    this.server.to(duel.opponentSocketId).emit('duel:challenge-received', {
      duelId,
      challengerName: actor.displayName,
      challengerAvatar: duel.challengerAvatar,
    });

    // Meydan okuyana onay
    client.emit('room:toast', { type: 'info', title: '⚔️ Düello', message: `${targetParticipant.displayName} kullanıcısına meydan okuma gönderildi!` });

    // 30 saniye içinde kabul edilmezse otomatik iptal
    duel.timer = setTimeout(() => {
      if (duel.status === 'pending') {
        this.activeDuels.delete(actor.roomId);
        this.server.to(duel.challengerSocketId).emit('room:toast', { type: 'warning', title: 'Düello', message: 'Meydan okuma zaman aşımına uğradı.' });
        this.server.to(duel.opponentSocketId).emit('duel:challenge-expired', { duelId });
      }
    }, 30_000);

    this.logger.log(`[DUEL] ${actor.displayName} challenged ${targetParticipant.displayName} in room ${actor.roomSlug}`);
  }

  @SubscribeMessage('duel:accept')
  async handleDuelAccept(
    @ConnectedSocket() client: Socket,
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    const duel = this.activeDuels.get(actor.roomId);
    if (!duel || duel.status !== 'pending' || duel.opponentId !== actor.userId) {
      client.emit('room:toast', { type: 'error', title: 'Hata', message: 'Aktif bir düello daveti bulunamadı.' });
      return;
    }

    // Zamanlayıcıyı temizle
    if (duel.timer) clearTimeout(duel.timer);

    // Düelloyu başlat
    duel.status = 'active';
    duel.startedAt = Date.now();

    const roomId = duel.roomId;

    // ★ MIC LOCK — Mevcut konuşmacıyı serbest bırak (düellocular alsın)
    const currentSpeaker = this.roomSpeakers.get(roomId);
    if (currentSpeaker) {
      this.releaseSpeaker(roomId, 'duel_started');
    }

    // Odadaki herkese broadcast
    this.server.to(roomId).emit('duel:started', {
      duelId: duel.id,
      challengerId: duel.challengerId,
      challengerName: duel.challengerName,
      challengerAvatar: duel.challengerAvatar,
      opponentId: duel.opponentId,
      opponentName: duel.opponentName,
      opponentAvatar: duel.opponentAvatar,
      duration: duel.duration / 1000,
    });

    // ★ DUAL MIC GRANT — Her iki düellocuya mic ver (aynı anda konuşabilirler)
    const duelDuration = duel.duration;
    const startedAt = Date.now();

    // Challenger mic
    this.server.to(roomId).emit('mic:acquired', {
      userId: duel.challengerId,
      displayName: duel.challengerName,
      socketId: duel.challengerSocketId,
      role: 'duelist',
      startedAt,
      duration: duelDuration,
      isDuel: true,
    });

    // Opponent mic
    this.server.to(roomId).emit('mic:acquired', {
      userId: duel.opponentId,
      displayName: duel.opponentName,
      socketId: duel.opponentSocketId,
      role: 'duelist',
      startedAt,
      duration: duelDuration,
      isDuel: true,
    });

    // Geri sayım tick'i
    let remaining = duel.duration / 1000;
    duel.tickInterval = setInterval(() => {
      remaining--;
      this.server.to(roomId).emit('duel:tick', { remaining, duelId: duel.id });
      if (remaining <= 0) {
        if (duel.tickInterval) clearInterval(duel.tickInterval);
        this.startDuelVoting(roomId);
      }
    }, 1000);

    this.logger.log(`[DUEL] Duel started: ${duel.challengerName} vs ${duel.opponentName} in room ${actor.roomSlug}`);
  }

  @SubscribeMessage('duel:reject')
  async handleDuelReject(
    @ConnectedSocket() client: Socket,
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    const duel = this.activeDuels.get(actor.roomId);
    if (!duel || duel.status !== 'pending' || duel.opponentId !== actor.userId) return;

    if (duel.timer) clearTimeout(duel.timer);
    this.activeDuels.delete(actor.roomId);

    // ★ Challenger'a duel:challenge-rejected event'i gönder — frontend DuelArena'daki
    // onRejected handler tetiklenir ve room page'deki toast bildirimi gösterilir
    this.server.to(duel.challengerSocketId).emit('duel:challenge-rejected', {
      opponentName: actor.displayName,
    });
    client.emit('room:toast', { type: 'info', title: 'Düello', message: 'Meydan okumayı reddettiniz.' });

    // Broadcast to room that duel was cancelled
    this.server.to(actor.roomId).emit('duel:cancelled', { duelId: duel.id });

    this.logger.log(`[DUEL] ${actor.displayName} rejected duel from ${duel.challengerName}`);
  }

  @SubscribeMessage('duel:reaction')
  async handleDuelReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { type: 'fallacy' | 'logical' | 'derailed'; targetId: string },
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    const duel = this.activeDuels.get(actor.roomId);
    if (!duel || duel.status !== 'active') return;

    // Tartışmacılar kendilerine reaksiyon veremez (sadece dinleyiciler)
    if (actor.userId === duel.challengerId || actor.userId === duel.opponentId) {
      return;
    }

    // Target tartışmacı olmalı
    if (payload.targetId !== duel.challengerId && payload.targetId !== duel.opponentId) return;

    // Geçerli reaksiyon tipi kontrolü
    if (!['fallacy', 'logical', 'derailed'].includes(payload.type)) return;

    // ★ RATE LIMIT — Kullanıcı başına 3 saniyede 1 reaksiyon
    const cooldownKey = `${duel.id}:${actor.userId}`;
    const now = Date.now();
    if (!this._duelReactionCooldowns) this._duelReactionCooldowns = new Map();
    const lastReaction = this._duelReactionCooldowns.get(cooldownKey);
    if (lastReaction && now - lastReaction < 3000) {
      client.emit('room:toast', { type: 'warning', title: 'Yavaş Ol', message: 'Reaksiyonlar arası en az 3 saniye bekle.' });
      return;
    }
    this._duelReactionCooldowns.set(cooldownKey, now);

    // Reaksiyonu say
    if (duel.reactions[payload.targetId]) {
      duel.reactions[payload.targetId][payload.type]++;
    }

    // Canlı güncelleme broadcast
    this.server.to(actor.roomId).emit('duel:reaction-update', {
      duelId: duel.id,
      reactions: duel.reactions,
    });
  }

  @SubscribeMessage('duel:vote')
  async handleDuelVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { candidateId: string },
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) return;

    const duel = this.activeDuels.get(actor.roomId);
    if (!duel || duel.status !== 'voting') {
      client.emit('room:toast', { type: 'warning', title: 'Düello', message: 'Şu anda oylama aktif değil.' });
      return;
    }

    // Tartışmacılar oy kullanamaz
    if (actor.userId === duel.challengerId || actor.userId === duel.opponentId) {
      client.emit('room:toast', { type: 'warning', title: 'Düello', message: 'Tartışmacılar oy kullanamaz.' });
      return;
    }

    // Adayın geçerliliğini kontrol et
    if (payload.candidateId !== duel.challengerId && payload.candidateId !== duel.opponentId) return;

    // Her kullanıcı bir kez oy kullanabilir
    if (duel.votes.has(actor.userId)) {
      client.emit('room:toast', { type: 'warning', title: 'Düello', message: 'Zaten oy kullandınız.' });
      return;
    }

    duel.votes.set(actor.userId, payload.candidateId);

    // Oy güncelleme broadcast
    let challengerVotes = 0;
    let opponentVotes = 0;
    for (const candidateId of duel.votes.values()) {
      if (candidateId === duel.challengerId) challengerVotes++;
      else opponentVotes++;
    }

    this.server.to(actor.roomId).emit('duel:vote-update', {
      duelId: duel.id,
      challengerVotes,
      opponentVotes,
      totalVotes: duel.votes.size,
    });

    client.emit('room:toast', { type: 'success', title: '✅ Oy', message: 'Oyunuz kaydedildi!' });
  }

  // ─── DUEL HELPER: Oylama fazına geç ───
  private startDuelVoting(roomId: string) {
    const duel = this.activeDuels.get(roomId);
    if (!duel || duel.status !== 'active') return;

    duel.status = 'voting';

    // ★ DUAL MIC RELEASE — Her iki düellocunun mic'ini kapat
    this.server.to(roomId).emit('mic:released', {
      userId: duel.challengerId,
      displayName: duel.challengerName,
      socketId: duel.challengerSocketId,
      reason: 'duel_voting',
    });
    this.server.to(roomId).emit('mic:released', {
      userId: duel.opponentId,
      displayName: duel.opponentName,
      socketId: duel.opponentSocketId,
      reason: 'duel_voting',
    });

    this.server.to(roomId).emit('duel:voting-phase', {
      duelId: duel.id,
      challengerId: duel.challengerId,
      challengerName: duel.challengerName,
      challengerAvatar: duel.challengerAvatar,
      opponentId: duel.opponentId,
      opponentName: duel.opponentName,
      opponentAvatar: duel.opponentAvatar,
      reactions: duel.reactions,
      votingDuration: 15,
    });

    this.logger.log(`[DUEL] Voting phase started for duel ${duel.id}`);

    // 15 saniye sonra sonuçları hesapla
    duel.timer = setTimeout(() => {
      this.finalizeDuel(roomId);
    }, 15_000);
  }

  // ─── DUEL HELPER: Sonuçları hesapla ve kaydet ───
  private async finalizeDuel(roomId: string) {
    const duel = this.activeDuels.get(roomId);
    if (!duel) return;

    duel.status = 'finished';

    // Oyları say
    let challengerVotes = 0;
    let opponentVotes = 0;
    for (const candidateId of duel.votes.values()) {
      if (candidateId === duel.challengerId) challengerVotes++;
      else opponentVotes++;
    }

    // Toplam reaksiyonları say
    const totalReactions = Object.values(duel.reactions).reduce(
      (sum, r) => sum + r.fallacy + r.logical + r.derailed, 0,
    );

    // Sonuç belirle
    let result: 'CHALLENGER_WIN' | 'OPPONENT_WIN' | 'DRAW';
    let winnerId: string | null = null;
    let winnerName: string | null = null;
    let loserId: string | null = null;

    if (challengerVotes > opponentVotes) {
      result = 'CHALLENGER_WIN';
      winnerId = duel.challengerId;
      winnerName = duel.challengerName;
      loserId = duel.opponentId;
    } else if (opponentVotes > challengerVotes) {
      result = 'OPPONENT_WIN';
      winnerId = duel.opponentId;
      winnerName = duel.opponentName;
      loserId = duel.challengerId;
    } else {
      result = 'DRAW';
    }

    // Odaya sonuç broadcast
    this.server.to(roomId).emit('duel:result', {
      duelId: duel.id,
      result,
      winnerId,
      winnerName,
      loserId,
      loserName: loserId === duel.challengerId ? duel.challengerName : duel.opponentName,
      challengerId: duel.challengerId,
      challengerName: duel.challengerName,
      challengerVotes,
      opponentId: duel.opponentId,
      opponentName: duel.opponentName,
      opponentVotes,
      reactions: duel.reactions,
      totalReactions,
    });

    this.logger.log(`[DUEL] Result: ${result} | ${duel.challengerName}(${challengerVotes}) vs ${duel.opponentName}(${opponentVotes})`);

    // DB'ye kaydet + puan güncelle
    try {
      await this.prisma.duelHistory.create({
        data: {
          tenantId: duel.tenantId,
          roomId: duel.roomId,
          challengerId: duel.challengerId,
          challengerName: duel.challengerName,
          opponentId: duel.opponentId,
          opponentName: duel.opponentName,
          result,
          challengerVotes,
          opponentVotes,
          totalReactions,
          durationSeconds: Math.round(duel.duration / 1000),
        },
      });

      // Kazanana +10 puan, kaybedene 0
      if (winnerId && loserId) {
        await this.prisma.user.update({
          where: { id: winnerId },
          data: { duelWins: { increment: 1 }, points: { increment: 10 } },
        });
        await this.prisma.user.update({
          where: { id: loserId },
          data: { duelLosses: { increment: 1 }, points: { decrement: 10 } },
        });
      } else {
        // Beraberlik
        await this.prisma.user.updateMany({
          where: { id: { in: [duel.challengerId, duel.opponentId] } },
          data: { duelDraws: { increment: 1 } },
        });
      }
    } catch (e) {
      this.logger.warn(`[DUEL] Failed to save duel history: ${e.message}`);
    }

    // Temizle
    this.activeDuels.delete(roomId);
  }

  // ─── DUEL AUTO-FORFEIT: Disconnect veya oda değişiminde düelloyu otomatik bitir ───
  private autoDuelForfeit(roomId: string, userId: string, displayName: string, reason: 'disconnected' | 'room_switch' | 'forfeit' | 'mic_released') {
    const duel = this.activeDuels.get(roomId);
    if (!duel) return;

    // Bu kullanıcı düellodaki taraflardan biri mi?
    const isChallenger = duel.challengerId === userId;
    const isOpponent = duel.opponentId === userId;
    if (!isChallenger && !isOpponent) return;

    // Timer ve tickInterval'ı temizle
    if (duel.timer) clearTimeout(duel.timer);
    if (duel.tickInterval) clearInterval(duel.tickInterval);

    // Pending düello ise sadece iptal et
    if (duel.status === 'pending') {
      this.activeDuels.delete(roomId);
      this.server.to(roomId).emit('duel:cancelled', { duelId: duel.id });
      this.logger.log(`[DUEL] Cancelled (${reason}) — ${displayName} left during pending`);
      return;
    }

    duel.status = 'finished';

    // Çıkan kullanıcı kaybeder
    const winnerId = isChallenger ? duel.opponentId : duel.challengerId;
    const winnerName = isChallenger ? duel.opponentName : duel.challengerName;
    const loserId = userId;
    const result = isChallenger ? 'OPPONENT_WIN' : 'CHALLENGER_WIN';
    const reasonText = reason === 'disconnected' ? 'bağlantı koptu' : reason === 'forfeit' ? 'pes etti' : reason === 'mic_released' ? 'mikrofonu bıraktı' : 'odayı terk etti';

    // Release mics
    this.server.to(roomId).emit('mic:released', { userId: duel.challengerId, displayName: duel.challengerName, socketId: duel.challengerSocketId, reason: 'duel_ended' });
    this.server.to(roomId).emit('mic:released', { userId: duel.opponentId, displayName: duel.opponentName, socketId: duel.opponentSocketId, reason: 'duel_ended' });

    // Sonuç broadcast
    const loserName = isChallenger ? duel.challengerName : duel.opponentName;
    this.server.to(roomId).emit('duel:result', {
      duelId: duel.id,
      result: result as any,
      winnerId,
      winnerName,
      loserId,
      loserName,
      challengerId: duel.challengerId,
      challengerName: duel.challengerName,
      challengerVotes: 0,
      opponentId: duel.opponentId,
      opponentName: duel.opponentName,
      opponentVotes: 0,
      reactions: duel.reactions,
      totalReactions: 0,
      forfeit: true,
      forfeitReason: `${loserName} ${reasonText}`,
    });

    this.logger.log(`[DUEL] Auto-forfeit (${reason}): ${displayName} loses, ${winnerName} wins`);

    // DB kaydet
    this.prisma.duelHistory.create({
      data: {
        tenantId: duel.tenantId,
        roomId: duel.roomId,
        challengerId: duel.challengerId,
        challengerName: duel.challengerName,
        opponentId: duel.opponentId,
        opponentName: duel.opponentName,
        result: result as any,
        challengerVotes: 0,
        opponentVotes: 0,
        totalReactions: 0,
        durationSeconds: Math.round((Date.now() - duel.startedAt) / 1000),
      },
    }).then(() => {
      // Kazanana +10, kaybedene loss
      this.prisma.user.update({ where: { id: winnerId }, data: { duelWins: { increment: 1 }, points: { increment: 10 } } }).catch(() => { });
      this.prisma.user.update({ where: { id: loserId }, data: { duelLosses: { increment: 1 }, points: { decrement: 10 } } }).catch(() => { });
    }).catch(e => this.logger.warn(`[DUEL] Forfeit save failed: ${e.message}`));

    this.activeDuels.delete(roomId);
  }

  // ─── DUEL FORFEIT: Kullanıcı kendi isteğiyle pes eder ───
  @SubscribeMessage('duel:forfeit')
  handleDuelForfeit(
    @ConnectedSocket() client: Socket,
  ) {
    const actor = this.participants.get(client.id);
    if (!actor) {
      this.logger.warn(`[DUEL FORFEIT] No participant found for socket ${client.id}`);
      return;
    }

    this.logger.log(`[DUEL] ${actor.displayName} voluntarily forfeiting in room ${actor.roomId}`);
    this.autoDuelForfeit(actor.roomId, actor.userId, actor.displayName, 'forfeit');
  }

  // ═══════════════════════════════════════════════════════════════
  //  FRIENDSHIP — Gerçek Zamanlı Arkadaşlık Eventleri
  // ═══════════════════════════════════════════════════════════════

  /** Hedef userId'ye ait socket'i bul */
  private findSocketByUserId(userId: string): Socket | null {
    for (const [, socket] of this.server.sockets.sockets) {
      if (socket.data?.user?.sub === userId) return socket;
    }
    return null;
  }

  @SubscribeMessage('friend:request')
  async handleFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const tenantId = user.tenantId || 'system';
      const friendship = await this.friendService.sendRequest(user.sub, data.receiverId, tenantId);
      // Gönderene onay
      client.emit('friend:request:sent', friendship);
      // Alıcıya bildirim
      const receiverSocket = this.findSocketByUserId(data.receiverId);
      if (receiverSocket) {
        receiverSocket.emit('friend:request:received', friendship);
      }
    } catch (e: any) {
      client.emit('friend:error', { message: e.message || 'İstek gönderilemedi' });
    }
  }

  @SubscribeMessage('friend:accept')
  async handleFriendAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendshipId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const friendship = await this.friendService.acceptRequest(data.friendshipId, user.sub);
      // Her iki tarafa bildir
      client.emit('friend:accepted', friendship);
      const senderSocket = this.findSocketByUserId(friendship.senderId);
      if (senderSocket) {
        senderSocket.emit('friend:accepted', friendship);
      }
    } catch (e: any) {
      client.emit('friend:error', { message: e.message || 'İstek kabul edilemedi' });
    }
  }

  @SubscribeMessage('friend:reject')
  async handleFriendReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendshipId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.friendService.rejectRequest(data.friendshipId, user.sub);
      client.emit('friend:rejected', { friendshipId: data.friendshipId });
    } catch (e: any) {
      client.emit('friend:error', { message: e.message || 'İstek reddedilemedi' });
    }
  }

  @SubscribeMessage('friend:remove')
  async handleFriendRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendshipId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const friendship = await this.prisma.friendship.findUnique({ where: { id: data.friendshipId } });
      if (!friendship) return;
      const otherId = friendship.senderId === user.sub ? friendship.receiverId : friendship.senderId;
      await this.friendService.removeFriend(data.friendshipId, user.sub);
      client.emit('friend:removed', { friendshipId: data.friendshipId });
      const otherSocket = this.findSocketByUserId(otherId);
      if (otherSocket) {
        otherSocket.emit('friend:removed', { friendshipId: data.friendshipId });
      }
    } catch (e: any) {
      client.emit('friend:error', { message: e.message || 'Arkadaş silinemedi' });
    }
  }

  @SubscribeMessage('friend:dm')
  async handleFriendDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const tenantId = user.tenantId || 'system';
      const message = await this.friendService.sendMessage(user.sub, data.receiverId, data.content, tenantId);
      // Gönderene echo
      client.emit('friend:dm:new', message);
      // Alıcıya bildirim
      const receiverSocket = this.findSocketByUserId(data.receiverId);
      if (receiverSocket) {
        receiverSocket.emit('friend:dm:new', message);
      }
    } catch (e: any) {
      client.emit('friend:error', { message: e.message || 'Mesaj gönderilemedi' });
    }
  }
}
