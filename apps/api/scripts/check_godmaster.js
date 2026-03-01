const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/sopranochat?schema=public';
const adapter = new PrismaPg({ connectionString });
const p = new PrismaClient({ adapter });

async function main() {
    // 1. List all tenants
    const tenants = await p.tenant.findMany();
    console.log('=== TENANTS ===');
    for (const t of tenants) {
        console.log('  id:', t.id, '| slug:', t.slug, '| name:', t.name);
    }

    // 2. Find GodMaster users
    const godmasters = await p.user.findMany({
        where: { role: 'godmaster' },
        select: { id: true, email: true, displayName: true, role: true, tenantId: true, passwordHash: true }
    });
    console.log('\n=== GODMASTER USERS ===');
    if (godmasters.length === 0) {
        console.log('  (NONE FOUND!)');
    }
    for (const u of godmasters) {
        console.log('  displayName:', u.displayName, '| email:', u.email, '| role:', u.role, '| tenantId:', u.tenantId);
        console.log('  hasPasswordHash:', !!u.passwordHash);
        if (u.passwordHash) {
            const match = await bcrypt.compare('admin123', u.passwordHash);
            console.log('  password "admin123" matches:', match);
        }
    }

    // 3. Check 'default' tenant specifically
    const defaultTenant = await p.tenant.findUnique({ where: { slug: 'default' } });
    console.log('\n=== DEFAULT TENANT ===');
    if (defaultTenant) {
        console.log('  Found! id:', defaultTenant.id);
        const gmInDefault = godmasters.filter(u => u.tenantId === defaultTenant.id);
        console.log('  GodMasters in default tenant:', gmInDefault.length);
    } else {
        console.log('  NOT FOUND — "default" slug does not exist!');
        if (godmasters.length > 0) {
            const gmTenantId = godmasters[0].tenantId;
            const gmTenant = tenants.find(t => t.id === gmTenantId);
            console.log('  GodMaster is in tenant:', gmTenant ? gmTenant.slug : '(unknown)', '| id:', gmTenantId);
        }
    }
}

main().catch(e => console.error(e)).finally(() => p['$disconnect']());
