import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');

        const records = await prisma.coatingRecord.findMany({
            where: productId ? { productId } : {},
            include: { product: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(records);
    } catch (error) {
        console.error('Fetch records error:', error);
        return NextResponse.json({ error: 'failed to fetch records' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { productId, imageUrl, extractedData, rawOcrText, degree, stage, note } = await req.json();

        if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });

        const record = await prisma.coatingRecord.create({
            data: {
                productId,
                imageUrl,
                extractedData: JSON.stringify(extractedData),
                rawOcrText,
                degree: degree || "",
                stage: stage || "",
                note: note || "",
            },
            include: { product: true },
        });
        return NextResponse.json(record);
    } catch (error) {
        console.error('Create record error:', error);
        return NextResponse.json({ error: 'failed to create record' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id, productId, imageUrl, extractedData, rawOcrText, degree, stage, note } = await req.json();

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const updateData: any = {};
        if (productId) updateData.productId = productId;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (extractedData) updateData.extractedData = JSON.stringify(extractedData);
        if (rawOcrText !== undefined) updateData.rawOcrText = rawOcrText;
        if (degree !== undefined) updateData.degree = degree;
        if (stage !== undefined) updateData.stage = stage;
        if (note !== undefined) updateData.note = note;

        const record = await prisma.coatingRecord.update({
            where: { id },
            data: updateData,
            include: { product: true },
        });

        return NextResponse.json(record);
    } catch (error) {
        console.error('Update record error:', error);
        return NextResponse.json({ error: 'failed to update record' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await prisma.coatingRecord.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete record error:', error);
        return NextResponse.json({ error: 'failed to delete record' }, { status: 500 });
    }
}
