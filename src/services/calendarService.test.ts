import { createMeetingEvent, createRestDayEvent } from './calendarService';
import { getGoogleCalendar } from '@/lib/googleCalendar';

// Mock dependency
jest.mock('@/lib/googleCalendar', () => ({
    getGoogleCalendar: jest.fn(),
}));

describe('calendarService', () => {
    const mockCalendarClient = {
        events: {
            insert: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getGoogleCalendar as jest.Mock).mockResolvedValue(mockCalendarClient);

        // Mock ID
        process.env.CALENDAR_ID = 'primary';
    });

    describe('createMeetingEvent', () => {
        it('should create an event with correct ISO times and timezone', async () => {
            mockCalendarClient.events.insert.mockResolvedValue({
                data: { id: 'evt-123' },
            });

            const result = await createMeetingEvent(
                '山田 太郎',
                '2023-12-25',
                '面談',
                'T14:00:00',
                'T15:00:00'
            );

            expect(mockCalendarClient.events.insert).toHaveBeenCalledWith({
                calendarId: 'primary',
                requestBody: {
                    summary: '【面談】山田 太郎さん',
                    description: expect.stringContaining('予約システムからの登録'),
                    start: {
                        dateTime: '2023-12-25T05:00:00.000Z', // 14:00 JST in UTC
                        timeZone: 'Asia/Tokyo',
                    },
                    end: {
                        dateTime: '2023-12-25T06:00:00.000Z', // 15:00 JST in UTC
                        timeZone: 'Asia/Tokyo',
                    },
                },
            });

            expect(result).toEqual({
                eventId: 'evt-123',
                title: '【面談】山田 太郎さん',
                startTime: '2023-12-25T05:00:00.000Z',
                endTime: '2023-12-25T06:00:00.000Z',
            });
        });
    });

    describe('createRestDayEvent', () => {
        it('should create an all-day event', async () => {
            mockCalendarClient.events.insert.mockResolvedValue({
                data: { id: 'evt-rest' },
            });

            const result = await createRestDayEvent('佐藤 花子', '2024-01-01');

            expect(mockCalendarClient.events.insert).toHaveBeenCalledWith({
                calendarId: 'primary',
                requestBody: {
                    summary: '【休み】佐藤 花子',
                    description: expect.stringContaining('予約システムからの登録'),
                    start: { date: '2024-01-01' },
                    end: { date: '2024-01-01' },
                },
            });

            expect(result).toEqual({
                eventId: 'evt-rest',
                title: '【休み】佐藤 花子',
                date: '2024-01-01',
            });
        });
    });
});
