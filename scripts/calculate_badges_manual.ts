
import fs from 'fs';
import path from 'path';
import { BadgeService } from '../src/services/badgeService';
import { IOccupancyRepository, EntryExitLog, EntryExitLogWithIndex } from '../src/repositories/interfaces/IOccupancyRepository';
import { IStudentRepository } from '../src/repositories/interfaces/IStudentRepository';
import { getGoogleSheets } from '../src/lib/googleSheets';
import { Student } from '@/lib/schema';

// --- Env Loader ---
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Simple quote removal
                    process.env[key] = value;
                }
            });
            console.log("Loaded .env.local");
        } else {
            console.warn(".env.local not found");
        }
    } catch (e) {
        console.error("Failed to load .env.local", e);
    }
}

loadEnv();

// --- Mocks ---

class ScriptOccupancyRepository implements IOccupancyRepository {
    private readonly SPREADSHEET_ID = process.env.OCCUPANCY_SPREADSHEET_ID;
    private readonly LOG_SHEET_NAME = '入退室記録';

    async findAllLogs(): Promise<EntryExitLog[]> {
        if (!this.SPREADSHEET_ID) {
            console.error('OCCUPANCY_SPREADSHEET_ID is not defined');
            return [];
        }

        try {
            const sheets = await getGoogleSheets();
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.LOG_SHEET_NAME}!A2:D`,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return [];
            }

            return rows.map((row) => ({
                entryTime: row[0] || '',
                exitTime: row[1] || null,
                place: row[2] || '',
                name: row[3] || '',
            }));
        } catch (error) {
            console.error('Failed to fetch occupancy logs:', error);
            return [];
        }
    }

    async findLogsByName(name: string): Promise<EntryExitLog[]> {
        const allLogs = await this.findAllLogs();
        return allLogs.filter(log => log.name === name);
    }

    async findAllLogsWithIndex(): Promise<EntryExitLogWithIndex[]> {
        const logs = await this.findAllLogs();
        return logs.map((log, index) => ({ ...log, rowIndex: index }));
    }

    async updateExitTime(_rowIndex: number, _exitTime: string): Promise<void> {
        throw new Error('updateExitTime is not supported in ScriptOccupancyRepository');
    }
}

class ScriptStudentRepository implements IStudentRepository {
    private readonly SPREADSHEET_ID = process.env.STUDENT_SPREADSHEET_ID;

    async findAll(): Promise<Record<string, Student>> {
        if (!this.SPREADSHEET_ID) {
            console.error("STUDENT_SPREADSHEET_ID not set");
            return {};
        }

        try {
            const sheets = await getGoogleSheets();
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'A:Z',
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) return {};

            const headers = rows[0];
            const colMap = new Map<string, number>();
            headers.forEach((h, i) => colMap.set(h, i));

            const idxLineId = colMap.get('生徒LINEID');
            const idxName = colMap.get('名前');
            const idxGrade = colMap.get('学年');
            const idxStatus = colMap.get('Status');
            const idxDocLink = colMap.get('ドキュメント');
            const idxSheetLink = colMap.get('スプレッドシート');

            if (idxLineId === undefined || idxName === undefined || idxGrade === undefined || idxStatus === undefined) {
                console.error('[ScriptStudentRepository] Missing required columns');
                return {};
            }

            // Minimal schema helper since we can't easily import Zod schema from lib/schema if it has node/web specific deps (though it should be fine)
            // But let's just map manually to be safe or use simple object
            const studentRecord: Record<string, Student> = {};

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const normalizeString = (s: string) => s.trim().replace(/（/g, '(').replace(/）/g, ')');

                // Cast to any to bypass strict Zod validation here for simplicity in script
                // In production code we use the Zod schema
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawData: any = {
                    lineId: row[idxLineId]?.trim() || '',
                    name: row[idxName]?.trim() || '',
                    grade: normalizeString(row[idxGrade] || ''),
                    status: normalizeString(row[idxStatus] || ''),
                    docLink: idxDocLink !== undefined ? (row[idxDocLink]?.trim() || '') : '',
                    sheetLink: idxSheetLink !== undefined ? (row[idxSheetLink]?.trim() || '') : '',
                };

                if (!rawData.lineId) continue;
                studentRecord[rawData.lineId] = rawData as Student;
            }
            return studentRecord;

        } catch (e) {
            console.error('[ScriptStudentRepository] Failed to fetch students map', e);
            return {};
        }
    }

    async findById(_lineId: string): Promise<Student | null> {
        return null; // Not needed for badge calc
    }
    async findByNames(_names: string[]): Promise<Map<string, { grade: string; }>> {
        return new Map(); // Not needed
    }
    async findPrincipal(): Promise<Student | null> {
        return null; // Not needed
    }
}

async function main() {
    console.log("Fetching data and calculating badges...");

    // Inject Custom Repositories
    const occupancyRepo = new ScriptOccupancyRepository();
    const studentRepo = new ScriptStudentRepository();

    const service = new BadgeService(occupancyRepo, studentRepo);

    const result = await service.getWeeklyBadges();

    console.log("\n--- Top Ranker Badges (HEAVY_USER) ---");

    // Exam Group
    console.log("\n[Exam Group]");
    const examBadges = Object.entries(result.exam);
    examBadges.forEach(([name, badges]) => {
        const topBadge = badges.find(b => b.type === 'HEAVY_USER');
        if (topBadge) {
            console.log(`Rank ${topBadge.rank}: ${name} (${topBadge.value})`);
        }
    });

    // General Group
    console.log("\n[General Group]");
    const generalBadges = Object.entries(result.general);
    generalBadges.forEach(([name, badges]) => {
        const topBadge = badges.find(b => b.type === 'HEAVY_USER');
        if (topBadge) {
            console.log(`Rank ${topBadge.rank}: ${name} (${topBadge.value})`);
        }
    });
}

main().catch(console.error);
