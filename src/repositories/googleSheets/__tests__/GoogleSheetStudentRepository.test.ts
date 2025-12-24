
import { GoogleSheetStudentRepository } from '../GoogleSheetStudentRepository';
import { getGoogleSheets } from '@/lib/googleSheets';

// Mock dependencies
jest.mock('@/lib/googleSheets');
jest.mock('next/cache', () => ({
    unstable_cache: (fn: unknown) => fn, // Bypass cache for testing logic
}));

describe('GoogleSheetStudentRepository', () => {
    let repo: GoogleSheetStudentRepository;
    const mockSheets = {
        spreadsheets: {
            values: {
                get: jest.fn(),
            },
        },
    };

    beforeEach(() => {
        repo = new GoogleSheetStudentRepository();
        (getGoogleSheets as jest.Mock).mockResolvedValue(mockSheets);
        process.env.STUDENT_SPREADSHEET_ID = 'test-sheet-id';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should parse student data correctly', async () => {
        // Mock data
        mockSheets.spreadsheets.values.get.mockResolvedValue({
            data: {
                values: [
                    ['生徒LINEID', '名前', '学年', 'Status'], // Header
                    ['U123', 'Test Student', '高1', '在塾'],  // Row 1
                ],
            },
        });

        const students = await repo.findAll();

        expect(students['U123']).toBeDefined();
        expect(students['U123'].name).toBe('Test Student');
        expect(students['U123'].grade).toBe('高1');
    });

    it('should handle missing spreadsheet ID gracefully', async () => {
        delete process.env.STUDENT_SPREADSHEET_ID;
        const students = await repo.findAll();
        expect(students).toEqual({});
    });

    it('should find student by ID', async () => {
        mockSheets.spreadsheets.values.get.mockResolvedValue({
            data: {
                values: [
                    ['生徒LINEID', '名前', '学年', 'Status'],
                    ['U123', 'Test Student', '高1', '在塾'],
                ],
            },
        });

        const student = await repo.findById('U123');
        expect(student).not.toBeNull();
        expect(student?.name).toBe('Test Student');
    });

    it('should return null if student ID not found', async () => {
        mockSheets.spreadsheets.values.get.mockResolvedValue({
            data: {
                values: [
                    ['生徒LINEID', '名前', '学年', 'Status'],
                    ['U123', 'Test Student', '高1', '在塾'],
                ],
            },
        });

        const student = await repo.findById('U999');
        expect(student).toBeNull();
    });
});
