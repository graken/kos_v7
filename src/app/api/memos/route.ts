import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const getMemoModel = () => {
    // Prisma client might have different naming conventions depending on its generation state
    return (prisma as any).memo || (prisma as any).Memo || (prisma as any).memos || (prisma as any).Memos;
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const model = getMemoModel();
        if (!model) {
            const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_'));
            throw new Error(`Memo model not found. Available models: ${availableModels.join(', ')}`);
        }

        const memos = await model.findMany({
            where: { userId },
            include: { files: true },
            orderBy: { updatedAt: 'desc' }
        });

        // Ensure we always return an array
        return NextResponse.json(Array.isArray(memos) ? memos : []);
    } catch (error) {
        console.error('Fetch memos error:', error);
        return NextResponse.json({
            error: 'Failed to fetch memos',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content, userId, files } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const model = getMemoModel();
        if (!model) {
            const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_'));
            throw new Error(`Memo model not found. Available models: ${availableModels.join(', ')}`);
        }

        const memo = await model.create({
            data: {
                title: title || '제목 없음',
                content: content || '',
                userId,
                files: {
                    create: (files || []).map((file: any) => ({
                        url: file.url,
                        filename: file.filename,
                        size: file.size,
                        type: file.type
                    }))
                }
            },
            include: { files: true }
        });

        return NextResponse.json(memo);
    } catch (error) {
        console.error('Create memo error:', error);
        return NextResponse.json({
            error: 'Failed to create memo',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
