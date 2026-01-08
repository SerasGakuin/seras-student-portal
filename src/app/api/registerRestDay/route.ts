import { NextResponse } from 'next/server';
import { createRestDayEvent } from '@/services/calendarService';
import { lineService } from '@/services/lineService';
import { getStudentFromLineId } from '@/services/studentService';
import { RestDayRequestSchema } from '@/lib/schema';
import { ApiResponse } from '@/types';
import { extractErrorMessage } from '@/lib/apiHandler';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = RestDayRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: 'Invalid request data', data: validation.error.format() },
                { status: 400 }
            );
        }

        const { userId, date } = validation.data;

        // Get student name
        const student = await getStudentFromLineId(userId);
        if (!student) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: '生徒として未登録のLINE IDです' },
                { status: 404 }
            );
        }

        // Create calendar event via Service
        const eventResult = await createRestDayEvent(student.name, date);

        // Send confirmation message via LINE
        await lineService.pushMessage(
            userId,
            `【休む日】${student.name}さんの休む日は、${date}で予約完了しました！\n ひとこと、お休みする理由をここのチャットで教えてください：`
        );

        return NextResponse.json<ApiResponse>({
            status: 'ok',
            data: eventResult,
        });

    } catch (error: unknown) {
        console.error('Error registering rest day:', error);
        return NextResponse.json<ApiResponse>(
            { status: 'error', message: extractErrorMessage(error) },
            { status: 500 }
        );
    }
}
