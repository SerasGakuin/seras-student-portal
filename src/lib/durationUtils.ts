/**
 * 滞在時間計算ユーティリティ
 * 入退室ログからの滞在時間計算、オーバーラップのマージ処理を共通化
 */

import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';

/**
 * 時間区間を表すインターフェース
 */
export interface TimeInterval {
    start: number;  // ミリ秒タイムスタンプ
    end: number;    // ミリ秒タイムスタンプ
}

/**
 * 退室時刻の補完ロジック
 * - 退室時刻がある場合: そのまま使用
 * - 退室時刻がない & 入室から12時間未満: 現在時刻を仮の退室時刻
 * - 退室時刻がない & 入室から12時間以上: MIN(入室+4時間, 当日22:00)で補完
 */
export function getEffectiveExitTime(log: EntryExitLog): Date {
    const entry = new Date(log.entryTime);
    if (isNaN(entry.getTime())) return entry;

    if (log.exitTime) {
        const parsed = new Date(log.exitTime);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    const now = new Date();
    const diffHours = (now.getTime() - entry.getTime()) / (1000 * 60 * 60);

    if (diffHours < 12) {
        return now;
    } else {
        const closeTime = new Date(entry);
        closeTime.setHours(22, 0, 0, 0);
        const fourHoursLater = new Date(entry.getTime() + 4 * 60 * 60 * 1000);

        if (fourHoursLater < closeTime) {
            return fourHoursLater;
        } else {
            return closeTime;
        }
    }
}

/**
 * 重複する時間区間をマージし、合計時間（分）を返す
 */
export function mergeIntervalsAndSum(intervals: TimeInterval[]): number {
    if (intervals.length === 0) return 0;

    // 開始時刻でソート
    intervals.sort((a, b) => a.start - b.start);

    let totalDurationMs = 0;
    let currentStart = intervals[0].start;
    let currentEnd = intervals[0].end;

    for (let i = 1; i < intervals.length; i++) {
        const interval = intervals[i];

        if (interval.start < currentEnd) {
            // オーバーラップ: 終了時刻を延長
            if (interval.end > currentEnd) {
                currentEnd = interval.end;
            }
        } else {
            // オーバーラップなし: 現在の区間を確定して次へ
            totalDurationMs += (currentEnd - currentStart);
            currentStart = interval.start;
            currentEnd = interval.end;
        }
    }

    // 最後の区間を加算
    totalDurationMs += (currentEnd - currentStart);

    return Math.floor(totalDurationMs / (1000 * 60));
}

/**
 * 入退室ログから実効滞在時間（分）を計算
 * オーバーラップする区間はマージして重複カウントを防止
 */
export function calculateEffectiveDuration(logs: EntryExitLog[]): number {
    if (logs.length === 0) return 0;

    const intervals = logs.map(log => {
        const start = new Date(log.entryTime).getTime();
        const end = getEffectiveExitTime(log).getTime();
        return { start, end };
    }).filter(i => !isNaN(i.start) && !isNaN(i.end) && i.end > i.start);

    return mergeIntervalsAndSum(intervals);
}

/**
 * 指定時間帯内での滞在時間を計算
 * 例: 4:00-9:00 の間の滞在時間（EARLY_BIRD判定用）
 *
 * @param logs 入退室ログ
 * @param rangeStartHour 開始時刻（時）
 * @param rangeEndHour 終了時刻（時）
 * @param toJst JST変換関数
 */
export function calculateDurationInTimeRange(
    logs: EntryExitLog[],
    rangeStartHour: number,
    rangeEndHour: number,
    toJst: (d: Date) => Date
): number {
    if (logs.length === 0) return 0;

    const intervals: TimeInterval[] = [];

    for (const log of logs) {
        const entry = new Date(log.entryTime);
        const exit = getEffectiveExitTime(log);

        if (isNaN(entry.getTime()) || isNaN(exit.getTime()) || exit <= entry) {
            continue;
        }

        const entryJst = toJst(entry);
        const exitJst = toJst(exit);

        // 入室日の時間帯境界を作成
        const rangeStart = new Date(entryJst);
        rangeStart.setHours(rangeStartHour, 0, 0, 0);

        const rangeEnd = new Date(entryJst);
        rangeEnd.setHours(rangeEndHour, 0, 0, 0);

        // 時間帯にクリッピング
        const clippedStart = Math.max(entryJst.getTime(), rangeStart.getTime());
        const clippedEnd = Math.min(exitJst.getTime(), rangeEnd.getTime());

        if (clippedEnd > clippedStart) {
            intervals.push({ start: clippedStart, end: clippedEnd });
        }
    }

    return mergeIntervalsAndSum(intervals);
}

/**
 * 単一ログの滞在時間（分）を計算
 */
export function calculateSingleLogDuration(log: EntryExitLog): number {
    const entry = new Date(log.entryTime);
    const exit = getEffectiveExitTime(log);
    const diffMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60);
    return Math.max(0, Math.floor(diffMinutes));
}
