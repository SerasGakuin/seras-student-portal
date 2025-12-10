import { NextResponse } from 'next/server';
import { getGoogleSheets } from '@/lib/googleSheets';
import { CONFIG } from '@/lib/config';
import { ApiResponse, OccupancyData } from '@/types';

export async function GET(req: Request) {
    try {
        const sheets = await getGoogleSheets();

        // Fetch larger range to include Count (Row 2), OpenStatus (Row 2), and Names (Row 3+)
        // Building 1: A (Count), C (Status), A3:A (Names)
        // Building 2: B (Count), D (Status), B3:B (Names)
        // Fetch A2:D100 (Assuming max 100 students for now, or just enough)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
            range: `${CONFIG.SPREADSHEET.OCCUPANCY.SHEETS.OCCUPANCY}!A2:D100`,
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return NextResponse.json<OccupancyData>({
                building1: { count: 0, isOpen: true, members: [] },
                building2: { count: 0, isOpen: true, members: [] },
                timestamp: new Date().toISOString()
            });
        }

        // Row 0 corresponds to Spreadsheet Row 2
        const row2 = rows[0];
        const b1Count = Number(row2[0]);
        const b2Count = Number(row2[1]);
        const b1Open = row2[2] === undefined ? true : Number(row2[2]) === 1;
        const b2Open = row2[3] === undefined ? true : Number(row2[3]) === 1;

        // Extract Names (Row 3+, which is rows index 1+)
        // Column A (index 0) and B (index 1)
        const b1Names: string[] = [];
        const b2Names: string[] = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row[0]) b1Names.push(row[0]);
            if (row[1]) b2Names.push(row[1]);
        }

        // Check Authorization (Simplified: Check for specific header or assume public for now, 
        // but hide details if not authorized. 
        // Actually, for this iteration, let's fetch details only if a special header implies Teacher/Principal,
        // OR just return empty members if not needed.
        // User request specifically said: "Teacher can see...".
        // The most robust way without full session mgmt here is to rely on client-side logic to DISPLAY it, 
        // but validation should ideally happen here. 
        // For now, we will return the data populated, but the UI will hide it if not Teacher.
        // *Correction*: Security-wise, we shouldn't leak names. 
        // Let's check for a custom header 'X-Line-User-Id' sent from client.
        const lineUserId = req.headers.get('x-line-user-id');
        let showDetails = false;

        if (lineUserId) {
            // Lazy import to avoid cycle if any
            const { getStudentFromLineId } = await import('@/services/studentService');
            const student = await getStudentFromLineId(lineUserId);
            if (student && (student.status === '在塾(講師)' || student.status === '教室長')) {
                showDetails = true;
            }
        }

        let b1Members: { name: string; grade: string }[] = [];
        let b2Members: { name: string; grade: string }[] = [];

        if (showDetails && (b1Names.length > 0 || b2Names.length > 0)) {
            const { getStudentsByNames } = await import('@/services/studentService');
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

        return NextResponse.json<ApiResponse<OccupancyData>>({
            status: 'ok',
            data: {
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
                timestamp: new Date().toISOString(),
            }
        });

    } catch (error: unknown) {
        console.error('Error fetching occupancy:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse<OccupancyData>>({ status: 'error', message }, { status: 500 });
    }
}
