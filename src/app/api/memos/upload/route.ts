import { NextResponse } from 'next/server';
import { saveMemoFile } from '@/lib/server-utils';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'image' or 'file'

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const { url, thumbnailUrl } = await saveMemoFile(buffer, file.name, type as 'image' | 'file');

        return NextResponse.json({
            url,
            thumbnailUrl,
            filename: file.name,
            size: file.size,
            type: file.type
        });
    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
