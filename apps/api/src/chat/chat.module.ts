import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { RoomModule } from '../room/room.module';
import { SessionModule } from '../session/session.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from '../admin/admin.module';
import { FriendModule } from '../friend/friend.module';
import { FriendService } from '../friend/friend.service';
import { PushService } from '../push/push.service';

@Module({
  imports: [
    AuthModule,
    RoomModule,
    SessionModule,
    PrismaModule,
    forwardRef(() => AdminModule),
    FriendModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secretKey',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway, ChatService, FriendService, PushService],
  exports: [ChatGateway, ChatService],
})
export class ChatModule { }
