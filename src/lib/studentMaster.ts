import { Student } from '@/types';
import { getGoogleSheets } from './googleSheets';

const SPREADSHEET_ID = process.env.STUDENT_SPREADSHEET_ID;

export const getStudentFromLineId = async (lineId: string): Promise<Student | null> => {
    if (!SPREADSHEET_ID) {
        throw new Error('STUDENT_SPREADSHEET_ID is not defined');
    }

    const sheets = await getGoogleSheets();

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:Z',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return null;
        }

        const headers = rows[0];

        // Dynamic column mapping
        const colMap = new Map<string, number>();
        headers.forEach((header, index) => {
            colMap.set(header, index);
        });

        // Required columns
        const COLS = {
            LINE_ID: '生徒LINEID',
            NAME: '名前',
            GRADE: '学年',
            STATUS: 'Status',
        };

        // Validate existence of required columns
        const missingCols = Object.values(COLS).filter(col => !colMap.has(col));
        if (missingCols.length > 0) {
            console.error(`Missing required columns: ${missingCols.join(', ')}`);
            return null;
        }

        const idxLineId = colMap.get(COLS.LINE_ID)!;
        const idxName = colMap.get(COLS.NAME)!;
        const idxGrade = colMap.get(COLS.GRADE)!;
        const idxStatus = colMap.get(COLS.STATUS)!;

        // Search for the student
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const currentLineId = row[idxLineId];

            if (currentLineId === lineId) {
                // Ensure row has enough columns (google sheets might truncate empty trailing cells)
                // Accessing index outside array returns undefined, so we handle that safely.
                const name = row[idxName] || '';
                const grade = row[idxGrade] as Student['grade'];
                const status = row[idxStatus] as Student['status'];

                return {
                    lineId: currentLineId,
                    name,
                    grade,
                    status,
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching student from Line ID:', error);
        return null;
    }
};
