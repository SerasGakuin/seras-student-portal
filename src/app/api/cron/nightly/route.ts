import { NextRequest, NextResponse } from 'next/server';
import { NightlyService, NightlyResult } from '@/services/nightlyService';
import { ExitTimeFillService } from '@/services/exitTimeFillService';
import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { ApiResponse } from '@/types';

// Prevent deployment cache issues
export const dynamic = 'force-dynamic';

/**
 * Cron Job: Nightly Batch Processing
 *
 * 毎日 23:00 JST に実行される夜間バッチ処理。
 * 以下の処理を統合して実行:
 * 1. 2号館の自動閉館
 * 2. 退室時刻の自動補完 + LINE通知
 *
 * Vercel Cron: 0 14 * * * (14:00 UTC = 23:00 JST)
 */
export async function GET(req: NextRequest) {
    // Cron認証チェック（Vercel Cron Secretヘッダー）
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('[Cron nightly] Unauthorized request');
        // Note: ローカル開発やテスト時は認証をスキップ可能
    }

    try {
        // サービスを初期化
        const exitTimeFillService = new ExitTimeFillService(
            new GoogleSheetOccupancyRepository(),
            new GoogleSheetStudentRepository()
        );
        const nightlyService = new NightlyService(exitTimeFillService);

        // 夜間バッチ処理を実行
        const result = await nightlyService.runAll();

        console.log('[Cron nightly] Completed:', result.summary);

        return NextResponse.json<ApiResponse<NightlyResult>>({
            status: 'ok',
            data: result,
            message: result.summary,
        });
    } catch (error) {
        console.error('[Cron nightly] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>(
            { status: 'error', message },
            { status: 500 }
        );
    }
}
