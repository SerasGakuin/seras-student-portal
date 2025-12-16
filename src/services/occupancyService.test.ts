import { occupancyService } from './occupancyService';
import { getGoogleSheets } from '@/lib/googleSheets';
import * as StudentService from '@/services/studentService';

// Mock dependencies
jest.mock('@/lib/googleSheets');
jest.mock('@/services/studentService');
jest.mock('next/cache', () => ({
    unstable_cache: (fn: <T>(...args: unknown[]) => T) => fn, // Mock cache to just execute function
    revalidateTag: jest.fn(),
}));

describe('occupancyService', () => {
    // Mock Data for Batch Get
    // Range 1: Status (Legacy Sheet C2:D2)
    const mockStatusRows = [
        ['1', '0'] // Building 1 = Open, Building 2 = Closed
    ];

    // Range 2: ACTIVE USERS VIEW (Entry/Exit Log Sheet A2:D)
    // Cols: [EntryTime, ExitTime (Always NULL), BuildingId, Name]
    // Note: We need dynamic dates to pass "Today" validation check.
    const today = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Tokyo" }); // Use simple raw format that works with Date constructor
    // Actually, Date constructor behavior depends on node env.
    // Let's assume the service expects "Tue Dec 16 2025..." format.
    // For test stability, we should mock the date or construct a matching string.

    // Construct a "Today" string that works with `new Date(str)` AND `isValidEntryForToday` logic.
    // service uses `new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })` for comparison.
    // so we just need a date string that evaluates to the same YYYY-MM-DD in JST.
    const nowJST = new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const todayDate = new Date(nowJST);
    const todayStr = todayDate.toString(); // "Tue Dec 17 2025 ..."

    // Yesterday string
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toString();

    const mockActiveUserRows = [
        // Active in Building 1 (TODAY) -> SHOULD BE INCLUDED
        [todayStr, '', '1', 'Student A'],
        // Active in Building 1 (TODAY) -> SHOULD BE INCLUDED
        [todayStr, '', '1', 'Student C'],
        // Active in Building 2 (TODAY) -> SHOULD BE INCLUDED
        [todayStr, '', '2', 'Student B'],
        // Stale Data (YESTERDAY) -> SHOULD BE FILTERED OUT
        [yesterdayStr, '', '1', 'Student Stale'],
    ];

    const mockSheetsClient = {
        spreadsheets: {
            values: {
                // Mock batchGet
                batchGet: jest.fn().mockResolvedValue({
                    data: {
                        valueRanges: [
                            { values: mockStatusRows },
                            { values: mockActiveUserRows }
                        ]
                    }
                }),
                update: jest.fn().mockResolvedValue({}),
                append: jest.fn().mockResolvedValue({})
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getGoogleSheets as jest.Mock).mockResolvedValue(mockSheetsClient);
    });

    describe('getOccupancyData', () => {
        it('should correctly parse spreadsheet data', async () => {
            const data = await occupancyService.getOccupancyData(null);

            // Counts should be derived from ACTIVE logs (Filtered by Today)
            // Building 1: Student A, Student C -> Count 2
            // "Student Stale" (Yesterday) should be excluded
            expect(data.building1.count).toBe(2);
            // Building 1 Status: '1' -> Open
            expect(data.building1.isOpen).toBe(true);

            // Building 2: Student B -> Count 1
            expect(data.building2.count).toBe(1);
            // Building 2 Status: '0' -> Closed
            expect(data.building2.isOpen).toBe(false);
        });

        it('should handle empty rows gracefully', async () => {
            const emptyClient = {
                spreadsheets: {
                    values: {
                        batchGet: jest.fn().mockResolvedValue({
                            data: { valueRanges: [{ values: [] }, { values: [] }] }
                        })
                    }
                }
            };
            (getGoogleSheets as jest.Mock).mockResolvedValue(emptyClient);

            const data = await occupancyService.getOccupancyData(null);
            expect(data.building1.count).toBe(0);
        });

        it('should show members for Teacher', async () => {
            // Mock student service to return "Teacher" status
            (StudentService.getStudentFromLineId as jest.Mock).mockResolvedValue({
                status: '在塾(講師)'
            });
            (StudentService.getStudentsByNames as jest.Mock).mockResolvedValue(new Map([
                ['Student A', { grade: '中1' }],
                ['Student C', { grade: '高3' }],
                ['Student B', { grade: '中2' }]
            ]));

            const data = await occupancyService.getOccupancyData('teacher-line-id');

            // Check members population
            expect(data.building1.members).toHaveLength(2); // Student A, Student C
            expect(data.building1.members[0].name).toBe('Student A');
            // Check formatted entry time (just checking checking it exists)
            expect(data.building1.members[0].entryTime).toBeDefined();

            expect(data.building2.members).toHaveLength(1); // Student B
        });

        it('should show members for Students (在塾)', async () => {
            // UPDATED: Students with '在塾' should now see members
            (StudentService.getStudentFromLineId as jest.Mock).mockResolvedValue({
                status: '在塾'
            });
            (StudentService.getStudentsByNames as jest.Mock).mockResolvedValue(new Map([
                ['Student A', { grade: '中1' }]
            ]));

            const data = await occupancyService.getOccupancyData('student-line-id');

            // Should be visible
            expect(data.building1.members.length).toBeGreaterThan(0);
        });

        it('should NOT show members for Guests/Others', async () => {
            (StudentService.getStudentFromLineId as jest.Mock).mockResolvedValue({
                status: '入塾検討中'
            });

            const data = await occupancyService.getOccupancyData('guest-line-id');

            expect(data.building1.members).toHaveLength(0);
        });
    });

    describe('updateBuildingStatus', () => {
        it('should call update and append logs', async () => {
            await occupancyService.updateBuildingStatus({
                building: '1',
                isOpen: false,
                actorName: 'Test User'
            });

            // Verify Update
            expect(mockSheetsClient.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
                range: expect.stringContaining('!C2'),
                requestBody: { values: [[0]] } // Closed -> 0
            }));

            // Verify Append
            expect(mockSheetsClient.spreadsheets.values.append).toHaveBeenCalledWith(expect.objectContaining({
                range: expect.stringContaining('open_logs!A:E'),
                requestBody: expect.objectContaining({
                    values: expect.arrayContaining([
                        expect.arrayContaining(['Test User', 'CLOSE', '本館'])
                    ])
                })
            }));
        });
    });
});
