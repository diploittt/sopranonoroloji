import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
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
  ],
})
export class AppModule { }
