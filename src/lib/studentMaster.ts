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
        const lineIdIndex = headers.indexOf('生徒LINEID');
        const nameIndex = headers.indexOf('名前');

        if (lineIdIndex === -1 || nameIndex === -1) {
            console.error('Required columns not found in spreadsheet');
            return null;
        }

        // Search for the student
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row[lineIdIndex] === lineId) {
                return {
                    lineId: row[lineIdIndex],
                    name: row[nameIndex]
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching student from Line ID:', error);
        return null;
    }
};
