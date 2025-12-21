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
                    lineId: row[idxLineId]?.trim() || '',
                    name: row[idxName]?.trim() || '',
                    grade: row[idxGrade]?.trim(),
                    status: row[idxStatus]?.trim(),
                };

                // Skip empty rows without error logs
                if (!rawData.lineId) continue;

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
    ['all-students-map-v5'], // Bump version: v4 -> v5 (Force refresh for normalization fix)
    { revalidate: 30, tags: ['student-data'] }
);

export const getStudentFromLineId = async (lineId: string): Promise<Student | null> => {
    // Determine if we should use the cached MAP or raw fetch.
    // For single lookup, map is fine and faster if cached.
    const map = await getStudentsMap();
    return map[lineId] || null;
};

// Helper to normalize names (remove all whitespace variations)
const normalizeName = (name: string) => name.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

export const getStudentsByNames = async (names: string[]): Promise<Map<string, { grade: string }>> => {
    if (names.length === 0) return new Map();
    const allStudents = await getStudentsMap();

    const resultMap = new Map<string, { grade: string }>();
    const nameSet = new Set(names.map(n => normalizeName(n)));

    for (const student of Object.values(allStudents)) {
        if (nameSet.has(normalizeName(student.name))) {
            // Store by original name to allow flexible lookup, OR strictly by normalized name?
            // To support the UI which passes original names, we should try to match back.
            // But since the UI iterates over its own list and asks "Do you have info for X?",
            // the Caller (OccupancyService) needs to use the same key.

            // However, OccupancyService passes a list of names from Occupancy Sheet.
            // If Occupancy Sheet has "Endo " and Master has "Endo", normalize matches them.
            // But resultMap key must match what OccupancyService expects.

            // Let's iterate the input `names` again to map them correctly.
        }
    }

    // Better approach:
    // 1. Create a map of NormalizedName -> StudentInfo from Master
    const masterMap = new Map<string, Student>();
    for (const s of Object.values(allStudents)) {
        masterMap.set(normalizeName(s.name), s);
    }

    // 2. Iterate requested names, normalize them, look up in MasterMap
    for (const originalName of names) {
        const normalized = normalizeName(originalName);
        const student = masterMap.get(normalized);
        if (student) {
            resultMap.set(originalName.trim(), { grade: student.grade });
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
