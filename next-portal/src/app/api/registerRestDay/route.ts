import { NextResponse } from 'next/server';
import { getStudentNameFromLineId } from '@/lib/studentMaster';
import { getGoogleCalendar } from '@/lib/googleCalendar';

const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, date } = body;

        // Validation
        if (!userId || !date) {
            return NextResponse.json(
                { status: 'error', message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get student name
        const studentName = await getStudentNameFromLineId(userId);
        if (!studentName) {
            return NextResponse.json(
                { status: 'error', message: '未登録生徒' },
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

        return NextResponse.json({
            status: 'ok',
            data: {
                eventId: event.data.id,
                title: title,
                date: date,
            },
        });
    } catch (error: any) {
        console.error('Error in registerRestDay API:', error);
        return NextResponse.json(
            { status: 'error', message: error.message },
            { status: 500 }
        );
    }
}
