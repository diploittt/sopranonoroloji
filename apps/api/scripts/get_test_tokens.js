
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
            if (key && value && !key.startsWith('#')) {
                process.env[key] = value;
            }
        }
    });
}

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'soprano-test' } });
    if (!tenant) {
        console.error('Tenant not found');
        return;
    }

    const user = await prisma.user.findFirst({
        where: {
            tenantId: tenant.id,
            OR: [{ displayName: 'ownertest' }, { email: 'owner@test.com' }]
        }
    });

    if (!user) {
        console.error('Owner user not found');
        return;
    }

    const payload = { username: user.displayName, sub: user.id, tenantId: tenant.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'super-secret-key-change-this', { expiresIn: '1h' });

    console.log('TENANT_ID:', tenant.id);
    console.log('OWNER_TOKEN:', token);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
