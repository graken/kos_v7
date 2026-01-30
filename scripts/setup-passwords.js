const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Initial Password Setup ---');

    const users = await prisma.user.findMany();

    for (const user of users) {
        const hashedPassword = await bcrypt.hash('1234', 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        console.log(`Updated password for user: ${user.username} (${user.displayName})`);
    }

    console.log('--- Setup Complete ---');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
