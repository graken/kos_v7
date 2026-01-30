import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { userId, password } = await request.json();

        if (!userId || !password) {
            return NextResponse.json({ error: 'ID and Password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { preferences: true }
        }) as any;

        if (!user) {
            return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
        }

        // 비밀번호가 설정되어 있지 않은 경우 (데모 또는 초기 상태)
        if (!user.password) {
            // 초기 비밀번호 '1234'로 가정하여 체크하거나 편의를 위해 통과 (운영시 필수 설정 권장)
            if (password === '1234') {
                const { password: _, preferences, ...userBasic } = user;
                const formattedUser = {
                    ...userBasic,
                    apps: JSON.parse(preferences?.apps || '[]'),
                    permissions: JSON.parse(preferences?.permissions || '{}'),
                    wallpaper: preferences?.wallpaper,
                    desktopTextColor: preferences?.desktopTextColor,
                    iconBgColor: preferences?.iconBgColor,
                    iconGlyphColor: preferences?.iconGlyphColor,
                };
                return NextResponse.json({ success: true, user: formattedUser });
            }
            return NextResponse.json({ error: '초기 비밀번호가 필요합니다 (1234)' }, { status: 401 });
        }

        // 비밀번호 검증
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: '비밀번호가 일치하지 않습니다' }, { status: 401 });
        }

        // 보안을 위해 비밀번호 제외 및 preferences 포맷팅 후 반환
        const { password: _, preferences, ...userBasic } = user;
        const formattedUser = {
            ...userBasic,
            apps: JSON.parse(preferences?.apps || '[]'),
            permissions: JSON.parse(preferences?.permissions || '{}'),
            wallpaper: preferences?.wallpaper,
            desktopTextColor: preferences?.desktopTextColor,
            iconBgColor: preferences?.iconBgColor,
            iconGlyphColor: preferences?.iconGlyphColor,
        };

        return NextResponse.json({ success: true, user: formattedUser });

    } catch (error: any) {
        console.error('Login error:', error.message);
        return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
    }
}
