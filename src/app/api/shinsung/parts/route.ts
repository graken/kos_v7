import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const parts = await (prisma as any).shinsungPart.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(parts);
    } catch (error) {
        return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json();
        const part = await (prisma as any).shinsungPart.upsert({
            where: { name },
            update: {},
            create: { name }
        });
        return NextResponse.json(part);
    } catch (error) {
        console.error('Shinsung Part POST error:', error);
        return NextResponse.json({ error: 'create failed', detail: String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const recordCount = await (prisma as any).shinsungRecord.count({ where: { partId: id } });
        if (recordCount > 0) return NextResponse.json({ error: 'cannot delete part with records' }, { status: 400 });

        await (prisma as any).shinsungPart.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'delete failed' }, { status: 500 });
    }
}
