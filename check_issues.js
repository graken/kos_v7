
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maintToday = await (prisma.maintenanceRecord || prisma.MaintenanceRecord).findMany({
        where: { createdAt: { gte: today } }
    });
    const shinsungToday = await (prisma.shinsungRecord || prisma.ShinsungRecord).findMany({
        where: { createdAt: { gte: today } }
    });
    const coatingToday = await (prisma.coatingRecord || prisma.CoatingRecord).findMany({
        where: { createdAt: { gte: today } }
    });

    console.log('--- Today\'s Records ---');
    console.log(`Maintenance: ${maintToday.length}`);
    console.log(`Shinsung: ${shinsungToday.length}`);
    console.log(`Coating: ${coatingToday.length}`);

    console.log('\n--- Details of Today\'s Records ---');
    shinsungToday.forEach(r => console.log(`  [Shinsung] ID: ${r.id}, Progress: ${r.progress}`));
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());
