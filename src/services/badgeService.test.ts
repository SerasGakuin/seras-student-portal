
import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
// import { Badge } from './badgeService'; // If exported. Let me just use any for shorter fix or define inline interface if feasible.
// Actually Badge is exported.
import { Badge } from '@/services/badgeService';

// Mock dependencies
jest.mock('@/repositories/googleSheets/GoogleSheetOccupancyRepository');
jest.mock('@/repositories/googleSheets/GoogleSheetStudentRepository');

describe('BadgeService', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let service: any; // BadgeService instance
    let mockFindAllLogs: jest.Mock;
    let mockFindAllStudents: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFindAllLogs = jest.fn().mockResolvedValue([]);
        mockFindAllStudents = jest.fn().mockResolvedValue({});

        (GoogleSheetOccupancyRepository as jest.Mock).mockImplementation(() => ({
            findAllLogs: mockFindAllLogs
        }));
        (GoogleSheetStudentRepository as jest.Mock).mockImplementation(() => ({
            findAll: mockFindAllStudents
        }));

        // Re-load module
        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { BadgeService } = require('./badgeService');
            service = new BadgeService();
        });
    });

    it('should separate students into Exam and General groups', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S_Exam1', grade: '高3', status: '在塾' },
            2: { name: 'S_Gen1', grade: '中2', status: '在塾' },
            3: { name: 'S_Inactive', grade: '高3', status: '退塾' }, // Should be ignored
        });

        // Mock some logs (2024-12-25 is within last week: Dec 23-29)
        mockFindAllLogs.mockResolvedValue([
            { name: 'S_Exam1', entryTime: '2024-12-25T10:00:00', exitTime: '2024-12-25T12:00:00' },
            { name: 'S_Gen1', entryTime: '2024-12-25T10:00:00', exitTime: '2024-12-25T11:00:00' },
        ]);

        // targetDate: 2025-01-02 (Thu) → Last week: Dec 23-29
        const targetDate = new Date('2025-01-02T12:00:00');
        const result = await service.getWeeklyBadges(targetDate);

        expect(result.totalExamStudents).toBe(1);
        expect(result.totalGeneralStudents).toBe(1);
        expect(result.exam['S_Exam1']).toBeDefined();
        expect(result.general['S_Gen1']).toBeDefined();
        expect(result.exam['S_Inactive']).toBeUndefined();
    });

    it('should calculate HEAVY_USER badge correctly', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '高3', status: '在塾' },
            2: { name: 'S2', grade: '高3', status: '在塾' },
        });

        // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
        const baseDate = '2024-12-25';
        // S1: 5 hours, S2: 2 hours
        mockFindAllLogs.mockResolvedValue([
            { name: 'S1', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
            { name: 'S2', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T12:00:00` },
        ]);

        const targetDate = new Date('2025-01-02T10:00:00');
        const result = await service.getWeeklyBadges(targetDate);

        const s1Badges = result.exam['S1'];
        const s2Badges = result.exam['S2'];

        expect(s1Badges).toContainEqual(expect.objectContaining({ type: 'HEAVY_USER', rank: 1 }));
        expect(s2Badges).toContainEqual(expect.objectContaining({ type: 'HEAVY_USER', rank: 2 }));
    });

    it('should assign EARLY_BIRD only if morning duration > 30 mins', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '中1', status: '在塾' },
        });

        // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
        const baseDate = '2024-12-25';

        // Case 1: 8:00 - 8:20 (20 mins) -> No Badge
        mockFindAllLogs.mockResolvedValueOnce([
            { name: 'S1', entryTime: `${baseDate}T08:00:00`, exitTime: `${baseDate}T08:20:00` }
        ]);
        let result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        expect(result.general['S1']?.some((b: Badge) => b.type === 'EARLY_BIRD')).toBe(false);

        // Case 2: 8:00 - 8:40 (40 mins) -> Badge
        mockFindAllLogs.mockResolvedValueOnce([
            { name: 'S1', entryTime: `${baseDate}T08:00:00`, exitTime: `${baseDate}T08:40:00` }
        ]);
        result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        expect(result.general['S1']).toContainEqual(expect.objectContaining({ type: 'EARLY_BIRD' }));
    });

    it('should NOT count midnight hours (00:00 - 03:59) as EARLY_BIRD', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '中1', status: '在塾' },
        });

        // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
        const baseDate = '2024-12-25';

        // Case: 01:00 - 04:00 (3 hours = 180 mins)
        // Before fix: Counted as Early Bird (> 30 mins)
        // After fix: Start < 04:00 is ignored? Or start before 4, end after 4 logic needs check?
        // Logic says: if (entry < morningCutoff && entry >= morningStart).
        // morningStart is 4:00 AM.
        // entry 01:00 < 04:00 -> False. Should be ignored completely.

        mockFindAllLogs.mockResolvedValueOnce([
            { name: 'S1', entryTime: `${baseDate}T01:00:00`, exitTime: `${baseDate}T04:00:00` }
        ]);

        const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        // Should NOT have Early Bird badge despite 3 hours duration
        expect(result.general['S1']?.some((b: Badge) => b.type === 'EARLY_BIRD')).toBe(false);
    });

    it('should count hours after 04:00 for EARLY_BIRD even if entry is before 04:00', async () => {
        // Entry at 03:50, exit at 08:00 -> should count 4:00-8:00 = 4 hours (240 mins)
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '中1', status: '在塾' },
        });

        // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
        const baseDate = '2024-12-25';
        mockFindAllLogs.mockResolvedValue([
            { name: 'S1', entryTime: `${baseDate}T03:50:00`, exitTime: `${baseDate}T08:00:00` }
        ]);

        const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        const s1Badges = result.general['S1'];

        // Should have EARLY_BIRD badge with 240 minutes (displayed as '240m')
        expect(s1Badges).toContainEqual(expect.objectContaining({ type: 'EARLY_BIRD' }));
        const earlyBirdBadge = s1Badges.find((b: Badge) => b.type === 'EARLY_BIRD');
        expect(earlyBirdBadge?.value).toBe('240m');
    });

    it('should merge overlapping logs for EARLY_BIRD calculation', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '中1', status: '在塾' },
        });

        // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
        const baseDate = '2024-12-25';
        // Two overlapping morning sessions: 05:00-07:00 and 06:00-08:30
        // Merged: 05:00-08:30 = 3.5 hours = 210 mins
        mockFindAllLogs.mockResolvedValue([
            { name: 'S1', entryTime: `${baseDate}T05:00:00`, exitTime: `${baseDate}T07:00:00` },
            { name: 'S1', entryTime: `${baseDate}T06:00:00`, exitTime: `${baseDate}T08:30:00` }
        ]);

        const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        const s1Badges = result.general['S1'];

        const earlyBirdBadge = s1Badges.find((b: Badge) => b.type === 'EARLY_BIRD');
        // Should be 210 mins (merged), NOT 270 mins (naive sum)
        expect(earlyBirdBadge?.value).toBe('210m');
    });

    it('should merge overlapping logs for NIGHT_OWL calculation', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '中1', status: '在塾' },
        });

        // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
        const baseDate = '2024-12-25';
        // Two overlapping night sessions: 19:00-22:00 and 20:30-23:30
        // Night portion (after 20:00): 20:00-22:00 and 20:30-23:30 -> Merged: 20:00-23:30 = 3.5 hours = 210 mins
        // Naive would be: (22:00-20:00=120) + (23:30-20:30=180) = 300 mins = 5h
        mockFindAllLogs.mockResolvedValue([
            { name: 'S1', entryTime: `${baseDate}T19:00:00`, exitTime: `${baseDate}T22:00:00` },
            { name: 'S1', entryTime: `${baseDate}T20:30:00`, exitTime: `${baseDate}T23:30:00` }
        ]);

        const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        const s1Badges = result.general['S1'];

        const nightOwlBadge = s1Badges.find((b: Badge) => b.type === 'NIGHT_OWL');
        // Should be 210 mins (3h), NOT 300 mins (5h)
        expect(nightOwlBadge?.value).toBe('3h');
    });

    it('should assign RISING_STAR based on growth vs previous week', async () => {
        mockFindAllStudents.mockResolvedValue({
            1: { name: 'S1', grade: '高3', status: '在塾' },
        });

        // With fixed week approach:
        // targetDate = 2025-01-02 (Thu) → Last week: Dec 23-29, Week before last: Dec 16-22
        // "Last week" in fixed terms = Dec 23-29 (badges calculated for this)
        // "Week before last" in fixed terms = Dec 16-22 (RISING_STAR compares against this)
        const lastWeek = '2024-12-25';        // Within Dec 23-29
        const weekBeforeLast = '2024-12-18';  // Within Dec 16-22

        // Week before last: 1 hour. Last week: 4 hours. Growth: 3 hours (> 2h threshold)
        mockFindAllLogs.mockResolvedValue([
            { name: 'S1', entryTime: `${weekBeforeLast}T10:00:00`, exitTime: `${weekBeforeLast}T11:00:00` },
            { name: 'S1', entryTime: `${lastWeek}T10:00:00`, exitTime: `${lastWeek}T14:00:00` },
        ]);

        const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(result.exam['S1']).toContainEqual(expect.objectContaining({ type: 'RISING_STAR', value: '+3h' } as any));
    });

    describe('Tie handling (Olympic-style ranking)', () => {
        it('should assign same rank to students with same study time for HEAVY_USER', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
                2: { name: 'S2', grade: '高3', status: '在塾' },
                3: { name: 'S3', grade: '高3', status: '在塾' },
            });

            // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
            const baseDate = '2024-12-25';
            // S1, S2: 5 hours each (tied), S3: 3 hours
            mockFindAllLogs.mockResolvedValue([
                { name: 'S1', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S2', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S3', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T13:00:00` },
            ]);

            const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));

            const s1Badge = result.exam['S1']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const s2Badge = result.exam['S2']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const s3Badge = result.exam['S3']?.find((b: Badge) => b.type === 'HEAVY_USER');

            // S1 and S2 should both be rank 1 (tied)
            expect(s1Badge?.rank).toBe(1);
            expect(s2Badge?.rank).toBe(1);
            // S3 should be rank 3 (Olympic-style: 1, 1, 3)
            expect(s3Badge?.rank).toBe(3);
        });

        it('should assign same rank to students with same visit days for CONSISTENT', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '中1', status: '在塾' },
                2: { name: 'S2', grade: '中1', status: '在塾' },
                3: { name: 'S3', grade: '中1', status: '在塾' },
            });

            // targetDate = 2025-01-02 → Last week: Dec 23-29
            // S1 and S2 have 5 visit days, S3 has 3 visit days (all within Dec 23-29)
            mockFindAllLogs.mockResolvedValue([
                // S1: 5 different days (Dec 23-27)
                { name: 'S1', entryTime: '2024-12-23T10:00:00', exitTime: '2024-12-23T11:00:00' },
                { name: 'S1', entryTime: '2024-12-24T10:00:00', exitTime: '2024-12-24T11:00:00' },
                { name: 'S1', entryTime: '2024-12-25T10:00:00', exitTime: '2024-12-25T11:00:00' },
                { name: 'S1', entryTime: '2024-12-26T10:00:00', exitTime: '2024-12-26T11:00:00' },
                { name: 'S1', entryTime: '2024-12-27T10:00:00', exitTime: '2024-12-27T11:00:00' },
                // S2: 5 different days (Dec 23-27)
                { name: 'S2', entryTime: '2024-12-23T10:00:00', exitTime: '2024-12-23T11:00:00' },
                { name: 'S2', entryTime: '2024-12-24T10:00:00', exitTime: '2024-12-24T11:00:00' },
                { name: 'S2', entryTime: '2024-12-25T10:00:00', exitTime: '2024-12-25T11:00:00' },
                { name: 'S2', entryTime: '2024-12-26T10:00:00', exitTime: '2024-12-26T11:00:00' },
                { name: 'S2', entryTime: '2024-12-27T10:00:00', exitTime: '2024-12-27T11:00:00' },
                // S3: 3 different days (Dec 23-25)
                { name: 'S3', entryTime: '2024-12-23T10:00:00', exitTime: '2024-12-23T11:00:00' },
                { name: 'S3', entryTime: '2024-12-24T10:00:00', exitTime: '2024-12-24T11:00:00' },
                { name: 'S3', entryTime: '2024-12-25T10:00:00', exitTime: '2024-12-25T11:00:00' },
            ]);

            const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));

            const s1Badge = result.general['S1']?.find((b: Badge) => b.type === 'CONSISTENT');
            const s2Badge = result.general['S2']?.find((b: Badge) => b.type === 'CONSISTENT');
            const s3Badge = result.general['S3']?.find((b: Badge) => b.type === 'CONSISTENT');

            // S1 and S2 should both be rank 1 (tied)
            expect(s1Badge?.rank).toBe(1);
            expect(s2Badge?.rank).toBe(1);
            // S3 should be rank 3 (Olympic-style: 1, 1, 3)
            expect(s3Badge?.rank).toBe(3);
        });

        it('should award badges to all 5 students when they are all tied at rank 1', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
                2: { name: 'S2', grade: '高3', status: '在塾' },
                3: { name: 'S3', grade: '高3', status: '在塾' },
                4: { name: 'S4', grade: '高3', status: '在塾' },
                5: { name: 'S5', grade: '高3', status: '在塾' },
            });

            // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
            const baseDate = '2024-12-25';
            // All 5 students have exactly 5 hours
            mockFindAllLogs.mockResolvedValue([
                { name: 'S1', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S2', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S3', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S4', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S5', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
            ]);

            const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));

            // All 5 students should have HEAVY_USER badge with rank 1
            const badges = ['S1', 'S2', 'S3', 'S4', 'S5'].map(name =>
                result.exam[name]?.find((b: Badge) => b.type === 'HEAVY_USER')
            );

            badges.forEach(badge => {
                expect(badge).toBeDefined();
                expect(badge?.rank).toBe(1);
            });
        });

        it('should skip rank when there are ties (1, 1, 3 not 1, 1, 2)', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
                2: { name: 'S2', grade: '高3', status: '在塾' },
                3: { name: 'S3', grade: '高3', status: '在塾' },
                4: { name: 'S4', grade: '高3', status: '在塾' },
            });

            // baseDate within last week (Dec 23-29) when targetDate is 2025-01-02
            const baseDate = '2024-12-25';
            // S1, S2: 5 hours (rank 1), S3, S4: 3 hours (rank 3)
            mockFindAllLogs.mockResolvedValue([
                { name: 'S1', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S2', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T15:00:00` },
                { name: 'S3', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T13:00:00` },
                { name: 'S4', entryTime: `${baseDate}T10:00:00`, exitTime: `${baseDate}T13:00:00` },
            ]);

            const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));

            const s1Badge = result.exam['S1']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const s2Badge = result.exam['S2']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const s3Badge = result.exam['S3']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const s4Badge = result.exam['S4']?.find((b: Badge) => b.type === 'HEAVY_USER');

            expect(s1Badge?.rank).toBe(1);
            expect(s2Badge?.rank).toBe(1);
            // Both S3 and S4 should be rank 3 (not rank 2)
            expect(s3Badge?.rank).toBe(3);
            expect(s4Badge?.rank).toBe(3);
        });
    });

    describe('Fixed Week Period (Monday-Sunday)', () => {
        /**
         * 固定週間方式のテスト
         * - 週の境界: 月曜00:00 〜 日曜23:59
         * - 先週のデータを計算対象とする
         * - 今週のデータは対象外
         */

        it('should calculate badges for last week (Mon-Sun) when called on Monday', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
            });

            // targetDate: 2026-01-19 (月) → 先週は 2026-01-12(月) 〜 2026-01-18(日)
            // 先週のログのみがカウントされる
            mockFindAllLogs.mockResolvedValue([
                // 先週のログ（カウント対象）
                { name: 'S1', entryTime: '2026-01-15T10:00:00+09:00', exitTime: '2026-01-15T15:00:00+09:00' }, // 5時間
                // 今週のログ（対象外）
                { name: 'S1', entryTime: '2026-01-19T10:00:00+09:00', exitTime: '2026-01-19T15:00:00+09:00' },
            ]);

            const targetDate = new Date('2026-01-19T01:00:00.000Z'); // 2026-01-19 10:00 JST (月曜)
            const result = await service.getWeeklyBadges(targetDate);

            const s1Badges = result.exam['S1'];
            const heavyUserBadge = s1Badges?.find((b: Badge) => b.type === 'HEAVY_USER');

            // 先週のログ（5時間）のみがカウントされる
            expect(heavyUserBadge).toBeDefined();
            expect(heavyUserBadge?.value).toBe('5h');
        });

        it('should return same last week data regardless of day within current week', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
            });

            // 先週のログのみ
            mockFindAllLogs.mockResolvedValue([
                { name: 'S1', entryTime: '2026-01-15T10:00:00+09:00', exitTime: '2026-01-15T15:00:00+09:00' },
            ]);

            // 今週の月曜・水曜・日曜から呼び出しても、同じ「先週」のデータを返す
            const monday = new Date('2026-01-19T01:00:00.000Z'); // 月曜 10:00 JST
            const wednesday = new Date('2026-01-21T06:00:00.000Z'); // 水曜 15:00 JST
            const sunday = new Date('2026-01-25T03:00:00.000Z'); // 日曜 12:00 JST

            const resultMon = await service.getWeeklyBadges(monday);
            const resultWed = await service.getWeeklyBadges(wednesday);
            const resultSun = await service.getWeeklyBadges(sunday);

            // 全て同じ結果を返す
            const mondayBadge = resultMon.exam['S1']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const wednesdayBadge = resultWed.exam['S1']?.find((b: Badge) => b.type === 'HEAVY_USER');
            const sundayBadge = resultSun.exam['S1']?.find((b: Badge) => b.type === 'HEAVY_USER');

            expect(mondayBadge?.value).toBe('5h');
            expect(wednesdayBadge?.value).toBe('5h');
            expect(sundayBadge?.value).toBe('5h');
        });

        it('should NOT include current week logs in badge calculation', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
            });

            // 今週のログのみ（先週のログなし）
            mockFindAllLogs.mockResolvedValue([
                { name: 'S1', entryTime: '2026-01-19T10:00:00+09:00', exitTime: '2026-01-19T20:00:00+09:00' }, // 10時間（今週）
            ]);

            const targetDate = new Date('2026-01-21T06:00:00.000Z'); // 水曜 15:00 JST
            const result = await service.getWeeklyBadges(targetDate);

            // 先週のログがないので、HEAVY_USERバッジはない（または0時間）
            const s1Badges = result.exam['S1'];
            const heavyUserBadge = s1Badges?.find((b: Badge) => b.type === 'HEAVY_USER');
            expect(heavyUserBadge).toBeUndefined();
        });

        it('should include period information in response', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
            });
            mockFindAllLogs.mockResolvedValue([]);

            const targetDate = new Date('2026-01-19T01:00:00.000Z'); // 2026-01-19 10:00 JST (月曜)
            const result = await service.getWeeklyBadges(targetDate);

            // period情報が含まれている
            expect(result.period).toBeDefined();
            expect(result.period?.label).toMatch(/1\/12.*1\/18/); // "1/12(月) - 1/18(日)" のような形式
            expect(result.period?.start).toBeDefined();
            expect(result.period?.end).toBeDefined();
        });

        it('should compare last week vs week before last for RISING_STAR', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
            });

            // targetDate: 2026-01-19 (月)
            // 先週: 2026-01-12(月) 〜 2026-01-18(日)
            // 先々週: 2026-01-05(月) 〜 2026-01-11(日)
            mockFindAllLogs.mockResolvedValue([
                // 先々週のログ（1時間）
                { name: 'S1', entryTime: '2026-01-07T10:00:00+09:00', exitTime: '2026-01-07T11:00:00+09:00' },
                // 先週のログ（5時間）
                { name: 'S1', entryTime: '2026-01-15T10:00:00+09:00', exitTime: '2026-01-15T15:00:00+09:00' },
            ]);

            const targetDate = new Date('2026-01-19T01:00:00.000Z'); // 月曜 10:00 JST
            const result = await service.getWeeklyBadges(targetDate);

            const s1Badges = result.exam['S1'];
            const risingStarBadge = s1Badges?.find((b: Badge) => b.type === 'RISING_STAR');

            // 成長: 5h - 1h = +4h
            expect(risingStarBadge).toBeDefined();
            expect(risingStarBadge?.value).toBe('+4h');
        });

        it('should handle year boundary correctly (last week spans year end)', async () => {
            mockFindAllStudents.mockResolvedValue({
                1: { name: 'S1', grade: '高3', status: '在塾' },
            });

            // targetDate: 2026-01-05 (月)
            // 先週: 2025-12-29(月) 〜 2026-01-04(日) ← 年をまたぐ
            mockFindAllLogs.mockResolvedValue([
                // 2025年末のログ
                { name: 'S1', entryTime: '2025-12-30T10:00:00+09:00', exitTime: '2025-12-30T13:00:00+09:00' }, // 3時間
                // 2026年初のログ
                { name: 'S1', entryTime: '2026-01-02T10:00:00+09:00', exitTime: '2026-01-02T12:00:00+09:00' }, // 2時間
            ]);

            const targetDate = new Date('2026-01-05T01:00:00.000Z'); // 2026-01-05 10:00 JST (月曜)
            const result = await service.getWeeklyBadges(targetDate);

            const s1Badges = result.exam['S1'];
            const heavyUserBadge = s1Badges?.find((b: Badge) => b.type === 'HEAVY_USER');

            // 年をまたいだ先週のログ（3h + 2h = 5h）がカウントされる
            expect(heavyUserBadge).toBeDefined();
            expect(heavyUserBadge?.value).toBe('5h');

            // period情報も年をまたいでいることを確認
            expect(result.period?.label).toMatch(/12\/29.*1\/4/);
        });
    });
});
