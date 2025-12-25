
export interface EntryExitLog {
    entryTime: string; // ISO string
    exitTime: string | null; // ISO string or null
    place: string; // "1" (Main) or "2" (2nd Building)
    name: string;
}

export interface IOccupancyRepository {
    /**
     * Retrieve all entry/exit logs.
     * @returns Promise<EntryExitLog[]> A list of all logs.
     */
    findAllLogs(): Promise<EntryExitLog[]>;

    /**
     * Retrieve logs for a specific student name.
     * @param name Name of the student
     */
    findLogsByName(name: string): Promise<EntryExitLog[]>;
}
