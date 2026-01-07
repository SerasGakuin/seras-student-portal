import { DashboardService } from '@/services/dashboardService';
import { withPermission, successResponse } from '@/lib/apiHandler';

export const dynamic = 'force-dynamic';

export const GET = withPermission('Dashboard Stats', 'canViewDashboard')(
    async (request) => {
        const { searchParams } = new URL(request.url);
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const gradeParam = searchParams.get('grade');

        const from = fromParam ? new Date(fromParam) : undefined;
        const to = toParam ? new Date(toParam) : undefined;
        const grade = gradeParam || undefined;

        const service = new DashboardService();
        const stats = await service.getDashboardStats(from, to, grade);

        return successResponse(stats);
    }
);
