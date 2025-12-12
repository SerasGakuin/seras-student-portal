import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { z } from 'zod';
import { occupancyService } from '@/services/occupancyService';

const StatusUpdateSchema = z.object({
    building: z.enum(['1', '2']),
    isOpen: z.boolean(),
    actorName: z.string().min(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parseResult = StatusUpdateSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Invalid input',
            }, { status: 400 });
        }

        const { building, isOpen, actorName } = parseResult.data;

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
