import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const products = await (prisma as any).shinsungProduct.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json();
        const product = await (prisma as any).shinsungProduct.upsert({
            where: { name },
            update: {},
            create: { name }
        });
        return NextResponse.json(product);
    } catch (error) {
        console.error('Shinsung Product POST error:', error);
        return NextResponse.json({ error: 'create failed', detail: String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        // Check for records
        const recordCount = await (prisma as any).shinsungRecord.count({ where: { productId: id } });
        if (recordCount > 0) return NextResponse.json({ error: 'cannot delete product with records' }, { status: 400 });

        await (prisma as any).shinsungProduct.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'delete failed' }, { status: 500 });
    }
}
