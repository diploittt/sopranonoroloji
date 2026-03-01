
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = "postgresql://user:password@localhost:5432/sopranochat?schema=public";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- DEBUG USER LOGIN ---');
    const username = 'owner@test.com'; // Trying email as identifier first
    const password = 'testpass123';

    console.log(`Checking for user with email: ${username}`);

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: username },
                { displayName: 'ownertest' }
            ]
        }
    });

    if (!user) {
        console.log('User NOT FOUND in database.');
        return;
    }

    console.log(`User FOUND: ${user.displayName} (Email: ${user.email})`);
    console.log(`Role: ${user.role}`);
    console.log(`Password Hash: ${user.passwordHash}`);

    if (!user.passwordHash) {
        console.log('User has NO password hash.');
        return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`Bcrypt Compare Result: ${isMatch}`);

    if (isMatch) {
        console.log('LOGIN SHOULD SUCCEED.');
    } else {
        console.log('PASSWORD MISMATCH.');
        // Generate new hash for verification
        const newHash = await bcrypt.hash(password, 10);
        console.log(`Expected hash for 'testpass123' should look like: ${newHash}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
