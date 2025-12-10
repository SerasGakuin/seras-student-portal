import { getGoogleCalendar } from '@/lib/googleCalendar';

const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

export const createMeetingEvent = async (
    studentName: string,
    date: string,
    meetingType: string,
    arrivalTime: string,
    leaveTime: string
) => {
    // Parse times (format: "T17:00:00")
    const startTime = arrivalTime.replace('T', '');
    const endTime = leaveTime.replace('T', '');

    // Explicitly set timezone to JST (+09:00)
    const startDateTime = new Date(`${date}T${startTime}+09:00`);
    const endDateTime = new Date(`${date}T${endTime}+09:00`);

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

    return {
        eventId: event.data.id,
        title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
    };
};

export const createRestDayEvent = async (
    studentName: string,
    date: string
) => {
    const calendar = await getGoogleCalendar();
    const title = `【休み】${studentName}`;
    const description = `予約システムからの登録\n生徒名: ${studentName}`;

    const event = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
            summary: title,
            description: description,
            start: {
                date: date, // All-day event
            },
            end: {
                date: date,
            },
        },
    });

    return {
        eventId: event.data.id,
        title,
        date,
    };
};
