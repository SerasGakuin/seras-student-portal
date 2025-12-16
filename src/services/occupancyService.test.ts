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

    // Range 2: Logs (Entry/Exit Log Sheet A2:D)
    // Cols: [EntryTime, ExitTime, BuildingId, Name]
    const mockLogRows = [
        // Active in Building 1
        ['Tue Dec 16 14:00:00 2025', '', '1', 'Student A'],
        // Active in Building 1
        ['Tue Dec 16 14:05:00 2025', '', '1', 'Student C'],
        // Active in Building 2
        ['Tue Dec 16 14:10:00 2025', '', '2', 'Student B'],
        // Exited (Inactive)
        ['Tue Dec 16 09:00:00 2025', 'Tue Dec 16 12:00:00 2025', '1', 'Student D'],
    ];

    const mockSheetsClient = {
        spreadsheets: {
            values: {
                // Mock batchGet instead of get
                batchGet: jest.fn().mockResolvedValue({
                    data: {
                        valueRanges: [
                            { values: mockStatusRows },
                            { values: mockLogRows }
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

            // Counts should be derived from ACTIVE logs
            // Building 1: Student A, Student C -> Count 2
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
