/**
 * 日付・時刻ユーティリティ
 * JST（日本標準時）での日付処理を一元化
 */

/**
 * DateオブジェクトをJSTに変換
 */
export function toJst(d: Date): Date {
    return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

/**
 * DateオブジェクトをJSTのtoString形式で出力
 * Google Sheets の既存データと同じ形式で書き込むために使用
 *
 * @example
 * toJstString(new Date('2026-01-08T13:00:00.000Z'))
 * // => "Thu Jan 08 2026 22:00:00 GMT+0900 (GMT+09:00)"
 */
export function toJstString(d: Date): string {
    const jst = toJst(d);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = dayNames[jst.getDay()];
    const month = monthNames[jst.getMonth()];
    const date = String(jst.getDate()).padStart(2, '0');
    const year = jst.getFullYear();
    const hours = String(jst.getHours()).padStart(2, '0');
    const minutes = String(jst.getMinutes()).padStart(2, '0');
    const seconds = String(jst.getSeconds()).padStart(2, '0');

    return `${day} ${month} ${date} ${year} ${hours}:${minutes}:${seconds} GMT+0900 (GMT+09:00)`;
}

/**
 * DateオブジェクトをJSTの日付文字列に変換 (YYYY/M/D形式)
 */
export function toJstDateString(d: Date): string {
    const jst = toJst(d);
    return `${jst.getFullYear()}/${jst.getMonth() + 1}/${jst.getDate()}`;
}

/**
 * DateオブジェクトをJSTの年月文字列に変換 (YYYY年MM月形式)
 */
export function toJstMonthString(d: Date): string {
    const jst = toJst(d);
    const yyyy = jst.getFullYear();
    const mm = String(jst.getMonth() + 1).padStart(2, '0');
    return `${yyyy}年${mm}月`;
}

/**
 * JSTでのタイムスタンプ文字列を取得 (YYYY/MM/DD HH:mm:ss形式)
 */
export function getJstTimestamp(): string {
    return new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/**
 * JSTでの現在の曜日を取得 (0=日曜, 6=土曜)
 */
export function getJstDayOfWeek(): number {
    const jstDate = toJst(new Date());
    return jstDate.getDay();
}

/**
 * 入室時刻が今日（JST基準）かどうかを判定
 */
export function isEntryToday(entryTimeRaw: string): boolean {
    if (!entryTimeRaw) return false;
    try {
        const entryDate = new Date(entryTimeRaw);
        if (isNaN(entryDate.getTime())) return false;
        const jstNow = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
        const jstEntry = entryDate.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
        return jstNow === jstEntry;
    } catch {
        return false;
    }
}

/**
 * 時刻文字列をHH:mm形式にフォーマット（JST）
 */
export function formatTimeJst(dateString: string): string {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: "Asia/Tokyo"
        });
    } catch {
        return dateString;
    }
}

/**
 * 日の開始時刻を設定（00:00:00.000）
 *
 * @param date 対象の日付
 * @returns 同じ日付の00:00:00.000に設定された新しいDateオブジェクト
 */
export function setStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * 日の終了時刻を設定（23:59:59.999）
 *
 * @param date 対象の日付
 * @returns 同じ日付の23:59:59.999に設定された新しいDateオブジェクト
 */
export function setEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

// IOccupancyRepositoryの型をインポートせずに、必要最小限の型を定義
interface LogWithEntryTime {
    entryTime: string;
}

/**
 * 日付範囲でログをフィルタリング
 *
 * entryTimeが指定された日付範囲内にあるログのみを返す。
 *
 * @param logs フィルタ対象のログ配列
 * @param start 開始日時（この日時以降のログを含む）
 * @param end 終了日時（この日時以前のログを含む）
 * @returns フィルタされたログ配列
 */
export function filterLogsByDateRange<T extends LogWithEntryTime>(
    logs: T[],
    start: Date,
    end: Date
): T[] {
    const startTime = start.getTime();
    const endTime = end.getTime();

    return logs.filter((log) => {
        const entryTime = new Date(log.entryTime).getTime();
        return entryTime >= startTime && entryTime <= endTime;
    });
}

// ============================================
// 週間ユーティリティ関数（固定週間方式用）
// ============================================

/**
 * 指定した日付が属する「固定週」の開始日（月曜00:00:00 JST）を取得
 *
 * @param date - 対象日付
 * @returns その週の月曜日00:00:00（JST）
 */
export function getWeekStartJst(date: Date): Date {
    const jst = toJst(date);
    const dayOfWeek = jst.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜

    // 月曜日を週の開始とする
    // 日曜(0)の場合は-6日、月曜(1)の場合は0日、火曜(2)の場合は-1日、...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(jst);
    monday.setDate(jst.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);

    return monday;
}

