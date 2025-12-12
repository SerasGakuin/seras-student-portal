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
    // Mock data
    const mockValues = [
        ['10', '5', '1', '0'], // Row 2: Counts and Status (1=Open, 0=Closed)
        ['Student A', 'Student B'], // Row 3: Names
        ['Student C', ''],          // Row 4: Names
    ];

    const mockSheetsClient = {
        spreadsheets: {
            values: {
                get: jest.fn().mockResolvedValue({
                    data: { values: mockValues }
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

            expect(data.building1.count).toBe(10);
            expect(data.building1.isOpen).toBe(true);
            expect(data.building2.count).toBe(5);
            expect(data.building2.isOpen).toBe(false); // 0 -> false
        });

        it('should handle empty rows gracefully', async () => {
            (getGoogleSheets as jest.Mock).mockResolvedValue({
                spreadsheets: {
                    values: {
                        get: jest.fn().mockResolvedValue({ data: { values: [] } })
                    }
                }
            });

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
                ['Student C', { grade: '高3' }]
            ]));

            const data = await occupancyService.getOccupancyData('teacher-line-id');

            // Check members population
            expect(data.building1.members).toHaveLength(2); // Student A, Student C
            expect(data.building1.members[0].name).toBe('Student A');
            expect(data.building2.members).toHaveLength(1); // Student B
        });

        it('should NOT show members for Students (Guest)', async () => {
            // Mock student service to return "Student" status
            (StudentService.getStudentFromLineId as jest.Mock).mockResolvedValue({
                status: '在塾'
            });

            const data = await occupancyService.getOccupancyData('student-line-id');

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
