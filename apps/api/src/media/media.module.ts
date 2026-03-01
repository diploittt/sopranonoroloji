import { Module } from '@nestjs/common';
import { MediaGateway } from './media.gateway';
import { WorkerManager } from './worker.manager';
import { RouterManager } from './router.manager';
import { AuthModule } from '../auth/auth.module'; // If needed for guards
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [MediaGateway, WorkerManager, RouterManager],
  exports: [MediaGateway], // Export if other modules need to interact
})
export class MediaModule {}
