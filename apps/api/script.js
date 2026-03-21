const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      slug: true,
      name: true,
      rooms: {
        select: { name: true, slug: true, isMeetingRoom: true }
      }
    }
  });
  console.log(JSON.stringify(tenants, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
