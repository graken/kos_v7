import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { saveCoatingImage } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');
        const search = searchParams.get('search');
        const all = searchParams.get('all') === 'true';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: any = {};
        if (productId) where.productId = productId;
        if (search) {
            where.OR = [
                { product: { name: { contains: search } } },
                { note: { contains: search } },
                { rawOcrText: { contains: search } },
                { degree: { contains: search } },
                { stage: { contains: search } },
            ];
        }

        const records = await prisma.coatingRecord.findMany({
            where,
            include: { product: true },
            orderBy: { createdAt: 'desc' },
            ...(all ? {} : { skip, take: limit }),
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

        let finalImageUrl = imageUrl;
        let finalThumbnailUrl = null;

        if (imageUrl && imageUrl.startsWith('data:image')) {
            const saved = await saveCoatingImage(imageUrl);
            finalImageUrl = saved.url;
            finalThumbnailUrl = saved.thumbnailUrl;
        }

        const record = await prisma.coatingRecord.create({
            data: {
                productId,
                imageUrl: finalImageUrl,
                thumbnailUrl: finalThumbnailUrl,
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
        if (imageUrl !== undefined) {
            if (imageUrl && imageUrl.startsWith('data:image')) {
                const saved = await saveCoatingImage(imageUrl);
                updateData.imageUrl = saved.url;
                updateData.thumbnailUrl = saved.thumbnailUrl;
            } else {
                updateData.imageUrl = imageUrl;
                // If the user cleared the image
                if (imageUrl === null) updateData.thumbnailUrl = null;
            }
        }
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
