import { NextRequest, NextResponse } from 'next/server';
import { ExitTimeFillService } from '@/services/exitTimeFillService';
import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { ApiResponse } from '@/types';

// Prevent deployment cache issues
export const dynamic = 'force-dynamic';

/**
 * Cron Job: Fill Missing Exit Times
 *
 * 毎日 23:00 JST に実行され、当日の未退室ログに対して
 * 過去7日間の平均滞在時間を基に退室時刻を補完し、LINE通知を送信する。
 *
 * Vercel Cron: 0 14 * * * (14:00 UTC = 23:00 JST)
 */
export async function GET(req: NextRequest) {
    // Cron認証チェック（Vercel Cron Secretヘッダー）
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('[Cron fill-exit-time] Unauthorized request');
        // Note: ローカル開発やテスト時は認証をスキップ可能
    }

    try {
        const service = new ExitTimeFillService(
            new GoogleSheetOccupancyRepository(),
            new GoogleSheetStudentRepository()
        );

        const result = await service.fillAndNotify();

        console.log('[Cron fill-exit-time] Completed:', result);

        return NextResponse.json<ApiResponse<typeof result>>({
            status: 'ok',
            data: result,
            message: `Filled ${result.filled} exit times, notified ${result.notified} students.`,
        });
    } catch (error) {
        console.error('[Cron fill-exit-time] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>(
            { status: 'error', message },
            { status: 500 }
        );
    }
}
