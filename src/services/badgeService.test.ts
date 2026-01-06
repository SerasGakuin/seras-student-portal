
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

        // Mock some logs
        mockFindAllLogs.mockResolvedValue([
            { name: 'S_Exam1', entryTime: '2025-01-01T10:00:00', exitTime: '2025-01-01T12:00:00' },
            { name: 'S_Gen1', entryTime: '2025-01-01T10:00:00', exitTime: '2025-01-01T11:00:00' },
        ]);

        const targetDate = new Date('2025-01-02T12:00:00'); // Calculation for week ending Jan 1
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

        const baseDate = '2025-01-01'; // End date of period
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

        const baseDate = '2025-01-01';

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

        const baseDate = '2025-01-01';

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

        const baseDate = '2025-01-01';
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

        const baseDate = '2025-01-01';
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

        const baseDate = '2025-01-01';
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

        const thisWeek = '2025-01-01';
        const lastWeek = '2024-12-25';

        // Prev Week: 1 hour. This Week: 4 hours. Growth: 3 hours (> 2h threshold)
        mockFindAllLogs.mockResolvedValue([
            { name: 'S1', entryTime: `${lastWeek}T10:00:00`, exitTime: `${lastWeek}T11:00:00` },
            { name: 'S1', entryTime: `${thisWeek}T10:00:00`, exitTime: `${thisWeek}T14:00:00` },
        ]);

        const result = await service.getWeeklyBadges(new Date('2025-01-02T10:00:00'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(result.exam['S1']).toContainEqual(expect.objectContaining({ type: 'RISING_STAR', value: '+3h' } as any));
    });
});
