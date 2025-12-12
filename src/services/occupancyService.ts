import { getGoogleSheets } from '@/lib/googleSheets';
import { CONFIG } from '@/lib/config';
import { OccupancyData } from '@/types';
import { getStudentFromLineId, getStudentsByNames } from '@/services/studentService';
import { unstable_cache, revalidateTag } from 'next/cache';

export interface UpdateStatusParams {
    building: '1' | '2';
    isOpen: boolean;
    actorName: string;
}

export const occupancyService = {
    /**
     * Fetch current occupancy data for both buildings with caching.
     * Cache duration: 30 seconds.
     * @param lineUserId Optional LINE User ID to check for Teacher/Principal permissions.
     */
    getOccupancyData: async (lineUserId?: string | null): Promise<OccupancyData> => {
        return getOccupancyDataWithOptimizedCache(lineUserId);
    },

    /**
     * Update the open/close status of a building.
     */
    async updateBuildingStatus({ building, isOpen, actorName }: UpdateStatusParams): Promise<void> {
        const sheets = await getGoogleSheets();

        // 1. Update Occupancy Sheet (C2 or D2)
        // Building 1 -> C2, Building 2 -> D2
        const range = building === '1' ?
            `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!C2` :
            `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!D2`;

        const value = isOpen ? 1 : 0;

        await sheets.spreadsheets.values.update({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[value]],
            },
        });

        // 2. Append to open_logs
        const action = isOpen ? 'OPEN' : 'CLOSE';
        const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        const buildingLabel = building === '1' ? '本館' : '2号館';

        await sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            range: `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OPEN_LOGS}!A:E`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    timestamp,
                    actorName,
                    action,
                    buildingLabel,
                    'Web Portal'
                ]],
            },
        });

        // Invalidate cache immediately so UI updates
        // Invalidate cache immediately
        revalidateTag('occupancy-raw-sheet', { expire: 0 });
    }
};

// --- Optimized Caching Implementation ---

// 1. Cached function to fetch raw data from Google Sheets (Shared across ALL users)
const getRawSheetData = unstable_cache(
    async () => {
        const sheets = await getGoogleSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            range: `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!A2:D100`,
        });
        return response.data.values || [];
    },
    ['occupancy-raw-sheet-data'],
    {
        revalidate: 30, // Global cache for 30 seconds
        tags: ['occupancy-raw-sheet']
    }
);

// 2. Wrapper to process data for specific user
async function getOccupancyDataWithOptimizedCache(lineUserId?: string | null): Promise<OccupancyData> {
    const rows = await getRawSheetData();

    if (!rows || rows.length === 0) {
        return {
            building1: { count: 0, isOpen: true, members: [] },
            building2: { count: 0, isOpen: true, members: [] },
            timestamp: new Date().toISOString()
        };
    }

    const row2 = rows[0];
    const b1Count = Number(row2[0]);
    const b2Count = Number(row2[1]);
    const b1Open = row2[2] === undefined ? true : Number(row2[2]) === 1;
    const b2Open = row2[3] === undefined ? true : Number(row2[3]) === 1;

    const b1Names: string[] = [];
    const b2Names: string[] = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) b1Names.push(row[0]);
        if (row[1]) b2Names.push(row[1]);
    }

    // Auth Check (Per Request, not cached via unstable_cache to avoid key explosion)
    // Authorization logic itself using studentService might hit DB/Sheet, 
    // BUT studentService likely has its own caching or is lightweight. 
    // IF studentService hits Sheets every time, we should optimize that too, 
    // but for now optimizing the main polling target (Occupancy) is the user's request.

    let showDetails = false;
    if (lineUserId) {
        const student = await getStudentFromLineId(lineUserId);
        if (student && (student.status === '在塾(講師)' || student.status === '教室長')) {
            showDetails = true;
        }
    }

    let b1Members: { name: string; grade: string }[] = [];
    let b2Members: { name: string; grade: string }[] = [];

    if (showDetails && (b1Names.length > 0 || b2Names.length > 0)) {
        const allNames = [...b1Names, ...b2Names];
        const detailsMap = await getStudentsByNames(allNames);

        b1Members = b1Names.map(name => {
            const info = detailsMap.get(name.trim());
            return { name, grade: info?.grade || '' };
        });

        b2Members = b2Names.map(name => {
            const info = detailsMap.get(name.trim());
            return { name, grade: info?.grade || '' };
        });
    }

    return {
        building1: {
            count: isNaN(b1Count) ? 0 : b1Count,
            isOpen: b1Open,
            members: b1Members
        },
        building2: {
            count: isNaN(b2Count) ? 0 : b2Count,
            isOpen: b2Open,
            members: b2Members
        },
        // We use current server time for timestamp to indicate when response was generated,
        // or we could use a cached timestamp if we stored it. 
        // Using current time is fine as it confirms "server is alive".
        timestamp: new Date().toISOString(),
    };
}
