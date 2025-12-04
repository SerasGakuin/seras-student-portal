import { NextResponse } from 'next/server';
import { getStudentNameFromLineId } from '@/lib/studentMaster';
import { getGoogleCalendar } from '@/lib/googleCalendar';
import { ApiResponse, BookingRequest } from '@/types';

const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, date, meetingType, arrivalTime, leaveTime } = body as BookingRequest;

        // Validation
        if (!userId || !date || !meetingType || !arrivalTime || !leaveTime) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get student name
        const studentName = await getStudentNameFromLineId(userId);
        if (!studentName) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: '生徒として未登録のLINE IDです' },
                { status: 404 }
            );
        }

        // Parse times (format: "T17:00:00")
        const startTime = arrivalTime.replace('T', '');
        const endTime = leaveTime.replace('T', '');

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        // Create calendar event
        const calendar = await getGoogleCalendar();
        const title = `【${meetingType}】${studentName}さん`;
        const description = `予約システムからの登録\nタイプ: ${meetingType}\n生徒名: ${studentName}`;

        const event = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: {
                summary: title,
                description: description,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'Asia/Tokyo',
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'Asia/Tokyo',
                },
            },
        });

        return NextResponse.json<ApiResponse>({
            status: 'ok',
            data: {
                eventId: event.data.id,
                title: title,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
            },
        });
    } catch (error: unknown) {
        console.error('Error in reserveMeeting API:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>(
            { status: 'error', message },
            { status: 500 }
        );
    }
}
