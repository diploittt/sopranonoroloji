import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminPublicController } from './admin-public.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => ChatModule), MailModule],
  controllers: [AdminController, AdminPublicController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
