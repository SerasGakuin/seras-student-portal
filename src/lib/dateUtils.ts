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
