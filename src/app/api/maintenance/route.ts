import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { saveImageToFile } from '@/lib/server-utils';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const incompleteOnly = searchParams.get('incompleteOnly') === 'true';
        const query = searchParams.get('query');

        const model = (prisma as any).maintenanceRecord || (prisma as any).MaintenanceRecord;
        if (!model) throw new Error('MaintenanceRecord model is missing');

        // Master data fetch
        if (type === 'master') {
            const [equipmentNames, parts, companies] = await Promise.all([
                model.findMany({ select: { equipmentName: true }, distinct: ['equipmentName'] }),
                model.findMany({ select: { part: true }, distinct: ['part'] }),
                model.findMany({ select: { company: true }, distinct: ['company'] }),
            ]);

            return NextResponse.json({
                equipmentName: equipmentNames.map((r: any) => r.equipmentName).filter(Boolean),
                part: parts.map((r: any) => r.part).filter(Boolean),
                company: companies.map((r: any) => r.company).filter(Boolean),
            });
        }

        const where: any = {};
        if (incompleteOnly) {
            where.completionDate = null;
        }
        if (query) {
            where.OR = [
                { equipmentName: { contains: query } },
                { detail: { contains: query } },
                { part: { contains: query } },
                { company: { contains: query } },
            ];
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;
        const all = searchParams.get('all') === 'true';

        const records = await model.findMany({
            where,
            include: { images: true },
            orderBy: { id: 'desc' },
            ...(all ? {} : { skip, take: limit }),
        });
        return NextResponse.json(records);
    } catch (error) {
        console.error('Fetch maintenance error:', error);
        return NextResponse.json({
            error: 'failed to fetch records',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { checkDate, equipmentName, part, detail, company, note, completionDate, images } = body;

        const model = (prisma as any).maintenanceRecord || (prisma as any).MaintenanceRecord;
        if (!model) throw new Error(`MaintenanceRecord model missing. Available: ${Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).join(', ')}`);

        console.log('Creating record with data:', {
            equipmentName,
            part,
            detail,
            imageCount: images?.length || 0
        });

        // 사진 파일 저장 처리
        const savedImages = await Promise.all(
            (images || []).map(async (img: { url: string, thumbnailUrl: string }) => {
                const originalUrl = await saveImageToFile(img.url, 'originals');
                const thumbnailUrl = await saveImageToFile(img.thumbnailUrl, 'thumbnails');
                return { url: originalUrl, thumbnailUrl };
            })
        );

        const record = await model.create({
            data: {
                checkDate: checkDate ? new Date(checkDate) : new Date(),
                equipmentName,
                part,
                detail,
                company,
                note,
                completionDate: completionDate ? new Date(completionDate) : null,
                images: {
                    create: savedImages,
                },
            },
            include: { images: true },
        });
        console.log('Record created successfully:', record.id);
        return NextResponse.json(record);
    } catch (error: any) {
        console.error('Create maintenance error:', error);
        return NextResponse.json({
            error: 'failed to create record',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, checkDate, equipmentName, part, detail, company, note, completionDate, images } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const model = (prisma as any).maintenanceRecord || (prisma as any).MaintenanceRecord;
        const imageModel = (prisma as any).maintenanceImage || (prisma as any).MaintenanceImage;
        if (!model) throw new Error('MaintenanceRecord model is missing');

        // 1. 사진 파일 저장 처리
        const savedImages = await Promise.all(
            (images || []).map(async (img: { url: string, thumbnailUrl: string }) => {
                const originalUrl = await saveImageToFile(img.url, 'originals');
                const thumbnailUrl = await saveImageToFile(img.thumbnailUrl, 'thumbnails');
                return { url: originalUrl, thumbnailUrl };
            })
        );

        // 2. 기존 이미지 삭제 (전략: 모두 지우고 새로 생성하거나, 차이점만 처리)
        // 여기서는 간단하게 기존 이미지를 모두 DB에서 지우고 (파일은 유지하거나 수동 관리) 새로 생성하는 방식 사용
        await imageModel.deleteMany({
            where: { recordId: Number(id) }
        });

        const updateData: any = {};
        if (checkDate) updateData.checkDate = new Date(checkDate);
        if (equipmentName) updateData.equipmentName = equipmentName;
        if (part) updateData.part = part;
        if (detail) updateData.detail = detail;
        if (company !== undefined) updateData.company = company;
        if (note !== undefined) updateData.note = note;
        if (completionDate !== undefined) updateData.completionDate = completionDate ? new Date(completionDate) : null;

        // 이미지 관계 업데이트
        updateData.images = {
            create: savedImages
        };

        const record = await model.update({
            where: { id: Number(id) },
            data: updateData,
            include: { images: true },
        });

        return NextResponse.json(record);
    } catch (error) {
        console.error('Update maintenance error:', error);
        return NextResponse.json({ error: 'failed to update record' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const model = (prisma as any).maintenanceRecord || (prisma as any).MaintenanceRecord;
        if (!model) throw new Error('MaintenanceRecord model is missing');

        // 삭제 전 관련 파일 정보 가져오기
        const recordToDelete = await model.findUnique({
            where: { id: Number(id) },
            include: { images: true }
        });

        if (recordToDelete) {
            // 실제 파일 삭제 처리
            for (const img of recordToDelete.images) {
                try {
                    const originalPath = path.join(process.cwd(), 'public', img.url);
                    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);

                    if (img.thumbnailUrl) {
                        const thumbnailPath = path.join(process.cwd(), 'public', img.thumbnailUrl);
                        if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
                    }
                } catch (e) {
                    console.warn('File deletion error:', e);
                }
            }
        }

        await model.delete({
            where: { id: Number(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete maintenance error:', error);
        return NextResponse.json({ error: 'failed to delete record' }, { status: 500 });
    }
}
