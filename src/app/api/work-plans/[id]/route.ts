import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: any }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { planDate, duration, order, customer, inputProduct, outputProduct, outputSize, outputWidth, outputLength, machineName, processType, adhesive, mixingRatio, mesh, speed, note, importantNotice } = body;

        const data: any = {};
        if (body.planDate) {
            const date = new Date(body.planDate);
            if (!isNaN(date.getTime())) {
                data.planDate = date;
            }
        }
        if (body.duration !== undefined) {
            const parsedDuration = parseInt(body.duration);
            if (!isNaN(parsedDuration)) data.duration = parsedDuration;
        }
        if (body.order !== undefined) {
            const parsedOrder = parseInt(body.order);
            if (!isNaN(parsedOrder)) data.order = parsedOrder;
        }
        if (body.customer !== undefined) data.customer = body.customer;
        if (body.inputProduct !== undefined) data.inputProduct = body.inputProduct;
        if (body.outputProduct !== undefined) data.outputProduct = body.outputProduct;
        if (body.outputSize !== undefined) data.outputSize = body.outputSize;
        if (body.outputWidth !== undefined) data.outputWidth = body.outputWidth;
        if (body.outputLength !== undefined) data.outputLength = body.outputLength;
        if (body.machineName !== undefined) data.machineName = body.machineName;
        if (body.processType !== undefined) data.processType = body.processType;
        if (body.adhesive !== undefined) data.adhesive = body.adhesive;
        if (body.mixingRatio !== undefined) data.mixingRatio = typeof body.mixingRatio === 'string' ? body.mixingRatio : JSON.stringify(body.mixingRatio);
        if (body.mesh !== undefined) data.mesh = body.mesh;
        if (body.speed !== undefined) data.speed = body.speed;
        if (body.note !== undefined) data.note = body.note;
        if (body.importantNotice !== undefined) data.importantNotice = body.importantNotice;

        console.log('Updating work plan id:', id, 'with data:', data);

        const plan = await (prisma as any).workPlan.update({
            where: { id },
            data
        });
        return NextResponse.json(plan);
    } catch (error: any) {
        console.error('Update work plan error:', error);
        return NextResponse.json({ error: error.message || 'update failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: any }) {
    try {
        const { id } = await params;
        await (prisma as any).workPlan.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete work plan error:', error);
        return NextResponse.json({ error: error.message || 'delete failed' }, { status: 500 });
    }
}
