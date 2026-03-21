/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Health Controller
   GET /health — DB, Redis, Socket, memory, uptime
   ═══════════════════════════════════════════════════════════ */

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  private startedAt = Date.now();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  async check() {
    const now = Date.now();
    const uptimeMs = now - this.startedAt;

    // DB check
    let dbOk = false;
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbOk = true;
    } catch { dbOk = false; }

    // Redis check
    let redisOk = false;
    let redisLatency = 0;
    let redisInfo = { memory: '?', keys: 0 };
    try {
      const rStart = Date.now();
      redisOk = await this.redis.ping();
      redisLatency = Date.now() - rStart;
      if (redisOk) redisInfo = await this.redis.getInfo() as any;
    } catch { redisOk = false; }

    // Memory
    const mem = process.memoryUsage();

    // Socket count (Redis'ten oda sayıları)
    let totalSockets = 0;
    try {
      const counts = await this.redis.getAllRoomCounts();
      totalSockets = Object.values(counts).reduce((a, b) => a + b, 0);
    } catch { /* fallback */ }

    const healthy = dbOk && redisOk;

    return {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptimeMs,
        human: this.formatUptime(uptimeMs),
      },
      checks: {
        database: {
          status: dbOk ? 'up' : 'down',
          latencyMs: dbLatency,
        },
        redis: {
          status: redisOk ? 'up' : 'down',
          latencyMs: redisLatency,
          memory: redisInfo.memory,
          keys: redisInfo.keys,
        },
        sockets: {
          connected: totalSockets,
        },
      },
      memory: {
        rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
        heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
        heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
      },
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
    };
  }

  private formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  }
}
