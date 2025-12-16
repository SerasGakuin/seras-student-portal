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

// 1. Cached function to fetch raw data using batchGet from Google Sheets
const getRawSheetData = unstable_cache(
    async () => {
        const sheets = await getGoogleSheets();
        const sheetName = '入退室記録';

        // Batch Get: 
        // 1. Status (Open/Close) from legacy sheet (C2:D2)
        // 2. Logs from new sheet (A2:D)
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            ranges: [
                `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!C2:D2`,
                `${sheetName}!A2:D`
            ]
        });

        const statusRows = response.data.valueRanges?.[0].values || [];
        const logRows = response.data.valueRanges?.[1].values || [];

        return { statusRows, logRows };
    },
    ['occupancy-combined-data-v2'], // Bump version for safety
    {
        revalidate: 30, // Global cache for 30 seconds
        tags: ['occupancy-raw-sheet']
    }
);

// 2. Wrapper to process data for specific user
async function getOccupancyDataWithOptimizedCache(lineUserId?: string | null): Promise<OccupancyData> {
    const { statusRows, logRows } = await getRawSheetData();

    // Default Status (Fallback to Open if missing)
    let b1Open = true;
    let b2Open = true;

    if (statusRows.length > 0) {
        const row = statusRows[0];
        b1Open = row[0] === undefined ? true : Number(row[0]) === 1;
        b2Open = row[1] === undefined ? true : Number(row[1]) === 1;
    }

    // Process Logs to determine current members
    // Logic: Active if Entry Time exists AND Exit Time is empty
    const b1MembersList: { name: string; entryTime: string }[] = [];
    const b2MembersList: { name: string; entryTime: string }[] = [];

    // Map to track latest entry for each person (in case of duplicates, though logic says "empty exit" is key)
    // We iterate logs. If we find a row with NO exit time, they are present.
    // If they have multiple rows with no exit time? We assume the latest one or all.
    // Typically, a person should only have *one* active session.

    // We need to be careful about date parsing. The timestamps are like "Tue Dec 16 2025 ...".
    // We just pass it through or format it. User requested "14:35入室".
    const formatEntryTime = (raw: string) => {
        try {
            const date = new Date(raw);
            if (isNaN(date.getTime())) return raw; // Fallback
            return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return raw;
        }
    };

    for (const row of logRows) {
        const entryTimeRaw = row[0];
        const exitTimeRaw = row[1];
        const buildingId = row[2];
        const name = row[3];

        if (name && entryTimeRaw && (!exitTimeRaw || exitTimeRaw.trim() === '')) {
            const entryTime = formatEntryTime(entryTimeRaw);
            const memberObj = { name, entryTime };

            if (buildingId === '1') {
                b1MembersList.push(memberObj);
            } else if (buildingId === '2') {
                b2MembersList.push(memberObj);
            } else {
                // Fallback: Check if name was in legacy columns? No, stick to new schema strictly.
                // Or maybe buildingId is missing? Assume 1? No, better to be strict.
                // Assuming "1" if undefined for now as safeguard?
                // Actually debug data showed "1" and "2" explicitly.
            }
        }
    }

    // Counts are now derived from the list length, NOT the legacy A2/B2 cells.
    // This ensures consistency between the count and the list.
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
