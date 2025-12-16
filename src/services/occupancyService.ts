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

// --- Helper Functions (DRY / Robustness) ---

/**
 * Validates if the given entry time string represents "Today" in JST.
 * This prevents stale data (e.g. forgot to checkout yesterday) from lingering.
 * @param entryTimeRaw Raw date string from Spreadsheet (e.g. "Tue Dec 16 2025...")
 */
function isValidEntryForToday(entryTimeRaw: string): boolean {
    if (!entryTimeRaw) return false;

    try {
        const entryDate = new Date(entryTimeRaw);
        if (isNaN(entryDate.getTime())) return false;

        // Compare YYYY-MM-DD in JST
        // Note: Deployment server might be UTC, so we must specify timeZone explicitly.
        const jstNow = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
        const jstEntry = entryDate.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

        return jstNow === jstEntry;
    } catch (e) {
        console.warn(`[Occupancy] Invalid date parsed: ${entryTimeRaw}`, e);
        return false;
    }
}

/**
 * Formats entry time to "HH:mm" (JST).
 */
function formatEntryTime(entryTimeRaw: string): string {
    if (!entryTimeRaw) return "";
    try {
        const date = new Date(entryTimeRaw);
        if (isNaN(date.getTime())) return entryTimeRaw;
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Tokyo" });
    } catch {
        return entryTimeRaw;
    }
}


// --- Optimized Caching Implementation ---

// 1. Cached function to fetch raw data using batchGet from Google Sheets
const getRawSheetData = unstable_cache(
    async () => {
        const sheets = await getGoogleSheets();

        // Batch Get: 
        // 1. Status (Open/Close) from legacy sheet (C2:D2)
        // 2. ACTIVE USERS from new dedicated view sheet (A2:D)
        //    Using a dedicated view sheet is faster and cleaner than filtering thousands of logs here.
        const activeUsersSheetName = '現在在室者';

        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            ranges: [
                `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!C2:D2`,
                `${activeUsersSheetName}!A2:D`
            ]
        });

        const statusRows = response.data.valueRanges?.[0].values || [];
        const activeUserRows = response.data.valueRanges?.[1].values || [];

        return { statusRows, activeUserRows };
    },
    ['occupancy-combined-data-v3'], // Bump version: v2 (Logs) -> v3 (Active Users Sheet)
    {
        revalidate: 10, // Global cache for 10 seconds (User requested)
        tags: ['occupancy-raw-sheet']
    }
);

// 2. Wrapper to process data for specific user
async function getOccupancyDataWithOptimizedCache(lineUserId?: string | null): Promise<OccupancyData> {
    const { statusRows, activeUserRows } = await getRawSheetData();

    // Default Status (Fallback to Open if missing)
    let b1Open = true;
    let b2Open = true;

    if (statusRows.length > 0) {
        const row = statusRows[0];
        b1Open = row[0] === undefined ? true : Number(row[0]) === 1;
        b2Open = row[1] === undefined ? true : Number(row[1]) === 1;
    }

    // Process Active Users
    const b1MembersList: { name: string; entryTime: string }[] = [];
    const b2MembersList: { name: string; entryTime: string }[] = [];

    for (const row of activeUserRows) {
        const entryTimeRaw = row[0]; // Col A: Entry Time
        // Col B (Exit Time) is guaranteed NULL by the Sheet QUERY, but we ignore it anyway
        const buildingId = row[2];   // Col C
        const name = row[3];         // Col D

        // STRICT VALIDATION: Only include if valid name AND entry time is TODAY.
        if (name && isValidEntryForToday(entryTimeRaw)) {
            const entryTime = formatEntryTime(entryTimeRaw);
            const memberObj = { name, entryTime };

            if (buildingId === '1') {
                b1MembersList.push(memberObj);
            } else if (buildingId === '2') {
                b2MembersList.push(memberObj);
            }
        }
    }

    // Counts derived from filtered list
    const b1Count = b1MembersList.length;
    const b2Count = b2MembersList.length;

    // Permissions
    let showDetails = false;
    if (lineUserId) {
        const student = await getStudentFromLineId(lineUserId);
        if (student && (student.status === '在塾' || student.status === '在塾(講師)' || student.status === '教室長')) {
            showDetails = true;
        }
    }

    let b1MembersResult: { name: string; grade: string; entryTime?: string }[] = [];
    let b2MembersResult: { name: string; grade: string; entryTime?: string }[] = [];

    if (showDetails && (b1Count > 0 || b2Count > 0)) {
        const allNames = [...b1MembersList.map(m => m.name), ...b2MembersList.map(m => m.name)];
        const detailsMap = await getStudentsByNames(allNames);

        b1MembersResult = b1MembersList.map(m => {
            const info = detailsMap.get(m.name.trim());
            return { name: m.name, grade: info?.grade || '', entryTime: m.entryTime };
        });

        b2MembersResult = b2MembersList.map(m => {
            const info = detailsMap.get(m.name.trim());
            return { name: m.name, grade: info?.grade || '', entryTime: m.entryTime };
        });
    }

    return {
        building1: {
            count: b1Count,
            isOpen: b1Open,
            members: b1MembersResult
        },
        building2: {
            count: b2Count,
            isOpen: b2Open,
            members: b2MembersResult
        },
        timestamp: new Date().toISOString(),
    };
}
