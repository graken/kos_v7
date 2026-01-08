import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error('Fetch products error:', error);
        return NextResponse.json({ error: 'failed to fetch products' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

        const product = await prisma.product.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        return NextResponse.json(product);
    } catch (error) {
        console.error('Create product error:', error);
        return NextResponse.json({ error: 'failed to create product' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // 기록이 있는지 확인
        const recordCount = await prisma.coatingRecord.count({
            where: { productId: id }
        });

        if (recordCount > 0) {
            return NextResponse.json({
                error: '삭제할 수 없습니다. 이 품명으로 등록된 측정 기록이 존재합니다.'
            }, { status: 400 });
        }

        await prisma.product.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: 'failed to delete product' }, { status: 500 });
    }
}
