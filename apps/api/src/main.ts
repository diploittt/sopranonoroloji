import 'dotenv/config'; // Load .env BEFORE any module imports (critical for mediasoup.config.ts)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin/admin.service';
import { json } from 'express';
import { RedisIoAdapter } from './common/redis.adapter';
import { AppLoggerService } from './common/logger.service';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const logger = new AppLoggerService();

  const app = await NestFactory.create(AppModule, { logger });
  const configService = app.get(ConfigService);

  // ── Security ──
  app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for WebView compat
  app.use(cookieParser());
  app.use(json({ limit: '2mb' }));

  // ── CORS (production + development) ──
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const sopranoOrigins = [
    'https://sopranochat.com',
    'https://www.sopranochat.com',
    'https://chatlesme.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',  // Expo Metro bundler
    'http://localhost:8082',  // Expo Metro bundler (alt port)
    'http://localhost:19006', // Expo web dev
  ];
  // Merge env-based origins with hardcoded soprano domains
  const envOrigins = corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : [];
  const allOrigins = [...new Set([...sopranoOrigins, ...envOrigins])];

  app.enableCors({
    origin: (origin, callback) => {
      // Mobil uygulamalar (Expo Go, release APK) origin göndermez — izin ver
      if (!origin) return callback(null, true);
      // Tanımlı origin'lere izin ver
      if (allOrigins.includes(origin)) return callback(null, true);
      // Fallback: tüm localhost'lara izin ver
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://192.168.')) return callback(null, true);
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // ── Validation ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ── Redis Socket.IO Adapter (cluster-ready) ──
  const redisUrl = configService.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
  const redisAdapter = new RedisIoAdapter(app);
  try {
    await redisAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisAdapter);
    logger.log('🔄 Redis Socket.IO adapter aktif', 'Bootstrap');
  } catch (err: any) {
    logger.warn(`⚠️ Redis adapter bağlanamadı, in-memory fallback: ${err.message}`, 'Bootstrap');
  }

  // ── Start ──
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 SopranoChat API çalışıyor: ${await app.getUrl()}`, 'Bootstrap');

  // ── Auto-seed ──
  try {
    const adminService = app.get(AdminService);
    await adminService.setupRootAdmin();
    logger.log('✓ Root admin & default rooms seeded.', 'Bootstrap');
  } catch (e: any) {
    logger.warn(`⚠ setupRootAdmin skipped: ${e.message}`, 'Bootstrap');
  }
}
bootstrap();
