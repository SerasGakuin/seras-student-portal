import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';
import { loginStudent } from '@/services/authService';
import { CONFIG } from '@/lib/config';

// Force dynamic because we are reading "current time" although usage of cache inside service
// might effectively make it static-ish. But let's use dynamic to allow revalidation.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. Auth Check (Identity)
        const lineUserId = request.headers.get('x-line-user-id');
        if (!lineUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await loginStudent(lineUserId);
        if (!student) {
            return NextResponse.json({ error: 'User not found' }, { status: 403 });
        }

        // 2. Permission Check (Role)
        const allowedStatuses = CONFIG.PERMISSIONS.VIEW_DASHBOARD as readonly string[];
        if (!allowedStatuses.includes(student.status)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Logic
        const { searchParams } = new URL(request.url);
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const gradeParam = searchParams.get('grade');

        const from = fromParam ? new Date(fromParam) : undefined;
        const to = toParam ? new Date(toParam) : undefined;
        const grade = gradeParam || undefined;

        const service = new DashboardService();
        const stats = await service.getDashboardStats(from, to, grade);

        return NextResponse.json(stats);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
