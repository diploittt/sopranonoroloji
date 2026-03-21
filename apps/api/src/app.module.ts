import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoomModule } from './room/room.module';
import { ChatModule } from './chat/chat.module';
import { MediaModule } from './media/media.module';
import { SessionModule } from './session/session.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { AiModule } from './ai/ai.module';
import { OrderModule } from './order/order.module';
import { BillingModule } from './billing/billing.module';
import { LivekitModule } from './livekit/livekit.module';
import { FriendModule } from './friend/friend.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 dakika
      limit: 100,   // max 100 request/dakika
    }]),
    PrismaModule,
    RedisModule,
    TenantModule,
    AuthModule,
    UserModule,
    RoomModule,
    ChatModule,
    MediaModule,
    SessionModule,
    AdminModule,
    HealthModule,
    AiModule,
    OrderModule,
    BillingModule,
    LivekitModule,
    FriendModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
