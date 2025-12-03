import { getGoogleSheets } from './googleSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

interface Student {
    lineId: string;
    name: string;
}

export const getStudentNameFromLineId = async (lineId: string): Promise<string | null> => {
    if (!SPREADSHEET_ID) {
        throw new Error('SPREADSHEET_ID is not defined');
    }

    const sheets = await getGoogleSheets();

    // Assuming the data is in the first sheet and has headers
    // We'll fetch the whole sheet for now. In a real app, we might want to cache this or use a more specific query if possible.
    // However, Sheets API doesn't support SQL-like queries easily without fetching data.
    // We can fetch columns A and B if we know where they are.
    // Let's assume headers are in row 1.

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:Z', // Fetch all columns for now to find the right headers
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        return null;
    }

    const headers = rows[0];
    const lineIdIndex = headers.indexOf('生徒LINEID');
    const nameIndex = headers.indexOf('名前');

    if (lineIdIndex === -1 || nameIndex === -1) {
        console.error('Required columns not found');
        return null;
    }

    // Search for the student
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[lineIdIndex] === lineId) {
            return row[nameIndex];
        }
    }

    return null;
};
