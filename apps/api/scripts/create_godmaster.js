require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
    const p = new PrismaClient();

    // Find the main tenant with real rooms
    const rooms = await p.room.findMany({
        where: { name: { not: 'Lobi' } },
        select: { tenantId: true },
        take: 1
    });

    if (rooms.length === 0) {
        console.log('No non-Lobi rooms found');
        await p.$disconnect();
        return;
    }

    const tenantId = rooms[0].tenantId;
    console.log('Main Tenant ID:', tenantId);

    // Get tenant info
    const tenant = await p.tenant.findUnique({ where: { id: tenantId } });
    console.log('Tenant Slug:', tenant ? tenant.slug : 'N/A');

    // List all users in this tenant
    const users = await p.user.findMany({
        where: { tenantId: tenantId },
        select: { id: true, email: true, displayName: true, role: true }
    });
    console.log('\n=== USERS IN MAIN TENANT ===');
    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        console.log('  ' + u.displayName + ' | email=' + u.email + ' | role=' + u.role);
    }

    // Create godmaster if not exists
    var hash = await bcrypt.hash('admin123', 10);
    await p.user.upsert({
        where: { tenantId_email: { tenantId: tenantId, email: 'admin@soprano.com' } },
        update: { role: 'godmaster', passwordHash: hash },
        create: {
            tenantId: tenantId,
            email: 'admin@soprano.com',
            displayName: 'GodMaster',
            role: 'godmaster',
            passwordHash: hash,
            isOnline: false,
        }
    });
    console.log('\n=== GODMASTER CREATED/UPDATED ===');
    console.log('  Email: admin@soprano.com');
    console.log('  Password: admin123');
    console.log('  Tenant Slug: ' + (tenant ? tenant.slug : 'N/A'));

    await p.$disconnect();
}

main().catch(function (e) { console.error(e); process.exit(1); });
