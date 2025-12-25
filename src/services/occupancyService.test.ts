
import { occupancyService } from './occupancyService';
import { getGoogleSheets } from '@/lib/googleSheets';
import { getStudentFromLineId, getStudentsByNames } from '@/services/studentService';

// Mock Dependencies
jest.mock('@/lib/googleSheets');
jest.mock('@/lib/config', () => ({
    CONFIG: {
        SPREADSHEET: {
            OCCUPANCY: {
                ID: 'mock_sheet_id',
                SHEETS: { OCCUPANCY: 'Occupancy', OPEN_LOGS: 'Logs' }
            }
        }
    }
}));

// Mock next/cache
jest.mock('next/cache', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unstable_cache: (fn: any) => fn, // Bypass cache
    revalidateTag: jest.fn()
}));

// Mock studentService methods
jest.mock('@/services/studentService', () => ({
    getStudentFromLineId: jest.fn(),
    getStudentsByNames: jest.fn()
}));

describe('OccupancyService', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSheets: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Google Sheets Mock
        mockSheets = {
            spreadsheets: {
                values: {
                    batchGet: jest.fn(),
                    update: jest.fn(),
                    append: jest.fn()
                }
            }
        };
        (getGoogleSheets as jest.Mock).mockResolvedValue(mockSheets);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockResponse = (statusRow: any[], activeUsers: any[]) => {
        mockSheets.spreadsheets.values.batchGet.mockResolvedValue({
            data: {
                valueRanges: [
                    { values: [statusRow] }, // Status: [B1, B2]
                    { values: activeUsers }  // Active Users: [Entry, Exit(null), Building, Name]
                ]
            }
        });
    };

    describe('getOccupancyData', () => {
        it('should correctly parse open status', async () => {
            // Building 1 (1=Open), Building 2 (0=Close)
            mockResponse(['1', '0'], []);

            const result = await occupancyService.getOccupancyData();

            expect(result.building1.isOpen).toBe(true);
            expect(result.building2.isOpen).toBe(false);
        });

        it('should count active users for today only', async () => {
            // Mock Today as JST
            const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
            const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

            // 1: Today, B1, Valid
            // 2: Yesterday, B1, Invalid (stale)
            // 3: Today, B2, Valid
            const users = [
                [`${today} 10:00:00`, null, '1', 'Student A'],
                [`${yesterday} 10:00:00`, null, '1', 'Student B'],
                [`${today} 11:00:00`, null, '2', 'Student C'],
            ];
            mockResponse(['1', '1'], users);

            const result = await occupancyService.getOccupancyData();

            expect(result.building1.count).toBe(1); // Only Student A
            expect(result.building2.count).toBe(1); // Only Student C
        });

        it('should hide member details for Guest', async () => {
            const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
            mockResponse(['1', '1'], [[`${today} 10:00:00`, null, '1', 'Student A']]);

            const result = await occupancyService.getOccupancyData(); // No user ID

            expect(result.building1.count).toBe(1);
            expect(result.building1.members).toEqual([]); // Details hidden
        });

        it('should show member details for Authorized User', async () => {
            const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
            mockResponse(['1', '1'], [[`${today} 10:00:00`, null, '1', 'Student A']]);

            // Mock Teacher Auth
            (getStudentFromLineId as jest.Mock).mockResolvedValue({
                status: '在塾(講師)'
            });
            (getStudentsByNames as jest.Mock).mockResolvedValue(
                new Map([['Student A', { grade: '高3' }]])
            );

            const result = await occupancyService.getOccupancyData('teacher_line_id');

            expect(result.building1.members).toHaveLength(1);
            expect(result.building1.members[0]).toEqual({
                name: 'Student A',
                grade: '高3',
                entryTime: expect.any(String)
            });
        });
    });

    describe('updateBuildingStatus', () => {
        it('should update sheet and append log', async () => {
            await occupancyService.updateBuildingStatus({
                building: '1',
                isOpen: false,
                actorName: 'Principal'
            });

            // Verify Update
            expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
                range: 'Occupancy!C2',
                requestBody: { values: [[0]] } // 0 = Close
            }));

            // Verify Log Append
            expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(expect.objectContaining({
                range: 'Logs!A:E',
                requestBody: {
                    values: expect.arrayContaining([
                        expect.arrayContaining(['Principal', 'CLOSE', '本館'])
                    ])
                }
            }));
        });
    });
});
