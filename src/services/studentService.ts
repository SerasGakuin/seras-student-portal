import { Student, StudentSchema } from '@/lib/schema';
import { getGoogleSheets } from '@/lib/googleSheets';
import { unstable_cache } from 'next/cache';

// Shared internal helper to fetch ALL students map
// Caches for 1 hour
// Note: Must return serializable object (Record), not Map, for unstable_cache.
const getStudentsMap = unstable_cache(
    async (): Promise<Record<string, Student>> => {
        const SPREADSHEET_ID = process.env.STUDENT_SPREADSHEET_ID;
        if (!SPREADSHEET_ID) return {};

        try {
            const sheets = await getGoogleSheets();
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'A:Z',
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) return {};

            const headers = rows[0];
            const colMap = new Map<string, number>();
            headers.forEach((h, i) => colMap.set(h, i));

            // Required columns
            const idxLineId = colMap.get('生徒LINEID');
            const idxName = colMap.get('名前');
            const idxGrade = colMap.get('学年');
            const idxStatus = colMap.get('Status');

            if (idxLineId === undefined || idxName === undefined || idxGrade === undefined || idxStatus === undefined) {
                console.error('[StudentService] Missing required columns');
                return {};
            }

            const studentRecord: Record<string, Student> = {};
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const rawData = {
                    lineId: row[idxLineId],
                    name: row[idxName],
                    grade: row[idxGrade],
                    status: row[idxStatus],
                };

                const result = StudentSchema.safeParse(rawData);
                if (result.success) {
                    studentRecord[result.data.lineId] = result.data; // Key by LINE ID
                } else {
                    console.error('Student data validation failed:', result.error);
                }
            }
            return studentRecord;

        } catch (e) {
            console.error('[StudentService] Failed to fetch students map', e);
            return {};
        }
    },
    ['all-students-map-v2'], // Bump version
    { revalidate: 3600, tags: ['student-data'] }
);

export const getStudentFromLineId = async (lineId: string): Promise<Student | null> => {
    // Determine if we should use the cached MAP or raw fetch.
    // For single lookup, map is fine and faster if cached.
    const map = await getStudentsMap();
    return map[lineId] || null;
};

export const getStudentsByNames = async (names: string[]): Promise<Map<string, { grade: string }>> => {
    if (names.length === 0) return new Map();
    const allStudents = await getStudentsMap();

    // We keyed by LINE ID in getStudentsMap. We need to search by Name.
    // Since this is less frequent or batch, iterating is acceptable given map size (likely < 1000).
    const resultMap = new Map<string, { grade: string }>();
    const nameSet = new Set(names.map(n => n.trim()));

    for (const student of Object.values(allStudents)) {
        if (nameSet.has(student.name.trim())) {
            resultMap.set(student.name.trim(), { grade: student.grade });
        }
    }
    return resultMap;
};

// NEW: Get Principal line ID for notifications
export const getPrincipal = unstable_cache(
    async (): Promise<Student | null> => {
        const students = await getStudentsMap();
        for (const student of Object.values(students)) {
            if (student.status === '教室長') {
                return student;
            }
        }
        return null;
    },
    ['principal-data'],
    { revalidate: 3600, tags: ['student-data'] }
);
