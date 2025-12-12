import { NextResponse } from 'next/server';
import { ApiResponse, OccupancyData } from '@/types';
import { occupancyService } from '@/services/occupancyService';

export async function GET(req: Request) {
    try {
        const lineUserId = req.headers.get('x-line-user-id');
        const data = await occupancyService.getOccupancyData(lineUserId);

        return NextResponse.json<ApiResponse<OccupancyData>>({
            status: 'ok',
            data,
        });

    } catch (error: unknown) {
        console.error('Error fetching occupancy:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse<OccupancyData>>({ status: 'error', message }, { status: 500 });
    }
}

