const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/sopranochat?schema=public';
const adapter = new PrismaPg({ connectionString });
const p = new PrismaClient({ adapter });

async function main() {
    // Find godmaster user
    const gm = await p.user.findFirst({ where: { role: 'godmaster' } });
    if (!gm) {
        console.log('GodMaster user not found!');
        return;
    }

    console.log('Found GodMaster:', gm.displayName, '| email:', gm.email);

    // Reset password to admin123
    const newHash = await bcrypt.hash('admin123', 10);
    await p.user.update({
        where: { id: gm.id },
        data: { passwordHash: newHash }
    });

    console.log('Password reset to: admin123');
    console.log('Login with:');
    console.log('  Username/Email:', gm.email || gm.displayName);
    console.log('  Password: admin123');

    // Verify
    const verify = await bcrypt.compare('admin123', newHash);
    console.log('Verification:', verify ? 'OK' : 'FAILED');
}

main().catch(e => console.error(e)).finally(() => p['$disconnect']());
