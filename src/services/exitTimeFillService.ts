/**
 * 退室時刻自動補完サービス
 *
 * 毎日23:00 JST に実行され、当日の未退室ログに対して
 * 過去7日間の平均滞在時間を基に退室時刻を補完し、LINE通知を送信する。
 */

import {
    EntryExitLog,
    EntryExitLogWithIndex,
    IOccupancyRepository,
} from '@/repositories/interfaces/IOccupancyRepository';
import { IStudentRepository } from '@/repositories/interfaces/IStudentRepository';
import { lineService } from '@/services/lineService';
import { toJst } from '@/lib/dateUtils';
import { calculateSingleLogDuration } from '@/lib/durationUtils';
import { extractErrorMessage } from '@/lib/apiHandler';

/** 建物名のマッピング */
const BUILDING_NAMES: Record<string, string> = {
    '1': '本館',
    '2': '2号館',
};

/** デフォルトの滞在時間（分）：過去データがない場合に使用 */
const DEFAULT_DURATION_MINUTES = 180; // 3時間

/** 閉館時刻（JST） */
const CLOSING_HOUR_JST = 22;

export interface FillResult {
    filled: number;
    notified: number;
    errors: string[];
}

export class ExitTimeFillService {
    constructor(
        private occupancyRepo: IOccupancyRepository,
        private studentRepo: IStudentRepository
    ) {}

    /**
     * 当日の未退室ログを取得
     */
    async getTodayUnfilledLogs(): Promise<{ log: EntryExitLogWithIndex; rowIndex: number }[]> {
        const logsWithIndex = await this.occupancyRepo.findAllLogsWithIndex();
        const nowJst = toJst(new Date());
        const todayStr = this.formatDateJst(nowJst);

        return logsWithIndex
            .filter((log) => {
                // exitTime がないもの
                if (log.exitTime) return false;

                // 当日の入室のみ
                const entryJst = toJst(new Date(log.entryTime));
                const entryDateStr = this.formatDateJst(entryJst);
                return entryDateStr === todayStr;
            })
            .map((log) => ({
                log,
                rowIndex: log.rowIndex,
            }));
    }

    /**
     * 生徒の過去7日間の平均滞在時間を計算
     * @returns 平均滞在時間（分）。データがない場合は0
     */
    calculateStudentAverage(
        logs: EntryExitLog[],
        studentName: string,
        referenceTime: Date = new Date()
    ): number {
        const referenceJst = toJst(referenceTime);
        const sevenDaysAgo = new Date(referenceJst);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const studentLogs = logs.filter((log) => {
            if (log.name !== studentName) return false;
            if (!log.exitTime) return false;

            const entryJst = toJst(new Date(log.entryTime));
            return entryJst >= sevenDaysAgo && entryJst < referenceJst;
        });

        if (studentLogs.length === 0) return 0;

        const totalMinutes = studentLogs.reduce((sum, log) => {
            return sum + calculateSingleLogDuration(log);
        }, 0);

        return Math.floor(totalMinutes / studentLogs.length);
    }

    /**
     * 全生徒の過去7日間の平均滞在時間を計算（フォールバック用）
     * @returns 平均滞在時間（分）。データがない場合はデフォルト値
     */
    calculateGlobalAverage(
        logs: EntryExitLog[],
        referenceTime: Date = new Date()
    ): number {
        const referenceJst = toJst(referenceTime);
        const sevenDaysAgo = new Date(referenceJst);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const validLogs = logs.filter((log) => {
            if (!log.exitTime) return false;

            const entryJst = toJst(new Date(log.entryTime));
            return entryJst >= sevenDaysAgo && entryJst < referenceJst;
        });

        if (validLogs.length === 0) return DEFAULT_DURATION_MINUTES;

        const totalMinutes = validLogs.reduce((sum, log) => {
            return sum + calculateSingleLogDuration(log);
        }, 0);

        return Math.floor(totalMinutes / validLogs.length);
    }

