/**
 * 夜間バッチ処理サービス
 *
 * 毎日23:00 JSTに実行される夜間バッチ処理を統合管理。
 * - 2号館の自動閉館
 * - 退室時刻の自動補完＋LINE通知
 */

import { occupancyService } from '@/services/occupancyService';
import { ExitTimeFillService, FillResult } from '@/services/exitTimeFillService';
import { extractErrorMessage } from '@/lib/apiHandler';

/**
 * 自動閉館の結果
 */
export interface AutoCloseResult {
    closed: boolean;
    message: string;
    error?: string;
}

/**
 * 夜間バッチ処理の統合結果
 */
export interface NightlyResult {
    autoClose: AutoCloseResult;
    fillExitTime: FillResult;
    summary: string;
}

export class NightlyService {
    constructor(private exitTimeFillService: ExitTimeFillService) {}

    /**
     * 2号館の自動閉館処理
     *
     * 2号館が開館中(OPEN)の場合、自動的に閉館(CLOSED)にする。
     */
    async autoCloseBuilding2(): Promise<AutoCloseResult> {
        try {
            const { building2 } = await occupancyService.getOccupancyData(null);

            if (building2.isOpen) {
                await occupancyService.updateBuildingStatus({
                    building: '2',
                    isOpen: false,
                    actorName: 'System (Auto-Close)',
                });

                console.log('[NightlyService] 2号館を自動閉館しました');
                return {
                    closed: true,
                    message: '2号館を自動閉館しました',
                };
            }

            console.log('[NightlyService] 2号館は既に閉館済み');
            return {
                closed: false,
                message: '2号館は既に閉館済みです',
            };
        } catch (error) {
            console.error('[NightlyService] 自動閉館エラー:', error);
            return {
                closed: false,
                message: '自動閉館処理でエラーが発生しました',
                error: extractErrorMessage(error),
            };
        }
    }

    /**
     * 全ての夜間バッチ処理を実行
     *
     * 各処理は独立して実行され、一方が失敗しても他方は継続する。
     */
    async runAll(): Promise<NightlyResult> {
        console.log('[NightlyService] 夜間バッチ処理を開始します');

        // 1. 自動閉館
        const autoCloseResult = await this.autoCloseBuilding2();

        // 2. 退室時刻補完（自動閉館の成否に関わらず実行）
        let fillExitTimeResult: FillResult;
        try {
            fillExitTimeResult = await this.exitTimeFillService.fillAndNotify();
        } catch (error) {
            console.error('[NightlyService] 退室時刻補完エラー:', error);
            fillExitTimeResult = {
                filled: 0,
                notified: 0,
                errors: [extractErrorMessage(error)],
            };
        }

        // 3. サマリー生成
        const summary = this.generateSummary(autoCloseResult, fillExitTimeResult);

        console.log('[NightlyService] 夜間バッチ処理完了:', summary);

        return {
            autoClose: autoCloseResult,
            fillExitTime: fillExitTimeResult,
            summary,
        };
    }

    /**
     * 結果サマリーを生成
     */
    private generateSummary(
        autoClose: AutoCloseResult,
        fillExitTime: FillResult
    ): string {
        // 自動閉館のステータス
        let autoCloseStatus: string;
        if (autoClose.error) {
            autoCloseStatus = 'エラー';
        } else if (autoClose.closed) {
            autoCloseStatus = '実行';
        } else {
            autoCloseStatus = 'スキップ';
        }

        // 退室補完のステータス
        const fillStatus = `${fillExitTime.filled}件補完, ${fillExitTime.notified}件通知`;

        return `自動閉館: ${autoCloseStatus} | 退室補完: ${fillStatus}`;
    }
}
