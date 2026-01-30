import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { userId, currentPassword, newPassword } = await request.json();

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json({ error: '모든 필드를 입력해주세요' }, { status: 400 });
        }

        // 사용자 확인
        const user = await prisma.user.findUnique({
            where: { id: userId }
        }) as any;

        if (!user) {
            return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
        }

        // 현재 비밀번호 검증
        if (user.password) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다' }, { status: 401 });
            }
        } else {
            // 초기 비밀번호가 설정되지 않은 경우 '1234'와 비교
            if (currentPassword !== '1234') {
                return NextResponse.json({ error: '현재 비밀번호(초기: 1234)가 일치하지 않습니다' }, { status: 401 });
            }
        }

        // 새 비밀번호 해싱 및 저장
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await (prisma.user.update as any)({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다' });

    } catch (error: any) {
        console.error('Change password error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
