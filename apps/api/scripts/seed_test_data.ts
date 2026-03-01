
// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Get or Create Tenant
    // We'll try to find a default tenant or create one
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Soprano Test',
                slug: 'soprano-test',
                apiKey: 'test-api-key',
                apiSecret: 'test-secret',
            },
        });
        console.log('✅ Created Tenant:', tenant.name);
    } else {
        console.log('ℹ️ Using existing Tenant:', tenant.name);
    }

    const tenantId = tenant.id;
    const passwordHash = await bcrypt.hash('testpass123', 10);

    // 2. Upsert Users
    const users = [
        { username: 'ownertest', email: 'owner@test.com', role: 'owner', status: 'active', isBanned: false },
        { username: 'normaluser', email: 'user@test.com', role: 'member', status: 'active', isBanned: false }, // role 'user' in prompt -> 'member' in schema default, prompt said 'user' implies member
        { username: 'moduser', email: 'mod@test.com', role: 'moderator', status: 'active', isBanned: false },
        { username: 'vipuser', email: 'vip@test.com', role: 'vip', status: 'active', isBanned: false },
        { username: 'banneduser', email: 'banned@test.com', role: 'member', status: 'banned', isBanned: true },
    ];

    const createdUsers: any = {};

    for (const u of users) {
        const user = await prisma.user.upsert({
            where: { tenantId_email: { tenantId, email: u.email } },
            update: {
                role: u.role,
                isBanned: u.isBanned,
                passwordHash, // Ensure password is set/updated
                displayName: u.username, // prompts says username, schema has displayName
            },
            create: {
                tenantId,
                email: u.email,
                displayName: u.username,
                role: u.role,
                passwordHash,
                isBanned: u.isBanned,
                isOnline: false,
            },
        });
        createdUsers[u.username] = user;
        console.log(`👤 Upserted User: ${u.username} (${u.role})`);
    }

    // 3. Upsert Rooms
    const rooms = [
        {
            name: 'Test Public Room',
            slug: 'test-public-room',
            description: 'Public test room',
            ownerUsername: 'normaluser',
            isPublic: true,
            maxUsers: 50,
            password: null,
            roomType: 'free'
        },
        {
            name: 'Test Private Room',
            slug: 'test-private-room',
            description: 'Private test room',
            ownerUsername: 'normaluser',
            isPublic: false,
            maxUsers: 20,
            password: 'testpass123',
            roomType: 'free'
        },
        {
            name: 'VIP Room',
            slug: 'vip-room',
            description: 'VIP only room',
            ownerUsername: 'vipuser',
            isPublic: true, // "room_type: vip" makes it special, usually
            maxUsers: 30,
            password: null,
            roomType: 'vip'
        }
    ];

    for (const r of rooms) {
        const owner = createdUsers[r.ownerUsername];
        if (!owner) {
            console.warn(`⚠️  Owner not found for room ${r.name}: ${r.ownerUsername}`);
            continue;
        }

        await prisma.room.upsert({
            where: { tenantId_slug: { tenantId, slug: r.slug } },
            update: {
                name: r.name,
                description: r.description,
                ownerId: owner.id,
                isPublic: r.isPublic,
                password: r.password,
                maxParticipants: r.maxUsers,
                roomType: r.roomType
            },
            create: {
                tenantId,
                name: r.name,
                slug: r.slug,
                description: r.description,
                ownerId: owner.id,
                isPublic: r.isPublic,
                password: r.password,
                maxParticipants: r.maxUsers,
                roomType: r.roomType
            }
        });
        console.log(`🏠 Upserted Room: ${r.name}`);
    }

    console.log('✅ Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
