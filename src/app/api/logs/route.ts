import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, username, action, appId, appName, targetId, details } = body;

        // 클라이언트에서 IP를 보내줄 수도 있고, 헤더에서 추출할 수도 있습니다.
        const ip = req.headers.get('x-forwarded-for') || 'unknown';

        const log = await prisma.activityLog.create({
            data: {
                userId,
                username,
                action,
                appId,
                appName,
                targetId,
                details: details ? JSON.stringify(details) : null,
                ip,
            },
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error('Failed to create activity log:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const appId = searchParams.get('appId') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where = {
            AND: [
                search ? {
                    OR: [
                        { username: { contains: search } },
                        { appName: { contains: search } },
                        { action: { contains: search } },
                        { details: { contains: search } },
                    ]
                } : {},
                appId ? { appId } : {},
            ]
        };

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.activityLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
