/**
 * 비상용 사용자 차단 해제 스크립트
 * 실행 방법: node scripts/unblock-user.js [사용자ID]
 * 예: node scripts/unblock-user.js admin
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unblock(username) {
    if (!username) {
        console.error('사용자 ID(username)를 입력해주세요.');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            console.error(`사용자 "${username}"를 찾을 수 없습니다.`);
            return;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isBlocked: false,
                loginAttempts: 0
            }
        });

        console.log(`성공: 사용자 "${username}"의 차단이 해제되었습니다.`);
    } catch (error) {
        console.error('오류 발생:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const target = process.argv[2];
unblock(target);
