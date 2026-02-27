import { withPermission, successResponse, validationErrorResponse } from '@/lib/apiHandler';
import { getMonthlyRanking } from '@/services/rankingAnalysisService';

export const GET = withPermission('Analysis Ranking', 'canViewDashboard')(
    async (request) => {
        const url = new URL(request.url);
        const month = url.searchParams.get('month');
        const topNParam = url.searchParams.get('topN');

        if (!month) {
            return validationErrorResponse('month parameter is required (YYYY-MM format)');
        }

        // YYYY-MM 形式のバリデーション
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return validationErrorResponse('Invalid month format. Use YYYY-MM.');
        }

        const topN = topNParam ? parseInt(topNParam, 10) : 5;
        if (isNaN(topN) || topN < 1 || topN > 50) {
            return validationErrorResponse('topN must be between 1 and 50');
        }

        const data = await getMonthlyRanking(month, topN);
        return successResponse(data);
    },
);
