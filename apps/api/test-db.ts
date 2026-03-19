import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const totalUsers = await prisma.user.count();
    console.log('Total Users:', totalUsers);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayVisitors = await prisma.user.count({
      where: { lastLoginAt: { gte: todayStart } },
    });
    console.log('Today Visitors:', todayVisitors);

    const totalVisitorsAllTime = await prisma.user.count({
      where: { lastLoginAt: { not: null } },
    });
    console.log('Total Visitors (All Time):', totalVisitorsAllTime);

  } catch (err) {
    console.error('PRISMA ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
