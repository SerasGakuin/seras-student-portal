import { NextResponse } from 'next/server';
import { createMeetingEvent } from '@/services/calendarService';
import { lineService } from '@/services/lineService';
import { getStudentFromLineId } from '@/services/studentService';
import { BookingRequestSchema } from '@/lib/schema';
import { ApiResponse } from '@/types';
import { extractErrorMessage } from '@/lib/apiHandler';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = BookingRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: 'Invalid request data', data: validation.error.format() },
                { status: 400 }
            );
        }

        const { userId, date, meetingType, arrivalTime, leaveTime } = validation.data;

        // Get student name
        const student = await getStudentFromLineId(userId);
        if (!student) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: '生徒として未登録のLINE IDです' },
                { status: 404 }
            );
        }

        // Create calendar event via Service
        const eventResult = await createMeetingEvent(
            student.name,
            date,
            meetingType,
            arrivalTime,
            leaveTime
        );

        // Send confirmation message via Service
        // Format time for display (HH:MM)
        const formatTime = (t: string) => t.slice(0, 5);
        // Note: The service expects raw T-prefixed time strings as input? 
        // In calendarService.ts I implemented it to strip 'T'.
        // My schema validation ensures it matches T\d\d... pattern.
        // Wait, formatTime logic duplicates slicing. Ideally NotificationService handles formatting.
        // For now, keeping format logic here or moving it to lineService?
        // Let's keep it here for custom message construction or refactor later.

        await lineService.pushMessage(
            userId,
            `【${meetingType}】${student.name}さんの${meetingType}は、${date} ${formatTime(arrivalTime.replace('T', ''))}-${formatTime(leaveTime.replace('T', ''))}で予約完了しました！`
        );

        return NextResponse.json<ApiResponse>({
            status: 'ok',
            data: eventResult,
        });

    } catch (error: unknown) {
        console.error('Error in reserveMeeting API:', error);
        return NextResponse.json<ApiResponse>(
            { status: 'error', message: extractErrorMessage(error) },
            { status: 500 }
        );
    }
}
