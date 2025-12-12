import { NextResponse } from 'next/server';
import { occupancyService } from '@/services/occupancyService';
import { ApiResponse } from '@/types';

/**
 * Cron Job: Auto-Close Building 2
 * Scheduled to run daily at 23:00 via Vercel Cron.
 */
export async function GET(req: Request) {
    try {
        // 1. Check current status
        const { building2 } = await occupancyService.getOccupancyData(null);

        // 2. If OPEN, close it
        if (building2.isOpen) {
            console.log('[Auto-Close] Building 2 is OPEN. Closing now...');
            await occupancyService.updateBuildingStatus({
                building: '2',
                isOpen: false,
                actorName: 'System (Auto-Close)'
            });
            return NextResponse.json<ApiResponse<{ closed: boolean }>>({
                status: 'ok',
                data: { closed: true },
                message: 'Building 2 was OPEN and has been auto-closed.',
            });
        }

        // 3. If already CLOSED, do nothing
        return NextResponse.json<ApiResponse<{ closed: boolean }>>({
            status: 'ok',
            data: { closed: false },
            message: 'Building 2 is already CLOSED.',
        });

    } catch (error: unknown) {
        console.error('[Auto-Close] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>({ status: 'error', message }, { status: 500 });
    }
}
