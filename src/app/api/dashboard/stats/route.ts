import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';
import { authenticateRequest } from '@/lib/authUtils';

// Force dynamic because we are reading "current time" although usage of cache inside service
// might effectively make it static-ish. But let's use dynamic to allow revalidation.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Centralized Authentication
        const auth = await authenticateRequest(request);

        if (!auth.isAuthenticated || !auth.permissions.canViewDashboard) {
            return NextResponse.json({
                status: 'error',
                message: `Unauthorized: ${auth.error || 'Permission denied'}`,
                // debug: auth // Removed for production safety, rely on logs
            }, { status: 401 });
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

        return NextResponse.json({
            status: 'ok',
            data: stats
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
