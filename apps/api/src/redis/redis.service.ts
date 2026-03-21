/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Redis Service
   State store: participants, micQueue, activeSpeaker, chatMessages
   Server restart sonrası veri korunur
   ★ Graceful fallback: Redis yokken uygulama crash etmez
   ═══════════════════════════════════════════════════════════ */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisService');
  public readonly client: Redis;
  private readonly PREFIX = 'sc:'; // soprano-chat namespace
  private _isConnected = false;

  /** Redis bağlı mı? Tüm metodlar bu kontrolü yapar. */
  get isConnected(): boolean { return this._isConnected; }

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) return null; // 10 denemeden sonra dur
        return Math.min(times * 500, 5000);
      },
      lazyConnect: true, // ★ Startup'ta otomatik bağlanma — biz kontrol ederiz
      enableOfflineQueue: false, // ★ Bağlantı yokken komutları kuyruğa atma
    });

    this.client.on('connect', () => {
      this._isConnected = true;
      this.logger.log('✅ Redis bağlantısı kuruldu');
    });
    this.client.on('close', () => {
      this._isConnected = false;
    });
    this.client.on('error', (err) => {
      this._isConnected = false;
      this.logger.warn(`⚠️ Redis hatası (graceful): ${err.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('✅ Redis bağlantısı başarılı');
    } catch (err: any) {
      this.logger.warn(`⚠️ Redis bağlanamadı — in-memory fallback aktif: ${err.message}`);
      this._isConnected = false;
    }
  }

  onModuleDestroy() {
    try { this.client.disconnect(); } catch { /* ignore */ }
  }

  // ─── Generic ───
  private key(ns: string, id?: string) {
    return id ? `${this.PREFIX}${ns}:${id}` : `${this.PREFIX}${ns}`;
  }

  async ping(): Promise<boolean> {
    try { return (await this.client.ping()) === 'PONG'; } catch { return false; }
  }

  // ═══════════ PARTICIPANTS ═══════════
  // Hash per room: sc:participants:{roomId} → { socketId: JSON(participant) }

  async setParticipant(roomId: string, socketId: string, data: any): Promise<void> {
    await this.client.hset(this.key('participants', roomId), socketId, JSON.stringify(data));
  }

  async getParticipant(roomId: string, socketId: string): Promise<any | null> {
    const raw = await this.client.hget(this.key('participants', roomId), socketId);
    return raw ? JSON.parse(raw) : null;
  }

  async removeParticipant(roomId: string, socketId: string): Promise<void> {
    await this.client.hdel(this.key('participants', roomId), socketId);
  }

  async getRoomParticipants(roomId: string): Promise<any[]> {
    const all = await this.client.hgetall(this.key('participants', roomId));
    return Object.values(all).map(v => JSON.parse(v));
  }

  async getRoomParticipantCount(roomId: string): Promise<number> {
    return this.client.hlen(this.key('participants', roomId));
  }

  /** Socket ID'ye göre participant bul (tüm odalar taranır — fallback) */
  async findParticipantBySocket(socketId: string): Promise<{ roomId: string; data: any } | null> {
    // Önce local index'e bak
    const roomId = await this.client.get(this.key('socket-room', socketId));
    if (roomId) {
      const data = await this.getParticipant(roomId, socketId);
      if (data) return { roomId, data };
    }
    return null;
  }

  /** Socket → Room mapping (hızlı lookup) */
  async setSocketRoom(socketId: string, roomId: string): Promise<void> {
    await this.client.set(this.key('socket-room', socketId), roomId, 'EX', 86400); // 24h TTL
  }

  async removeSocketRoom(socketId: string): Promise<void> {
    await this.client.del(this.key('socket-room', socketId));
  }

  async getSocketRoom(socketId: string): Promise<string | null> {
    return this.client.get(this.key('socket-room', socketId));
  }

  /** Tüm odalardaki participant sayısını al (tenant bazında) */
  async getAllRoomCounts(): Promise<Record<string, number>> {
    const keys = await this.client.keys(this.key('participants', '*'));
    const counts: Record<string, number> = {};
    for (const k of keys) {
      const roomId = k.replace(this.key('participants', ''), '');
      counts[roomId] = await this.client.hlen(k);
    }
    return counts;
  }

  /** Bir odadaki tüm participantları sil */
  async clearRoomParticipants(roomId: string): Promise<void> {
    await this.client.del(this.key('participants', roomId));
  }

  // ═══════════ MIC QUEUE ═══════════
  // List per room: sc:micqueue:{roomId} → [userId1, userId2, ...]

  async getMicQueue(roomId: string): Promise<string[]> {
    return this.client.lrange(this.key('micqueue', roomId), 0, -1);
  }

  async addToMicQueue(roomId: string, userId: string): Promise<void> {
    // Duplicate engelle
    const existing = await this.getMicQueue(roomId);
    if (!existing.includes(userId)) {
      await this.client.rpush(this.key('micqueue', roomId), userId);
    }
  }

  async removeFromMicQueue(roomId: string, userId: string): Promise<void> {
    await this.client.lrem(this.key('micqueue', roomId), 0, userId);
  }

  async clearMicQueue(roomId: string): Promise<void> {
    await this.client.del(this.key('micqueue', roomId));
  }

  async popMicQueue(roomId: string): Promise<string | null> {
    return this.client.lpop(this.key('micqueue', roomId));
  }

  // ═══════════ ACTIVE SPEAKER ═══════════
  // String per room: sc:speaker:{roomId} → JSON(speakerState)

  async setActiveSpeaker(roomId: string, data: any): Promise<void> {
    await this.client.set(this.key('speaker', roomId), JSON.stringify(data));
  }

  async getActiveSpeaker(roomId: string): Promise<any | null> {
    const raw = await this.client.get(this.key('speaker', roomId));
    return raw ? JSON.parse(raw) : null;
  }

  async clearActiveSpeaker(roomId: string): Promise<void> {
    await this.client.del(this.key('speaker', roomId));
  }

  // ═══════════ CHAT MESSAGES (son 100) ═══════════
  // List per room: sc:messages:{roomId} → [JSON(msg1), JSON(msg2), ...]

  async addChatMessage(roomId: string, message: any): Promise<void> {
    const k = this.key('messages', roomId);
    await this.client.rpush(k, JSON.stringify(message));
    // Max 100 mesaj tut
    await this.client.ltrim(k, -100, -1);
    // 1 saat TTL (oda boşalınca otomatik temizlenir)
    await this.client.expire(k, 3600);
  }

  async getChatMessages(roomId: string): Promise<any[]> {
    const raw = await this.client.lrange(this.key('messages', roomId), 0, -1);
    return raw.map(r => JSON.parse(r));
  }

  async clearChatMessages(roomId: string): Promise<void> {
    await this.client.del(this.key('messages', roomId));
  }

  /** Mesaj TTL'i yenile (kullanıcı odaya katıldığında) */
  async refreshMessagesTTL(roomId: string): Promise<void> {
    await this.client.expire(this.key('messages', roomId), 3600);
  }

  // ═══════════ RATE LIMITING (Socket Events) ═══════════
  // Sorted set: sc:ratelimit:{eventType}:{userId} → timestamps

  async checkSocketRate(userId: string, event: string, maxPerWindow: number, windowSec: number): Promise<boolean> {
    const k = this.key('ratelimit', `${event}:${userId}`);
    const now = Date.now();
    const windowStart = now - (windowSec * 1000);

    // Eski kayıtları temizle + say
    await this.client.zremrangebyscore(k, 0, windowStart);
    const count = await this.client.zcard(k);

    if (count >= maxPerWindow) return false; // Rate limit aşıldı

    // Yeni timestamp ekle
    await this.client.zadd(k, now, `${now}`);
    await this.client.expire(k, windowSec + 5);
    return true;
  }

  // ═══════════ MODERATION FLAGS ═══════════
  // Hash per room: sc:modflags:{roomId} → { userId: JSON(flags) }

  async setModFlags(roomId: string, userId: string, flags: any): Promise<void> {
    await this.client.hset(this.key('modflags', roomId), userId, JSON.stringify(flags));
  }

  async getModFlags(roomId: string, userId: string): Promise<any | null> {
    const raw = await this.client.hget(this.key('modflags', roomId), userId);
    return raw ? JSON.parse(raw) : {};
  }

  // ═══════════ GENERAL STATE ═══════════

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) await this.client.set(this.key('data', key), value, 'EX', ttl);
    else await this.client.set(this.key('data', key), value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(this.key('data', key));
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.key('data', key));
  }

  /** Tüm sc: key'leri temizle (startup cleanup) */
  async flushAllState(): Promise<number> {
    const keys = await this.client.keys(`${this.PREFIX}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
    return keys.length;
  }

  /** Durum bilgisi */
  async getInfo(): Promise<{ connected: boolean; memory: string; keys: number }> {
    try {
      const info = await this.client.info('memory');
      const memMatch = info.match(/used_memory_human:(\S+)/);
      const keys = await this.client.dbsize();
      return { connected: true, memory: memMatch?.[1] || '?', keys };
    } catch {
      return { connected: false, memory: '0', keys: 0 };
    }
  }
}
