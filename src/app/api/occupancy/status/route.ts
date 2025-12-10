import { NextResponse } from 'next/server';
import { getGoogleSheets } from '@/lib/googleSheets';
import { CONFIG } from '@/lib/config';
import { ApiResponse } from '@/types';
import { z } from 'zod';

const StatusUpdateSchema = z.object({
    building: z.enum(['1', '2']),
    isOpen: z.boolean(),
    actorName: z.string().min(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parseResult = StatusUpdateSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Invalid input',
            }, { status: 400 });
        }

        const { building, isOpen, actorName } = parseResult.data;

        // Note: Real authorization check should happen here.
        // For this version, we trust the client logic (Principal-only UI) + maybe a header secret if needed.
        // In a strictly secure app, we'd verify a session token.

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
        // Timestamp, Actor, Action, Building, Context
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
                    'Web Portal' // User Agent context could go here
                ]],
            },
        });

        return NextResponse.json<ApiResponse<{ success: boolean }>>({
            status: 'ok',
            data: { success: true },
        });

    } catch (error: unknown) {
        console.error('Error updating status:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>({
            status: 'error',
            message,
        }, { status: 500 });
    }
}
