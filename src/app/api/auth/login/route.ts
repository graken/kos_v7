import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { username },
            include: { preferences: true }
        }) as any;
        console.log('User found:', !!user);

        if (!user) {
            return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
        }

        // 1. 차단 상태 확인
        console.log('Blocked check:', user.isBlocked);
        if (user.isBlocked) {
            return NextResponse.json({
                error: '보안을 위해 계정이 차단되었습니다. 관리자에게 문의하세요.'
            }, { status: 403 });
        }

        const handleLoginFailure = async () => {
            const currentAttempts = (user.loginAttempts || 0) + 1;
            const updates: any = { loginAttempts: currentAttempts };

            // 5회 이상 실패 시 차단
            if (currentAttempts >= 5) {
                updates.isBlocked = true;
            }

            await (prisma.user as any).update({
                where: { id: user.id },
                data: updates
            });

            if (updates.isBlocked) {
                return '비밀번호를 5회 이상 틀려 계정이 차단되었습니다. 관리자에게 문의하세요.';
            }
            return `비밀번호가 일치하지 않습니다. (남은 횟수: ${5 - currentAttempts}회)`;
        };

        const handleLoginSuccess = async () => {
            // 성공 시 시도 횟수 초기화
            await (prisma.user as any).update({
                where: { id: user.id },
                data: { loginAttempts: 0, isBlocked: false }
            });
        };

        // 비밀번호가 설정되어 있지 않은 경우 (데모 또는 초기 상태)
        if (!user.password) {
            if (password === '1234') {
                await handleLoginSuccess();
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
            const failMessage = await handleLoginFailure();
            return NextResponse.json({ error: failMessage }, { status: 401 });
        }

        // 비밀번호 검증
        console.log('Comparing password for user:', user.id);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        if (!isMatch) {
            const failMessage = await handleLoginFailure();
            return NextResponse.json({ error: failMessage }, { status: 401 });
        }

        await handleLoginSuccess();

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
        console.error('Login error detail:', error);
        return NextResponse.json({ error: `서버 오류가 발생했습니다: ${error.message}` }, { status: 500 });
    }
}
