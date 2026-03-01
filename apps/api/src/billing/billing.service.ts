import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Her gün 03:00'te çalışır.
     * 1) Süresi dolan tenant'lara hatırlatma gönderir
     * 2) Grace period (3 gün) sonunda tenant'ı otomatik PASİF yapar
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleBillingCheck() {
        this.logger.log('📋 Günlük fatura kontrolü başladı...');

        const now = new Date();

        // ─── 1) Grace period biten tenant'ları pasife al ───
        // expiresAt + 3 gün < now → PASSIVE
        const graceLimitDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        const expiredTenants = await this.prisma.tenant.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: graceLimitDate },
                slug: { not: 'system' },
            },
            select: { id: true, name: true, domain: true, expiresAt: true },
        });

        for (const tenant of expiredTenants) {
            this.logger.warn(
                `⛔ Tenant "${tenant.name}" (${tenant.domain}) süresi doldu + grace bitti → PASİF yapılıyor`,
            );

            // Tenant'ı pasife al (SUSPENDED)
            await this.prisma.tenant.update({
                where: { id: tenant.id },
                data: { status: 'SUSPENDED' },
            });

            // Tüm odaları kapat
            await this.prisma.room.updateMany({
                where: { tenantId: tenant.id },
                data: { status: 'CLOSED' },
            });
        }

        if (expiredTenants.length > 0) {
            this.logger.log(
                `🔒 ${expiredTenants.length} tenant pasife alındı (süresi doldu + 3 gün grace bitti)`,
            );
        }

        // ─── 2) Süresi 3 gün içinde dolacak tenant'ları logla (hatırlatma) ───
        const warningDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const warningTenants = await this.prisma.tenant.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: {
                    gte: now,
                    lte: warningDate,
                },
                slug: { not: 'system' },
            },
            select: { id: true, name: true, domain: true, expiresAt: true },
        });

        for (const tenant of warningTenants) {
            const daysLeft = Math.ceil(
                ((tenant.expiresAt?.getTime() || 0) - now.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            this.logger.warn(
                `⚠️ Tenant "${tenant.name}" (${tenant.domain}) → ${daysLeft} gün kaldı! Ödeme hatırlatması gerekiyor.`,
            );

            // TODO: Gerçek SMS/E-posta entegrasyonu eklenebilir
        }

        // ─── 3) Süresi tam bugün dolan tenant'ları logla ───
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const expiringToday = await this.prisma.tenant.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: {
                    gte: todayStart,
                    lt: todayEnd,
                },
                slug: { not: 'system' },
            },
            select: { id: true, name: true, domain: true },
        });

        for (const tenant of expiringToday) {
            this.logger.warn(
                `🔔 Tenant "${tenant.name}" (${tenant.domain}) bugün sona eriyor! 3 gün grace period başlıyor.`,
            );
        }

        this.logger.log(
            `📋 Fatura kontrolü bitti → ${expiredTenants.length} pasif, ${warningTenants.length} uyarı, ${expiringToday.length} bugün bitiyor`,
        );
    }
}
