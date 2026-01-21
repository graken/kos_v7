import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const inputProduct = searchParams.get('inputProduct');
        const outputProduct = searchParams.get('outputProduct');
        const machineName = searchParams.get('machineName');

        if (!inputProduct && !outputProduct) {
            return NextResponse.json({ error: 'Query parameters required' }, { status: 400 });
        }

        const where: any = {};
        if (inputProduct) where.inputProduct = inputProduct;
        if (outputProduct) where.outputProduct = outputProduct;
        if (machineName) where.machineName = machineName;

        const latestPlan = await (prisma as any).workPlan.findFirst({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(latestPlan || {});
    } catch (error) {
        console.error('Fetch latest history error:', error);
        return NextResponse.json({ error: 'fetch history failed' }, { status: 500 });
    }
}
