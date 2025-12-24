import { NextResponse } from 'next/server';
import { ApiResponse, OccupancyData } from '@/types';
import { occupancyService } from '@/services/occupancyService';
import { authenticateRequest } from '@/lib/authUtils';

export async function GET(req: Request) {
    try {
        const auth = await authenticateRequest(req);

        // Derive params from auth result
        const lineUserId = auth.user?.authMethod === 'line' ? auth.user.id : null;
        const isGoogleTeacher = auth.user?.authMethod === 'google';

        const data = await occupancyService.getOccupancyData(lineUserId, isGoogleTeacher);

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

