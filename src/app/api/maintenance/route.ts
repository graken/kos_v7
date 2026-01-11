import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

        // Check for model existence with detailed logging
        const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
        console.log('Available models in generated client:', availableModels);

        const records = await model.findMany({
            where,
            include: { images: true },
            orderBy: { id: 'desc' },
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
        const { checkDate, equipmentName, part, detail, company, note, completionDate, imageUrls } = body;

        const model = (prisma as any).maintenanceRecord || (prisma as any).MaintenanceRecord;
        if (!model) throw new Error(`MaintenanceRecord model missing. Available: ${Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).join(', ')}`);

        console.log('Creating record with data:', {
            equipmentName,
            part,
            detail,
            imageCount: imageUrls?.length || 0
        });

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
                    create: (imageUrls || []).map((url: string) => ({ url })),
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
        const { id, checkDate, equipmentName, part, detail, company, note, completionDate } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const model = (prisma as any).maintenanceRecord || (prisma as any).MaintenanceRecord;
        if (!model) throw new Error('MaintenanceRecord model is missing');

        const updateData: any = {};
        if (checkDate) updateData.checkDate = new Date(checkDate);
        if (equipmentName) updateData.equipmentName = equipmentName;
        if (part) updateData.part = part;
        if (detail) updateData.detail = detail;
        if (company !== undefined) updateData.company = company;
        if (note !== undefined) updateData.note = note;
        if (completionDate !== undefined) updateData.completionDate = completionDate ? new Date(completionDate) : null;

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

        await model.delete({
            where: { id: Number(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete maintenance error:', error);
        return NextResponse.json({ error: 'failed to delete record' }, { status: 500 });
    }
}
