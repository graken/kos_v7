import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    try {
        const preference = await prisma.userPreference.findUnique({
            where: { userId }
        }) as any;

        if (!preference) {
            return NextResponse.json({ apps: null });
        }

        return NextResponse.json({
            apps: JSON.parse(preference.apps),
            permissions: JSON.parse(preference.permissions || '{}'),
            wallpaper: preference.wallpaper,
            desktopTextColor: preference.desktopTextColor,
            iconBgColor: preference.iconBgColor,
            iconGlyphColor: preference.iconGlyphColor,
        });
    } catch (error: any) {
        console.error('Failed to fetch user config:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, apps, wallpaper, desktopTextColor, iconBgColor, iconGlyphColor } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        // 사용자가 존재하는지 먼저 확인하거나 없으면 생성 (데모 환경 고려)
        await (prisma.user.upsert as any)({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                username: userId === 'admin-1' ? 'admin' : userId,
                displayName: userId === 'admin-1' ? 'Administrator' : 'User',
                role: userId === 'admin-1' ? 'admin' : 'user'
            }
        });

        await (prisma.userPreference.upsert as any)({
            where: { userId },
            update: {
                apps: JSON.stringify(apps),
                wallpaper,
                desktopTextColor,
                iconBgColor,
                iconGlyphColor
            },
            create: {
                userId,
                apps: JSON.stringify(apps),
                wallpaper,
                desktopTextColor,
                iconBgColor,
                iconGlyphColor
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to update user config:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
