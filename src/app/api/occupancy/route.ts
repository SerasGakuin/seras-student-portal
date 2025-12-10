import { NextResponse } from 'next/server';
import { getGoogleSheets } from '@/lib/googleSheets';
import { CONFIG } from '@/lib/config';
import { ApiResponse, OccupancyData } from '@/types';

export async function GET() {
    try {
        const sheets = await getGoogleSheets();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            range: `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!A2:B2`,
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return NextResponse.json<OccupancyData>({
                building1: 0,
                building2: 0,
                timestamp: new Date().toISOString()
            });
        }

        const building1 = Number(rows[0][0]);
        const building2 = Number(rows[0][1]);

        return NextResponse.json<ApiResponse<OccupancyData>>({
            status: 'ok',
            data: {
                building1: isNaN(building1) ? 0 : building1,
                building2: isNaN(building2) ? 0 : building2,
                timestamp: new Date().toISOString(),
            }
        });

    } catch (error: unknown) {
        console.error('Error fetching occupancy:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse<OccupancyData>>({ status: 'error', message }, { status: 500 });
    }
}
