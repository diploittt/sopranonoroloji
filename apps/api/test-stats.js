const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const totalUsers = await prisma.user.count();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayVisitors = await prisma.user.count({
    where: { lastLoginAt: { gte: todayStart } },
  });
  const totalVisits = await prisma.user.count({
    where: { lastLoginAt: { not: null } },
  });
  
  console.log(JSON.stringify({ totalUsers, todayVisitors, totalVisits }));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
