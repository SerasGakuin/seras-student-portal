import { Student } from '@/types';
import { getGoogleSheets } from './googleSheets';

const SPREADSHEET_ID = process.env.STUDENT_SPREADSHEET_ID;


// データとして必要な列。
const COLS = {
    LINE_ID: '生徒LINEID',
    NAME: '名前',
    GRADE: '学年',
    STATUS: 'Status',
};

/**
 * スプレッドシートの生徒マスターを参照して検索する。
 * @deprecated - repositories/に新しい実装があるようです
 */
export const getStudentFromLineId = async (lineId: string): Promise<Student | null> => {
    if (!SPREADSHEET_ID) {
        throw new Error('環境変数STUDENT_SPREADSHEET_IDが未定義です。');
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
        // 動的に列名と列番号を整合。
        const colMap = new Map<string, number>();
        headers.forEach((header, index) => {
            colMap.set(header, index);
        });

        // 必要な列なのに、実際のシートにない場合はエラー
        // TODO: 呼び出し元でフォールバックする余地がないので修正したい。後で。
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
