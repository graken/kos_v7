import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { targetUserId, adminUserId } = await request.json();

        if (!targetUserId || !adminUserId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 요청자가 관리자인지 확인
        const admin = await prisma.user.findUnique({
            where: { id: adminUserId }
        });

        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        // 비밀번호 초기화 ('1234')
        const hashedPassword = await bcrypt.hash('1234', 10);
        await (prisma.user.update as any)({
            where: { id: targetUserId },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: 'Password reset to 1234' });

    } catch (error: any) {
        console.error('Reset password error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
