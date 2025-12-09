import { NextResponse } from 'next/server';
import { getStudentFromLineId } from '@/lib/studentMaster';
import { getGoogleCalendar } from '@/lib/googleCalendar';
import { sendPushMessage } from '@/lib/line';
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
        const student = await getStudentFromLineId(userId);
        if (!student) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: '生徒として未登録のLINE IDです' },
                { status: 404 }
            );
        }
        const studentName = student.name;

        // Parse times (format: "T17:00:00")
        const startTime = arrivalTime.replace('T', '');
        const endTime = leaveTime.replace('T', '');

        // Explicitly set timezone to JST (+09:00) to prevent server from interpreting as UTC
        const startDateTime = new Date(`${date}T${startTime}+09:00`);
        const endDateTime = new Date(`${date}T${endTime}+09:00`);

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

        // Send confirmation message via LINE
        await sendPushMessage(
            userId,
            `【${meetingType}】${studentName}さんの${meetingType}は、${date} ${startTime}-${endTime}で予約完了しました！`
        );

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
