const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tenant.findUnique({where: {slug: 'emin-ak-a'}, include: {rooms: true}}).then(t => console.log(JSON.stringify(t?.rooms, null, 2))).catch(console.error).finally(() => prisma.$disconnect());
