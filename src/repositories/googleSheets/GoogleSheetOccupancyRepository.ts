import { unstable_cache } from 'next/cache';
import { getGoogleSheets } from '@/lib/googleSheets';
import { IOccupancyRepository, EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';

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
        { revalidate: 3600 } // 1 hour cache
    );

    async findAllLogs(): Promise<EntryExitLog[]> {
        return this.getCachedLogs();
    }

    async findLogsByName(name: string): Promise<EntryExitLog[]> {
        const allLogs = await this.findAllLogs();
        return allLogs.filter(log => log.name === name);
    }
}
