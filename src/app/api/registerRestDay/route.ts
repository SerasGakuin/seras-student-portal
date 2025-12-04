import { NextResponse } from 'next/server';
import { getStudentNameFromLineId } from '@/lib/studentMaster';
import { getGoogleCalendar } from '@/lib/googleCalendar';
import { ApiResponse, RestDayRequest } from '@/types';

const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, date } = body as RestDayRequest;

        // Validation
        if (!userId || !date) {
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

        // Create calendar event (all-day event)
        const calendar = await getGoogleCalendar();
        const title = `【休み】${studentName}`;
        const description = `予約システムからの登録\n生徒名: ${studentName}`;

        const event = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: {
                summary: title,
                description: description,
                start: {
                    date: date, // All-day event uses 'date' instead of 'dateTime'
                },
                end: {
                    date: date,
                },
            },
        });

        return NextResponse.json<ApiResponse>({
            status: 'ok',
            data: {
                eventId: event.data.id,
                title: title,
                date: date,
            },
        });
    } catch (error: unknown) {
        console.error('Error registering rest day:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>(
            { status: 'error', message },
            { status: 500 }
        );
    }
}
