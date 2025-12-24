
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
