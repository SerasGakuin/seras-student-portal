import { NextRequest, NextResponse } from 'next/server';
import { occupancyService } from '@/services/occupancyService';
import { getPrincipal } from '@/services/studentService';
import { lineService } from '@/services/lineService';
import { CONFIG } from '@/lib/config';
import { getJstDayOfWeek } from '@/lib/dateUtils';
import { validateCronRequest } from '@/lib/apiHandler';

// Prevent deployment cache issues
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Cron認証チェック（ローカル開発やテスト時は認証をスキップ可能）
    validateCronRequest(req, 'Cron remind-open');

    try {
        // 2. Check Day of Week (JST)
        const dayOfWeek = getJstDayOfWeek();

        if (CONFIG.REMINDER.AUTO_OPEN.EXCLUDE_DAYS.includes(dayOfWeek)) {
            return NextResponse.json({ message: 'Skipped (Excluded Day)' });
        }

        // 3. Check Occupancy Status
        const status = await occupancyService.getOccupancyData(null);
        if (status.building2.isOpen) {
            return NextResponse.json({ message: 'Skipped (Building 2 Already Open)' });
        }

        // 4. Find Principal
        const principal = await getPrincipal();
        if (!principal || !principal.lineId) {
            console.error('[Cron] Principal not found for reminder.');
            return NextResponse.json({ error: 'Principal not found' }, { status: 404 });
        }

        // 5. Send Reminder
        const message = '【リマインド】\n2号館がまだ「開館」になっていません。\n開館作業をしたタイミングで、ポータル上の開館表示をお願いします。';
        await lineService.pushMessage(principal.lineId, message);

        return NextResponse.json({ message: 'Reminder sent to Principal', principal: principal.name });

    } catch (error) {
        console.error('[Cron] Reminder failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
