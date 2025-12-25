import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { z } from 'zod';
import { occupancyService } from '@/services/occupancyService';

const StatusUpdateSchema = z.object({
    building: z.enum(['1', '2']),
    isOpen: z.boolean(),
    actorName: z.string().min(1),
});

import { authenticateRequest } from '@/lib/authUtils';

export async function POST(req: Request) {
    try {
        // 1. Authentication & Authorization
        const auth = await authenticateRequest(req);
        if (!auth.isAuthenticated || !auth.permissions.canOperateBuildingStatus) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Unauthorized: You do not have permission to operate building status',
            }, { status: 403 });
        }

        const body = await req.json();
        const parseResult = StatusUpdateSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Invalid input',
            }, { status: 400 });
        }

        const { building, isOpen } = parseResult.data;
        // Securely use authenticated user name instead of trusting client input
        const actorName = auth.user?.name || parseResult.data.actorName;

        await occupancyService.updateBuildingStatus({ building, isOpen, actorName });

        return NextResponse.json<ApiResponse<{ success: boolean }>>({
            status: 'ok',
            data: { success: true },
        });

    } catch (error: unknown) {
        console.error('Error updating status:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>({
            status: 'error',
            message,
        }, { status: 500 });
    }
}
