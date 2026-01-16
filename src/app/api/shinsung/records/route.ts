import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { saveShinsungImage } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const all = searchParams.get('all') === 'true';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { product: { name: { contains: search } } },
                { part: { name: { contains: search } } },
                { note: { contains: search } },
                { ratio: { contains: search } },
                { testDate: { contains: search } },
                { rawOcrText: { contains: search } }
            ];
        }

        const records = await (prisma as any).shinsungRecord.findMany({
            where,
            include: { product: true, part: true },
            orderBy: { createdAt: 'desc' },
            ...(all ? {} : { skip, take: limit })
        });
        return NextResponse.json(records);
    } catch (error) {
        return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, partId, ratio, progress, testDate, thickness, imageUrl, extractedData, rawOcrText, note } = body;

        let finalImageUrl = imageUrl;
        let finalThumbnailUrl = '';
        if (imageUrl && imageUrl.startsWith('data:image')) {
            const saved = await saveShinsungImage(imageUrl);
            finalImageUrl = saved.url;
            finalThumbnailUrl = saved.thumbnailUrl;
        }

        const record = await (prisma as any).shinsungRecord.create({
            data: {
                productId,
                partId,
                ratio,
                testDate,
                thickness,
                progress: progress || "진행중",
                imageUrl: finalImageUrl,
                thumbnailUrl: finalThumbnailUrl,
                extractedData: typeof extractedData === 'string' ? extractedData : JSON.stringify(extractedData),
                rawOcrText,
                note
            },
            include: { product: true, part: true }
        });
        return NextResponse.json(record);
    } catch (error) {
        console.error('Save record error:', error);
        return NextResponse.json({ error: 'save failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        await (prisma as any).shinsungRecord.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'delete failed' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, productId, partId, ratio, progress, testDate, thickness, extractedData, note } = body;

        const record = await (prisma as any).shinsungRecord.update({
            where: { id },
            data: {
                productId,
                partId,
                ratio,
                progress,
                testDate,
                thickness,
                extractedData: typeof extractedData === 'string' ? extractedData : JSON.stringify(extractedData),
                note
            },
            include: { product: true, part: true }
        });
        return NextResponse.json(record);
    } catch (error) {
        return NextResponse.json({ error: 'update failed' }, { status: 500 });
    }
}
