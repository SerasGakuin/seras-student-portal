/**
 * 表示フォーマットユーティリティ
 * 分数→時間表示の変換を共通化（DRY原則）
 */

/**
 * 分数を時間・分に分解した結果
 */
export interface MinutesBreakdown {
    hours: number;
    mins: number;
}

/**
 * 分数を時間・分に分解する
 *
 * JSXで時間と分を別々にスタイリングする場合に使用。
 * 文字列が必要な場合は formatMinutesHm() を使う。
 *
 * @example
 * const { hours, mins } = splitMinutes(150); // { hours: 2, mins: 30 }
 */
export function splitMinutes(totalMinutes: number): MinutesBreakdown {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return { hours, mins };
}

/**
 * 分数を "Xh Ym" 形式の文字列に変換
 *
 * tooltip、title属性など、プレーンテキストが必要な場面用。
 *
 * @example
 * formatMinutesHm(150)  // "2h 30m"
 * formatMinutesHm(120)  // "2h 0m"
 * formatMinutesHm(0)    // "0h 0m"
 */
export function formatMinutesHm(totalMinutes: number): string {
    const { hours, mins } = splitMinutes(totalMinutes);
    return `${hours}h ${mins}m`;
}

/**
 * 分数を "Xh" 形式の文字列に変換（時間のみ、分は切り捨て）
 *
 * バッジの表示値など、簡潔な表記が必要な場面用。
 *
 * @example
 * formatMinutesHoursOnly(150) // "2h"
 * formatMinutesHoursOnly(30)  // "0h"
 */
export function formatMinutesHoursOnly(totalMinutes: number): string {
    const { hours } = splitMinutes(totalMinutes);
    return `${hours}h`;
}
