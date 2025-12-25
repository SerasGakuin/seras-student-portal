
import { IStudentRepository } from '../interfaces/IStudentRepository';
import { Student, StudentSchema } from '@/lib/schema';
import { getGoogleSheets } from '@/lib/googleSheets';
import { unstable_cache } from 'next/cache';

export class GoogleSheetStudentRepository implements IStudentRepository {

    // Cached fetch function using unstable_cache inside
    private getCachedStudents = unstable_cache(
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

                // Optional columns for Google Docs/Sheets links
                const idxDocLink = colMap.get('ドキュメント');
                const idxSheetLink = colMap.get('スプレッドシート');

                if (idxLineId === undefined || idxName === undefined || idxGrade === undefined || idxStatus === undefined) {
                    console.error('[GoogleSheetStudentRepository] Missing required columns');
                    return {};
                }

                const studentRecord: Record<string, Student> = {};
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const normalizeString = (s: string) => s.trim().replace(/（/g, '(').replace(/）/g, ')');

                    const rawData = {
                        lineId: row[idxLineId]?.trim() || '',
                        name: row[idxName]?.trim() || '',
                        grade: normalizeString(row[idxGrade] || ''),
                        status: normalizeString(row[idxStatus] || ''),
                        docLink: idxDocLink !== undefined ? (row[idxDocLink]?.trim() || '') : '',
                        sheetLink: idxSheetLink !== undefined ? (row[idxSheetLink]?.trim() || '') : '',
                    };

                    if (!rawData.lineId) continue;

                    const result = StudentSchema.safeParse(rawData);
                    if (result.success) {
                        studentRecord[result.data.lineId] = result.data;
                    } else {
                        console.error('Student data validation failed:', result.error);
                    }
                }
                return studentRecord;

            } catch (e) {
                console.error('[GoogleSheetStudentRepository] Failed to fetch students map', e);
                return {};
            }
        },
        ['all-students-map-v5-repo'], // New cache key
        { revalidate: 30, tags: ['student-data'] }
    );

    async findAll(): Promise<Record<string, Student>> {
        return this.getCachedStudents();
    }

    async findById(lineId: string): Promise<Student | null> {
        const students = await this.findAll();
        return students[lineId] || null;
    }

    async findByNames(names: string[]): Promise<Map<string, { grade: string }>> {
        if (names.length === 0) return new Map();
        const allStudents = await this.findAll();

        const resultMap = new Map<string, { grade: string }>();
        const normalizeName = (name: string) => name.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

        // Map NormalizedName -> Student
        const masterMap = new Map<string, Student>();
        for (const s of Object.values(allStudents)) {
            masterMap.set(normalizeName(s.name), s);
        }

        for (const originalName of names) {
            const normalized = normalizeName(originalName);
            const student = masterMap.get(normalized);
            if (student) {
                resultMap.set(originalName.trim(), { grade: student.grade });
            }
        }

        return resultMap;
    }

    async findPrincipal(): Promise<Student | null> {
        const students = await this.findAll();
        for (const student of Object.values(students)) {
            if (student.status === '教室長') {
                return student;
            }
        }
        return null;
    }
}