    /**
     * 補完する退室時刻を計算
     * @param entryTime 入室時刻
     * @param averageMinutes 平均滞在時間（分）
     * @returns 補完された退室時刻（上限: 22:00 JST）
     */
    calculateFilledExitTime(entryTime: Date, averageMinutes: number): Date {
        const entryJst = toJst(entryTime);
        const entryHour = entryJst.getHours();

        // 22時以降の入室は入室+1時間を返す（稀なケース）
        if (entryHour >= CLOSING_HOUR_JST) {
            return new Date(entryTime.getTime() + 60 * 60 * 1000);
        }

        // 入室時刻 + 平均滞在時間
        const exitTime = new Date(entryTime.getTime() + averageMinutes * 60 * 1000);
        const exitJst = toJst(exitTime);

        // 22:00 JST を超える場合はクリップ
        const closingTime = new Date(entryJst);
        closingTime.setHours(CLOSING_HOUR_JST, 0, 0, 0);

        if (exitJst > closingTime) {
            // closingTime を UTC に変換して返す
            const closingUtc = new Date(
                closingTime.getTime() -
                    (closingTime.getTimezoneOffset() - entryJst.getTimezoneOffset()) * 60 * 1000
            );
            // JSTの22:00をUTCに変換（JST = UTC+9）
            const jst22InUtc = new Date(entryTime);
            jst22InUtc.setUTCHours(13, 0, 0, 0); // 22:00 JST = 13:00 UTC
            return jst22InUtc;
        }

        return exitTime;
    }

    /**
     * LINE通知メッセージを生成
     */
    buildNotificationMessage(place: string): string {
        const buildingName = BUILDING_NAMES[place] || place;
        return `[自動]退室記録忘れのお知らせ

本日の${buildingName}の退室時にカードをかざすのを忘れていたようです。
明日以降は退室時のカードタッチを忘れずにお願いします。`;
    }

    /**
     * メイン処理: 未退室ログを補完し、LINE通知を送信
     */
    async fillAndNotify(): Promise<FillResult> {
        const result: FillResult = {
            filled: 0,
            notified: 0,
            errors: [],
        };

        try {
            // 1. 当日の未退室ログを取得
            const unfilledLogs = await this.getTodayUnfilledLogs();

            if (unfilledLogs.length === 0) {
                console.log('[ExitTimeFillService] No unfilled logs found for today.');
                return result;
            }

            // 2. 過去7日間のログを取得（平均計算用）
            const allLogs = await this.occupancyRepo.findAllLogs();

            // 3. 生徒情報を取得（LINE通知用）
            const students = await this.studentRepo.findAll();
            const studentByName = new Map(
                Object.values(students).map((s) => [s.name, s])
            );

            // 4. 全体平均を計算（フォールバック用）
            const globalAverage = this.calculateGlobalAverage(allLogs);

            // 5. 各ログを処理
            for (const { log, rowIndex } of unfilledLogs) {
                try {
                    // 平均滞在時間を計算
                    let averageMinutes = this.calculateStudentAverage(allLogs, log.name);
                    if (averageMinutes === 0) {
                        averageMinutes = globalAverage;
                    }

                    // 退室時刻を計算
                    const entryTime = new Date(log.entryTime);
                    const exitTime = this.calculateFilledExitTime(entryTime, averageMinutes);

                    // Google Sheets に書き込み
                    await this.occupancyRepo.updateExitTime(rowIndex, exitTime.toISOString());
                    result.filled++;

                    console.log(
                        `[ExitTimeFillService] Filled exitTime for ${log.name}: ${exitTime.toISOString()}`
                    );

                    // LINE通知を送信
                    const student = studentByName.get(log.name);
                    if (student?.lineId) {
                        const message = this.buildNotificationMessage(log.place);
                        await lineService.pushMessage(student.lineId, message);
                        result.notified++;
                        console.log(
                            `[ExitTimeFillService] Sent notification to ${log.name}`
                        );
                    } else {
                        console.log(
                            `[ExitTimeFillService] Skipped notification for ${log.name} (no lineId)`
                        );
                    }
                } catch (error) {
                    result.errors.push(`${log.name}: ${extractErrorMessage(error)}`);
                    console.error(
                        `[ExitTimeFillService] Error processing ${log.name}:`,
                        error
                    );
                }
            }

            return result;
        } catch (error) {
            result.errors.push(extractErrorMessage(error));
            console.error('[ExitTimeFillService] Fatal error:', error);
            return result;
        }
    }

    /**
     * JST日付を YYYY-MM-DD 形式で返す
     */
    private formatDateJst(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
}
