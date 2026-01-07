import { unstable_cache, revalidateTag } from 'next/cache';
import { getGoogleSheets } from '@/lib/googleSheets';
import {
    IOccupancyRepository,
    EntryExitLog,
    EntryExitLogWithIndex,
} from '@/repositories/interfaces/IOccupancyRepository';
import { CACHE_TAGS } from '@/lib/cacheConfig';

export class GoogleSheetOccupancyRepository implements IOccupancyRepository {
    private readonly SPREADSHEET_ID = process.env.OCCUPANCY_SPREADSHEET_ID;
    private readonly LOG_SHEET_NAME = '入退室記録';

    // Cache the fetch operation for 1 hour to reduce API calls
    private getCachedLogs = unstable_cache(
        async (): Promise<EntryExitLog[]> => {
            if (!this.SPREADSHEET_ID) {
                console.error('OCCUPANCY_SPREADSHEET_ID is not defined');
                return [];
            }

            try {
                const sheets = await getGoogleSheets();
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: this.SPREADSHEET_ID,
                    range: `${this.LOG_SHEET_NAME}!A2:D`, // A: Entry, B: Exit, C: Place, D: Name
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
        },
        ['occupancy-logs-all'],
        { revalidate: 3600, tags: [CACHE_TAGS.OCCUPANCY_LOGS] }
    );

    async findAllLogs(): Promise<EntryExitLog[]> {
        return this.getCachedLogs();
    }

    /**
     * 行インデックス付きで全ログを取得
     * キャッシュを使わず直接取得（書き込み前の最新データが必要なため）
     */
    async findAllLogsWithIndex(): Promise<EntryExitLogWithIndex[]> {
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

            return rows.map((row, index) => ({
                entryTime: row[0] || '',
                exitTime: row[1] || null,
                place: row[2] || '',
                name: row[3] || '',
                rowIndex: index, // 0-indexed (row 2 = index 0)
            }));
        } catch (error) {
            console.error('Failed to fetch occupancy logs with index:', error);
            return [];
        }
    }

    async findLogsByName(name: string): Promise<EntryExitLog[]> {
        const allLogs = await this.findAllLogs();
        return allLogs.filter(log => log.name === name);
    }

    /**
     * 指定した行の exitTime を更新
     * @param rowIndex 0-indexed（スプレッドシートの行番号 = rowIndex + 2）
     * @param exitTime ISO形式の退室時刻
     */
    async updateExitTime(rowIndex: number, exitTime: string): Promise<void> {
        if (!this.SPREADSHEET_ID) {
            throw new Error('OCCUPANCY_SPREADSHEET_ID is not defined');
        }

        const sheets = await getGoogleSheets();
        const sheetRow = rowIndex + 2; // rowIndex=0 → row 2

        try {
            await sheets.spreadsheets.values.update({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.LOG_SHEET_NAME}!B${sheetRow}`, // B列 = exitTime
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[exitTime]],
                },
            });

            // キャッシュを無効化
            revalidateTag(CACHE_TAGS.OCCUPANCY_LOGS, { expire: 0 });

            console.log(`[GoogleSheetOccupancyRepository] Updated exitTime at row ${sheetRow}: ${exitTime}`);
        } catch (error) {
            console.error(`[GoogleSheetOccupancyRepository] Failed to update exitTime at row ${sheetRow}:`, error);
            throw error;
        }
    }
}
