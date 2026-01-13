import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const getMemoModel = () => {
    return (prisma as any).memo || (prisma as any).Memo || (prisma as any).memos || (prisma as any).Memos;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { title, content, files } = body;

        // Note: In a real app, verify ownership with userId here

        const updateData: any = {
            title,
            content,
            updatedAt: new Date(),
        };

        if (files) {
            // Simple replace logic for files in this demo
            // For a production app, you'd handle diffing (delete old files from disk/DB)
            updateData.files = {
                deleteMany: {},
                create: files.map((file: any) => ({
                    url: file.url,
                    filename: file.filename,
                    size: file.size,
                    type: file.type
                }))
            };
        }

        const model = getMemoModel();
        if (!model) {
            const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_'));
            throw new Error(`Memo model not found. Available models: ${availableModels.join(', ')}`);
        }

        const memo = await model.update({
            where: { id },
            data: updateData,
            include: { files: true }
        });

        return NextResponse.json(memo);
    } catch (error) {
        console.error('Update memo error:', error);
        return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const model = getMemoModel();
        if (!model) {
            const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_'));
            throw new Error(`Memo model not found. Available models: ${availableModels.join(', ')}`);
        }

        const memo = await model.findUnique({
            where: { id },
            include: { files: true }
        });

        if (!memo) {
            return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
        }

        // Delete associated files and thumbnails from disk
        for (const file of memo.files) {
            try {
                // Delete original file
                const filePath = path.join(process.cwd(), 'public', file.url);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                // Delete thumbnail if exists
                if (file.thumbnailUrl) {
                    const thumbPath = path.join(process.cwd(), 'public', file.thumbnailUrl);
                    if (fs.existsSync(thumbPath)) {
                        fs.unlinkSync(thumbPath);
                    }
                }
            } catch (e) {
                console.warn('Failed to delete file from disk:', file.url, e);
            }
        }

        await model.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete memo error:', error);
        return NextResponse.json({ error: 'Failed to delete memo' }, { status: 500 });
    }
}
