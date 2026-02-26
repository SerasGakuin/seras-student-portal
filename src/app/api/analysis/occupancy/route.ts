import { withPermission, successResponse, validationErrorResponse } from '@/lib/apiHandler';
import { getOccupancyAnalysis } from '@/services/analysisService';

export const GET = withPermission('Analysis Occupancy', 'canViewDashboard')(
  async (request) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!from || !to) {
      return validationErrorResponse('from and to parameters are required');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return validationErrorResponse('Invalid date format. Use YYYY-MM-DD.');
    }

    const data = await getOccupancyAnalysis(fromDate, toDate);
    return successResponse(data);
  }
);
