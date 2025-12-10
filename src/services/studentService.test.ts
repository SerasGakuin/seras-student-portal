import { getStudentFromLineId } from './studentService';
import { getGoogleSheets } from '@/lib/googleSheets';

// Mock the dependency
jest.mock('@/lib/googleSheets', () => ({
    getGoogleSheets: jest.fn(),
}));

describe('studentService', () => {
    const mockSheetsClient = {
        spreadsheets: {
            values: {
                get: jest.fn(),
            },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getGoogleSheets as jest.Mock).mockResolvedValue(mockSheetsClient);

        // Mock default environment variable
        process.env.STUDENT_SPREADSHEET_ID = 'test-spreadsheet-id';
    });

    // Helper to mock good response
    const mockSheetRows = (rows: string[][]) => {
        mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
            data: { values: rows },
        });
    };

    it('should return a student when LINE ID matches', async () => {
        mockSheetRows([
            ['名前', '生徒LINEID', '学年', 'Status'],
            ['山田 太郎', 'line-123', '高1', '在塾'],
            ['佐藤 花子', 'line-456', '中3', '体験'],
        ]);

        const result = await getStudentFromLineId('line-123');

        expect(result).toEqual({
            lineId: 'line-123',
            name: '山田 太郎',
            grade: '高1',
            status: '在塾',
        });
    });

    it('should handle dynamic column order', async () => {
        // Swapped columns
        mockSheetRows([
            ['Status', '名前', '学年', '生徒LINEID'],
            ['在塾', '武田 信玄', '既卒', 'line-789'],
        ]);

        const result = await getStudentFromLineId('line-789');

        expect(result).toEqual({
            lineId: 'line-789',
            name: '武田 信玄',
            grade: '既卒',
            status: '在塾',
        });
    });

    it('should return null if student not found', async () => {
        mockSheetRows([
            ['名前', '生徒LINEID', '学年', 'Status'],
            ['山田 太郎', 'line-123', '高1', '在塾'],
        ]);

        const result = await getStudentFromLineId('line-999');
        expect(result).toBeNull();
    });

    it('should return null if required columns are missing', async () => {
        // Missing 'Status'
        mockSheetRows([
            ['名前', '生徒LINEID', '学年'],
            ['山田 太郎', 'line-123', '高1'],
        ]);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const result = await getStudentFromLineId('line-123');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Missing required columns'));
        consoleSpy.mockRestore();
    });

    it('should return null if data validation fails (invalid enum)', async () => {
        mockSheetRows([
            ['名前', '生徒LINEID', '学年', 'Status'],
            ['変な 人', 'line-bad', '小5', '謎'], // Invalid grade/status
        ]);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const result = await getStudentFromLineId('line-bad');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Student data validation failed:', expect.anything());
        consoleSpy.mockRestore();
    });
});
