import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        let users = await prisma.user.findMany({
            include: { preferences: true },
            orderBy: { createdAt: 'asc' }
        });

        // 사용자가 한 명도 없으면 초기 관리자 생성
        if (users.length === 0) {
            const admin = await prisma.user.create({
                data: {
                    username: 'admin',
                    displayName: '관리자',
                    role: 'admin',
                    preferences: {
                        create: {
                            apps: JSON.stringify([
                                { id: 'browser', name: 'Browser', iconName: 'Globe' },
                                { id: 'settings', name: 'Settings', iconName: 'Settings' },
                                { id: 'equipment-maintenance', name: '설비점검', iconName: 'Activity' },
                                { id: 'user-manager', name: '사용자 관리', iconName: 'Users' }
                            ]),
                            permissions: JSON.stringify({
                                'equipment-maintenance': { delete: true, complete: true }
                            })
                        }
                    }
                },
                include: { preferences: true }
            });
            users = [admin];
        }

        const formattedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            role: user.role,
            apps: JSON.parse(user.preferences?.apps || '[]'),
            permissions: JSON.parse(user.preferences?.permissions || '{}')
        }));

        return NextResponse.json(formattedUsers);
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, username, displayName, role, apps, permissions, avatar } = body;

        if (id) {
            // Update
            const updatedUser = await prisma.user.update({
                where: { id },
                data: {
                    username,
                    displayName,
                    role,
                    avatar,
                    preferences: {
                        upsert: {
                            create: {
                                apps: JSON.stringify(apps || []),
                                permissions: JSON.stringify(permissions || {})
                            },
                            update: {
                                apps: JSON.stringify(apps || []),
                                permissions: JSON.stringify(permissions || {})
                            }
                        }
                    }
                }
            });
            return NextResponse.json(updatedUser);
        } else {
            // Create
            const newUser = await prisma.user.create({
                data: {
                    username,
                    displayName,
                    role,
                    avatar,
                    preferences: {
                        create: {
                            apps: JSON.stringify(apps || []),
                            permissions: JSON.stringify(permissions || {})
                        }
                    }
                }
            });
            return NextResponse.json(newUser);
        }
    } catch (error) {
        console.error('User management error:', error);
        return NextResponse.json({ error: 'Failed to manage user' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 기본 관리자 계정 삭제 보호
        if (user.role === 'admin' || user.username === 'admin') {
            return NextResponse.json({ error: 'Cannot delete administrator account' }, { status: 403 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('User deletion error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
