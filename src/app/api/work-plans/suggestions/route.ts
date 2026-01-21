import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const field = searchParams.get('field');

        if (!field) {
            return NextResponse.json({ error: 'Field parameter is required' }, { status: 400 });
        }

        // Validate field names to prevent arbitrary access (though simple in this case)
        const allowedFields = ['customer', 'inputProduct', 'outputProduct', 'machineName', 'adhesive'];
        if (!allowedFields.includes(field)) {
            return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
        }

        // Fetch unique values for the requested field
        const results = await (prisma as any).workPlan.findMany({
            select: { [field]: true },
            distinct: [field],
            where: {
                AND: [
                    { [field]: { not: null } },
                    { [field]: { not: "" } }
                ]
            },
            take: 50
        });

        const suggestions = results.map((r: any) => r[field]).filter(Boolean);

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error('Fetch suggestions error:', error);
        return NextResponse.json({ error: 'fetch suggestions failed' }, { status: 500 });
    }
}
