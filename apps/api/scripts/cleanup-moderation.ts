import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning Moderation Data ---');

    // 1. Delete Ban Logs
    const deletedBans = await prisma.banLog.deleteMany({});
    console.log(`Deleted ${deletedBans.count} ban logs.`);

    // 2. Delete IP Bans
    const deletedIpBans = await prisma.ipBan.deleteMany({});
    console.log(`Deleted ${deletedIpBans.count} IP bans.`);

    // 3. Delete Audit Logs related to moderation
    const deletedAudit = await prisma.auditLog.deleteMany({
        where: {
            event: {
                in: ['user.ban', 'user.gag', 'user.unban', 'ip.ban', 'user.kick']
            }
        }
    });
    console.log(`Deleted ${deletedAudit.count} moderation audit logs.`);

    // 4. Reset User Ban Status
    const updatedUsers = await prisma.user.updateMany({
        where: {
            OR: [
                { isBanned: true },
                { banExpiresAt: { not: null } }
            ]
        },
        data: {
            isBanned: false,
            banExpiresAt: null
        }
    });
    console.log(`Reset status for ${updatedUsers.count} users.`);

    console.log('--- Cleanup Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
