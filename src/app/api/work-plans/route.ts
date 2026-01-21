import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        const where: any = {};
        if (start && end) {
            where.planDate = {
                gte: new Date(start),
                lte: new Date(end),
            };
        }

        const plans = await (prisma as any).workPlan.findMany({
            where,
            orderBy: [
                { planDate: 'asc' },
                { order: 'asc' }
            ]
        });
        return NextResponse.json(plans);
    } catch (error) {
        console.error('Fetch work plans error:', error);
        return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            planDate, duration, order, customer,
            inputProduct, outputProduct, outputSize,
            outputWidth, outputLength,
            machineName, processType, adhesive, mixingRatio, mesh, speed, note
        } = body;

        const plan = await (prisma as any).workPlan.create({
            data: {
                planDate: new Date(planDate),
                duration: parseInt(duration) || 60,
                order: parseInt(order) || 0,
                customer: customer || "",
                inputProduct: inputProduct || "",
                outputProduct: outputProduct || "",
                outputSize: outputSize || "",
                outputWidth: outputWidth || "",
                outputLength: outputLength || "",
                machineName: machineName || "",
                processType: processType || "",
                adhesive,
                mixingRatio: typeof mixingRatio === 'string' ? mixingRatio : JSON.stringify(mixingRatio),
                mesh,
                speed,
                note,
                importantNotice: body.importantNotice || ""
            }
        });
        return NextResponse.json(plan);
    } catch (error) {
        console.error('Create work plan error:', error);
        return NextResponse.json({ error: 'save failed' }, { status: 500 });
    }
}
