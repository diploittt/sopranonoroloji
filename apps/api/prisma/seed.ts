import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
    // Simple SHA256 hash for seed — backend auth will handle bcrypt
    return createHash('sha256').update(password).digest('hex');
}

async function main() {
    console.log('🌱 Seeding sopranochat-dev database...');

    // 1. Create default tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'system' },
        update: {},
        create: {
            name: 'SopranoChat',
            displayName: 'SopranoChat',
            slug: 'system',
            domain: 'localhost',
            status: 'ACTIVE',
            packageType: 'CAMERA',
            apiSecret: createHash('sha256').update('soprano-api-secret').digest('hex'),
        },
    });
    console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Create Owner user (IRMAK)
    const owner = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'irmak@sopranochat.com' } },
        update: {},
        create: {
            tenantId: tenant.id,
            displayName: 'IRMAK',
            email: 'irmak@sopranochat.com',
            passwordHash: hashPassword('123456'),
            role: 'owner',
            isOnline: false,
        },
    });
    console.log(`✅ Owner: ${owner.displayName} (${owner.id})`);

    // 3. Create default rooms
    const rooms = [
        { name: 'Genel Sohbet', slug: 'genel-sohbet' },
        { name: 'Gurbetçiler', slug: 'gurbetciler' },
        { name: 'Müzik Odası', slug: 'muzik-odasi' },
    ];

    for (const room of rooms) {
        const created = await prisma.room.upsert({
            where: { tenantId_slug: { tenantId: tenant.id, slug: room.slug } },
            update: {},
            create: {
                tenantId: tenant.id,
                name: room.name,
                slug: room.slug,
                status: 'ACTIVE',
                ownerId: owner.id,
            },
        });
        console.log(`✅ Room: ${created.name} (${created.slug})`);
    }

    // 4. Create default system settings
    await prisma.systemSettings.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
            tenantId: tenant.id,
            welcomeMessage: 'SopranoChat\'a hoş geldiniz!',
            micDuration: 120,
            defaultLanguage: 'tr',
            micDurationGuest: 120,
            micDurationMember: 180,
            micDurationVip: 300,
            micDurationAdmin: 0,
            guestProfile: true,
            guestPrivateMessage: false,
            guestCamera: true,
        },
    });
    console.log('✅ System settings created');

    console.log('🎉 Seed complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
