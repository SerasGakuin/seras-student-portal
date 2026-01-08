
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

        it('should use filled exit time from cron job for past dates', async () => {
            // 23:00 JST の Cron ジョブにより exitTime が補完されるため、
            // 過去の日付では exitTime が設定されている前提でテスト
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.NEXT_DAY));

            mockFindAllLogs.mockResolvedValue([
                {
                    name: 'Test Student',
                    entryTime: `${TEST_DATE.BASE}T10:00:00`,
                    exitTime: `${TEST_DATE.BASE}T14:00:00`,  // Cron により補完済み（4時間）
                    lineId: '123'
                }
            ]);

            const result = await service.getStudentDetails('Test Student', 7);
            const log = result.history[0];

            expect(log.durationMinutes).toBe(240);
        });

        it('should calculate duration to current time when exit time is missing (real-time display)', async () => {
            // 同日のリアルタイム表示：exitTime が未設定の場合は現在時刻まで計算
            jest.useFakeTimers().setSystemTime(new Date(`${TEST_DATE.BASE}T14:00:00`));

            mockFindAllLogs.mockResolvedValue([
                {
                    name: 'Test Student',
                    entryTime: `${TEST_DATE.BASE}T10:00:00`,  // 10:00入室、現在14:00 → 4時間
                    exitTime: '',
                    lineId: '123'
                }
            ]);

            const result = await service.getStudentDetails('Test Student', 7);
            const log = result.history[0];

            expect(log.durationMinutes).toBe(240);  // 10:00 → 14:00 = 4時間
        });
    });

    describe('getDashboardStats - zero duration students', () => {
        it('includes students with no logs in the period', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            // 生徒マスター: 田中, 山田, 佐藤（全員在塾）
            mockFindAllStudents.mockResolvedValue({
                'LINE_TANAKA': { lineId: 'LINE_TANAKA', name: '田中', grade: '高2', status: '在塾' },
                'LINE_YAMADA': { lineId: 'LINE_YAMADA', name: '山田', grade: '高3', status: '在塾' },
                'LINE_SATO': { lineId: 'LINE_SATO', name: '佐藤', grade: '中3', status: '在塾' },
            });

            // ログ: 田中のみ
            mockFindAllLogs.mockResolvedValue([
                { name: '田中', entryTime: `${TEST_DATE.BASE}T10:00:00`, exitTime: `${TEST_DATE.BASE}T12:00:00`, lineId: 'LINE_TANAKA' },
            ]);

            const result = await service.getDashboardStats();

            // 結果: 3人全員がランキングに含まれる
            expect(result.ranking.length).toBe(3);
            expect(result.ranking.map((s: { name: string }) => s.name)).toContain('田中');
            expect(result.ranking.map((s: { name: string }) => s.name)).toContain('山田');
            expect(result.ranking.map((s: { name: string }) => s.name)).toContain('佐藤');
        });

        it('shows zero duration and zero visits for students without logs', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllStudents.mockResolvedValue({
                'LINE_TANAKA': { lineId: 'LINE_TANAKA', name: '田中', grade: '高2', status: '在塾' },
                'LINE_YAMADA': { lineId: 'LINE_YAMADA', name: '山田', grade: '高3', status: '在塾' },
            });

            // ログ: 田中のみ
            mockFindAllLogs.mockResolvedValue([
                { name: '田中', entryTime: `${TEST_DATE.BASE}T10:00:00`, exitTime: `${TEST_DATE.BASE}T12:00:00`, lineId: 'LINE_TANAKA' },
            ]);

            const result = await service.getDashboardStats();

            const yamada = result.ranking.find((s: { name: string }) => s.name === '山田');
            expect(yamada).toBeDefined();
            expect(yamada.totalDurationMinutes).toBe(0);
            expect(yamada.visitCount).toBe(0);
            expect(yamada.lastVisit).toBeNull();
        });

        it('applies grade filter to all students including zero-duration ones', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllStudents.mockResolvedValue({
                'LINE_TANAKA': { lineId: 'LINE_TANAKA', name: '田中', grade: '高3', status: '在塾' },
                'LINE_YAMADA': { lineId: 'LINE_YAMADA', name: '山田', grade: '高2', status: '在塾' },
                'LINE_SATO': { lineId: 'LINE_SATO', name: '佐藤', grade: '中3', status: '在塾' },
            });

            // ログ: なし
            mockFindAllLogs.mockResolvedValue([]);

            // グレードフィルタ: 'EXAM' (高3, 既卒)
            const result = await service.getDashboardStats(undefined, undefined, 'EXAM');

            // 結果: 田中のみ表示（学習時間0）
            expect(result.ranking.length).toBe(1);
            expect(result.ranking[0].name).toBe('田中');
            expect(result.ranking[0].totalDurationMinutes).toBe(0);
        });

        it('sorts students by duration with zero-duration students at the bottom', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllStudents.mockResolvedValue({
                'LINE_TANAKA': { lineId: 'LINE_TANAKA', name: '田中', grade: '高2', status: '在塾' },
                'LINE_YAMADA': { lineId: 'LINE_YAMADA', name: '山田', grade: '高3', status: '在塾' },
                'LINE_SATO': { lineId: 'LINE_SATO', name: '佐藤', grade: '中3', status: '在塾' },
            });

            // ログ: 田中(120min), 佐藤(60min)
            mockFindAllLogs.mockResolvedValue([
                { name: '田中', entryTime: `${TEST_DATE.BASE}T10:00:00`, exitTime: `${TEST_DATE.BASE}T12:00:00`, lineId: 'LINE_TANAKA' },
                { name: '佐藤', entryTime: `${TEST_DATE.BASE}T10:00:00`, exitTime: `${TEST_DATE.BASE}T11:00:00`, lineId: 'LINE_SATO' },
            ]);

            const result = await service.getDashboardStats();

            // 結果: [田中(120min), 佐藤(60min), 山田(0min)] の順
            expect(result.ranking[0].name).toBe('田中');
            expect(result.ranking[0].totalDurationMinutes).toBe(120);
            expect(result.ranking[1].name).toBe('佐藤');
            expect(result.ranking[1].totalDurationMinutes).toBe(60);
            expect(result.ranking[2].name).toBe('山田');
            expect(result.ranking[2].totalDurationMinutes).toBe(0);
        });

        it('sorts zero-duration students by grade (descending) then by name', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllStudents.mockResolvedValue({
                'LINE_TANAKA': { lineId: 'LINE_TANAKA', name: '田中', grade: '高2', status: '在塾' },
                'LINE_YAMADA': { lineId: 'LINE_YAMADA', name: '山田', grade: '高3', status: '在塾' },
                'LINE_SATO': { lineId: 'LINE_SATO', name: '佐藤', grade: '高2', status: '在塾' },
            });

            // ログ: なし（全員学習時間0）
            mockFindAllLogs.mockResolvedValue([]);

            const result = await service.getDashboardStats();

            // 結果: [山田(高3), 佐藤(高2), 田中(高2)] の順
            // （学年降順、同学年は名前昇順：佐藤 < 田中）
            expect(result.ranking[0].name).toBe('山田');
            expect(result.ranking[0].grade).toBe('高3');
            expect(result.ranking[1].name).toBe('佐藤');
            expect(result.ranking[1].grade).toBe('高2');
            expect(result.ranking[2].name).toBe('田中');
            expect(result.ranking[2].grade).toBe('高2');
        });

        it('excludes students with status other than 在塾', async () => {
            jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

            mockFindAllStudents.mockResolvedValue({
                'LINE_TANAKA': { lineId: 'LINE_TANAKA', name: '田中', grade: '高2', status: '在塾' },
                'LINE_YAMADA': { lineId: 'LINE_YAMADA', name: '山田', grade: '高3', status: '休塾' },
                'LINE_SATO': { lineId: 'LINE_SATO', name: '佐藤', grade: '中3', status: '退塾' },
                'LINE_ITO': { lineId: 'LINE_ITO', name: '伊藤', grade: '高1', status: '体験' },
            });

            // ログ: なし
            mockFindAllLogs.mockResolvedValue([]);

            const result = await service.getDashboardStats();

            // 結果: 田中のみ（在塾のみ）
            expect(result.ranking.length).toBe(1);
            expect(result.ranking[0].name).toBe('田中');
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