/**
 * 指定した日付が属する「固定週」の終了日（日曜23:59:59 JST）を取得
 *
 * @param date - 対象日付
 * @returns その週の日曜日23:59:59.999（JST）
 */
export function getWeekEndJst(date: Date): Date {
    const monday = getWeekStartJst(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
}

/**
 * 「先週」の期間を取得（月曜00:00 〜 日曜23:59:59 JST）
 *
 * @param date - 基準日（通常は「今日」）
 * @returns { start: Date, end: Date }
 */
export function getLastWeekJst(date: Date): { start: Date; end: Date } {
    const currentWeekStart = getWeekStartJst(date);

    // 先週の月曜日 = 今週の月曜日 - 7日
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);

    return { start: lastWeekStart, end: lastWeekEnd };
}

/**
 * 「先々週」の期間を取得（月曜00:00 〜 日曜23:59:59 JST）
 *
 * @param date - 基準日
 * @returns { start: Date, end: Date }
 */
export function getWeekBeforeLastJst(date: Date): { start: Date; end: Date } {
    const currentWeekStart = getWeekStartJst(date);

    // 先々週の月曜日 = 今週の月曜日 - 14日
    const weekBeforeLastStart = new Date(currentWeekStart);
    weekBeforeLastStart.setDate(currentWeekStart.getDate() - 14);

    const weekBeforeLastEnd = new Date(weekBeforeLastStart);
    weekBeforeLastEnd.setDate(weekBeforeLastStart.getDate() + 6);
    weekBeforeLastEnd.setHours(23, 59, 59, 999);

    return { start: weekBeforeLastStart, end: weekBeforeLastEnd };
}

/**
 * 週の情報を人間が読める形式で取得
 *
 * @param start - 週の開始日
 * @param end - 週の終了日
 * @returns "1/13(月) - 1/19(日)" 形式の文字列
 */
export function formatWeekPeriod(start: Date, end: Date): string {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    const startMonth = start.getMonth() + 1;
    const startDate = start.getDate();
    const startDay = dayNames[start.getDay()];

    const endMonth = end.getMonth() + 1;
    const endDate = end.getDate();
    const endDay = dayNames[end.getDay()];

    return `${startMonth}/${startDate}(${startDay}) - ${endMonth}/${endDate}(${endDay})`;
}

// ============================================
// 月間ユーティリティ関数
// ============================================

/**
 * "YYYY-MM" 形式の文字列から JST での月初〜月末の範囲を返す
 *
 * @param month "YYYY-MM" 形式（例: "2026-02"）
 * @returns { start: 月初 00:00:00 JST, end: 月末 23:59:59.999 JST }
 */
export function getMonthRangeJst(month: string): { start: Date; end: Date } {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monthStr, 10); // 1-12

    // JST 月初 00:00:00 = UTC (year, mon-1, 1) - 9時間
    const start = new Date(Date.UTC(year, mon - 1, 1, -9, 0, 0, 0));

    // JST 翌月初 00:00:00 の1ms前 = 月末 23:59:59.999 JST
    const nextMonthStart = new Date(Date.UTC(year, mon, 1, -9, 0, 0, 0));
    const end = new Date(nextMonthStart.getTime() - 1);

    return { start, end };
}

// ============================================
// 通塾日数ユーティリティ（DRY共通化）
// ============================================

/**
 * 入退室ログからJST基準のユニークな通塾日数をカウントする
 *
 * rankingAnalysisService, dashboardService 等で重複していた
 * 通塾日数カウントロジックを共通化。
 *
 * @param logs entryTime プロパティを持つログ配列
 * @returns ユニーク通塾日数
 */
export function countUniqueVisitDays(logs: LogWithEntryTime[]): number {
    return getUniqueVisitDaySet(logs).size;
}

/**
 * 入退室ログからJST基準のユニーク通塾日のSetを取得する
 *
 * badgeService の visitDays (Set<string>) をそのまま使う場合に利用。
 * 日付文字列は toJstDateString() 形式 ("YYYY/M/D")。
 *
 * @param logs entryTime プロパティを持つログ配列
 * @returns ユニーク日付文字列のSet
 */
export function getUniqueVisitDaySet(logs: LogWithEntryTime[]): Set<string> {
    const uniqueDays = new Set<string>();
    for (const log of logs) {
        uniqueDays.add(toJstDateString(new Date(log.entryTime)));
    }
    return uniqueDays;
}
