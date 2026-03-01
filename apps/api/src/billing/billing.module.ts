import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [ScheduleModule.forRoot(), PrismaModule],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule { }
