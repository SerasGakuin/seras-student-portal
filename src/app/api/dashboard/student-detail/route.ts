import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get('name');
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 28;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const dashboardService = new DashboardService();
        const details = await dashboardService.getStudentDetails(name, days);

        return NextResponse.json(details);
    } catch (e) {
        console.error('Failed to fetch student details', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
