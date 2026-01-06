
// Remove static imports of the service to allow re-evaluation
// import { DashboardService } from './dashboardService';

import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { BadgeService } from '@/services/badgeService';

// Mock dependencies
jest.mock('@/repositories/googleSheets/GoogleSheetOccupancyRepository');
jest.mock('@/repositories/googleSheets/GoogleSheetStudentRepository');
jest.mock('@/services/badgeService');

// --- Test Constants (DRY) ---
const TEST_DATE = {
    BASE: '2025-12-25',           // Base date for test data
    SYSTEM_TIME: '2025-12-25T14:00:00',  // System time for tests (same day as BASE)
    NEXT_DAY: '2025-12-26T10:00:00',     // Next day (for testing past logs)
};

describe('DashboardService', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let service: any; // Use any because we require it dynamically

    // Spies/Mocks we want to control
    let mockFindAllLogs: jest.Mock;
    let mockFindAllStudents: jest.Mock;
    let mockGetWeeklyBadges: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFindAllLogs = jest.fn().mockResolvedValue([]);
        mockFindAllStudents = jest.fn().mockResolvedValue({});
        mockGetWeeklyBadges = jest.fn().mockResolvedValue({ exam: {}, general: {} });

        // Setup mock implementations
        (GoogleSheetOccupancyRepository as jest.Mock).mockImplementation(() => ({
            findAllLogs: mockFindAllLogs
        }));

        (GoogleSheetStudentRepository as jest.Mock).mockImplementation(() => ({
            findAll: mockFindAllStudents
        }));

        (BadgeService as jest.Mock).mockImplementation(() => ({
            getWeeklyBadges: mockGetWeeklyBadges
        }));

        // Use isolateModules to re-evaluate the module and pick up new mock instances
        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { DashboardService } = require('./dashboardService');
            service = new DashboardService();
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('calculateDurationMinutes', () => {
        it('should calculate duration correctly when exit time is present', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllLogs.mockResolvedValue([
                {
                    name: 'Test Student',
                    entryTime: `${TEST_DATE.BASE}T10:00:00`,
                    exitTime: `${TEST_DATE.BASE}T12:30:00`,  // 2.5 hours = 150 minutes
                    lineId: '123'
                }
            ]);

            const result = await service.getStudentDetails('Test Student', 7);
            const log = result.history[0];

            expect(log.durationMinutes).toBe(150);
        });

        it('should cap duration at 4 hours if exit time is missing', async () => {
            // Set system time to next day so "diffHours < 12" logic is skipped
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.NEXT_DAY));

            mockFindAllLogs.mockResolvedValue([
                {
                    name: 'Test Student',
                    entryTime: `${TEST_DATE.BASE}T10:00:00`,  // +4h = 14:00 (before 22:00)
                    exitTime: '',
                    lineId: '123'
                }
            ]);

            const result = await service.getStudentDetails('Test Student', 7);
            const log = result.history[0];

            expect(log.durationMinutes).toBe(240);
        });

        it('should cap duration at 22:00 if start time is late', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.NEXT_DAY));

            mockFindAllLogs.mockResolvedValue([
                {
                    name: 'Test Student',
                    entryTime: `${TEST_DATE.BASE}T20:00:00`,  // +4h = 24:00, cap at 22:00 = 2h
                    exitTime: '',
                    lineId: '123'
                }
            ]);

            const result = await service.getStudentDetails('Test Student', 7);
            const log = result.history[0];

            expect(log.durationMinutes).toBe(120);
        });
    });

    describe('Streak Calculation', () => {
        it('should calculate current streak correctly', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            // 3 consecutive days (25, 24, 23) + 1 gap day (22) + 1 day (21)
            mockFindAllLogs.mockResolvedValue([
                { name: 'S', entryTime: `${TEST_DATE.BASE}T10:00:00`, exitTime: `${TEST_DATE.BASE}T11:00:00`, lineId: '1' },
                { name: 'S', entryTime: '2025-12-24T10:00:00', exitTime: '2025-12-24T11:00:00', lineId: '1' },
                { name: 'S', entryTime: '2025-12-23T10:00:00', exitTime: '2025-12-23T11:00:00', lineId: '1' },
                { name: 'S', entryTime: '2025-12-21T10:00:00', exitTime: '2025-12-21T11:00:00', lineId: '1' },
            ]);

            const result = await service.getStudentDetails('S', 30);
            expect(result.currentStreak).toBe(3);
            expect(result.maxConsecutiveDays).toBe(3);
        });

        it('should return 0 streak if last visit was 2 days ago', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllLogs.mockResolvedValue([
                { name: 'S', entryTime: '2025-12-23T10:00:00', exitTime: '2025-12-23T11:00:00', lineId: '1' },
            ]);

            const result = await service.getStudentDetails('S', 30);
            expect(result.currentStreak).toBe(0);
        });
    });
});
