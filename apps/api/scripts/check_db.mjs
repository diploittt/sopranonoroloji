// check_db.mjs - ESM module for Prisma Client
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

try {
    const tenants = await p.tenant.findMany();
    console.log('=== TENANTS ===');
    for (const t of tenants) {
        console.log(`  ID: ${t.id} | Slug: ${t.slug} | Name: ${t.name}`);
    }

    const users = await p.user.findMany({
        select: { id: true, email: true, displayName: true, role: true, tenantId: true },
        take: 20
    });
    console.log('=== ALL USERS ===');
    for (const u of users) {
        console.log(`  ${u.displayName} | ${u.email} | role=${u.role} | tenant=${u.tenantId}`);
    }
} catch (e) {
    console.error('Error:', e.message);
} finally {
    await p.$disconnect();
}
