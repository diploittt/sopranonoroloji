/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Redis Socket.IO Adapter
   Cluster-ready: tüm instance'lar ortak state paylaşır
   ═══════════════════════════════════════════════════════════ */

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { INestApplication, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger('RedisIoAdapter');

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(redisUrl: string): Promise<void> {
    const pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null; // 5 denemeden sonra dur
        return Math.min(times * 500, 5000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    const subClient = pubClient.duplicate();

    pubClient.on('connect', () => this.logger.log('✅ Redis adapter PUB bağlandı'));
    subClient.on('connect', () => this.logger.log('✅ Redis adapter SUB bağlandı'));
    pubClient.on('error', (err) => this.logger.warn(`⚠️ Redis PUB: ${err.message}`));
    subClient.on('error', (err) => this.logger.warn(`⚠️ Redis SUB: ${err.message}`));

    // Bağlantıları dene — başarısız olursa adapter null kalır (in-memory fallback)
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      maxHttpBufferSize: 5 * 1024 * 1024, // 5MB
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.logger.log('🔄 Socket.IO Redis adapter aktif (cluster-ready)');
    } else {
      this.logger.warn('⚠️ Redis adapter bağlanamadı — in-memory fallback');
    }

    return server;
  }
}
