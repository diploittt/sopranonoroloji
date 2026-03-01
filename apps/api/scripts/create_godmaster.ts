import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
    // Find the main tenant with real rooms
    const rooms = await p.room.findMany({
        where: { name: { not: 'Lobi' } },
        select: { tenantId: true },
        take: 1
    });

    if (rooms.length === 0) {
        console.log('No non-Lobi rooms found');
        return;
    }

    const tenantId = rooms[0].tenantId;
    const tenant = await p.tenant.findUnique({ where: { id: tenantId } });
    console.log('Tenant ID:', tenantId);
    console.log('Tenant Slug:', tenant?.slug);

    // List all users in this tenant
    const users = await p.user.findMany({
        where: { tenantId },
        select: { id: true, email: true, displayName: true, role: true }
    });
    console.log('\n=== USERS ===');
    for (const u of users) {
        console.log(`  ${u.displayName} | email=${u.email} | role=${u.role}`);
    }

    // Create godmaster
    const hash = await bcrypt.hash('admin123', 10);
    await p.user.upsert({
        where: { tenantId_email: { tenantId, email: 'admin@soprano.com' } },
        update: { role: 'godmaster', passwordHash: hash, displayName: 'GodMaster' },
        create: {
            tenantId,
            email: 'admin@soprano.com',
            displayName: 'GodMaster',
            role: 'godmaster',
            passwordHash: hash,
            isOnline: false,
        }
    });
    console.log('\n=== GODMASTER CREATED ===');
    console.log('  Tenant Slug:', tenant?.slug);
    console.log('  Email: admin@soprano.com');
    console.log('  Password: admin123');
}

main().catch(e => console.error(e)).finally(() => p.$disconnect());
