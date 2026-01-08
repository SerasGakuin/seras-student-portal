
export interface EntryExitLog {
    entryTime: string; // ISO string
    exitTime: string | null; // ISO string or null
    place: string; // "1" (Main) or "2" (2nd Building)
    name: string;
}

/**
 * 行インデックス付きの入退室ログ
 * Google Sheets への書き込み時に行番号を特定するため使用
 */
export interface EntryExitLogWithIndex extends EntryExitLog {
    rowIndex: number; // 0-indexed (スプレッドシートではA2が rowIndex=0)
}

export interface IOccupancyRepository {
    /**
     * Retrieve all entry/exit logs.
     * @returns Promise<EntryExitLog[]> A list of all logs.
     */
    findAllLogs(): Promise<EntryExitLog[]>;

    /**
     * Retrieve all entry/exit logs with row indices.
     * @returns Promise<EntryExitLogWithIndex[]> A list of all logs with row indices.
     */
    findAllLogsWithIndex(): Promise<EntryExitLogWithIndex[]>;

    /**
     * Retrieve logs for a specific student name.
     * @param name Name of the student
     */
    findLogsByName(name: string): Promise<EntryExitLog[]>;

    /**
     * Update the exit time for a specific log entry.
     * @param rowIndex The row index (0-indexed, where 0 = row 2 in spreadsheet)
     * @param exitTime The exit time to set (ISO string)
     */
    updateExitTime(rowIndex: number, exitTime: string): Promise<void>;
}
