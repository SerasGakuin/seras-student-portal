import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';

export type BadgeType = 'HEAVY_USER' | 'EARLY_BIRD' | 'NIGHT_OWL' | 'CONSISTENT' | 'MARATHON' | 'RISING_STAR';

export interface Badge {
    type: BadgeType;
    rank: number; // 1, 2, 3
    value?: number | string; // e.g. "15h", "5 times"
}

export type StudentBadgesMap = Record<string, Badge[]>;

// Maps student name to their rank (1-indexed)
export type StudentRankingsMap = Record<string, number>;

export interface UnifiedWeeklyBadges {
    exam: StudentBadgesMap;
    general: StudentBadgesMap;
    totalExamStudents: number;
    totalGeneralStudents: number;
    // Full rankings based on total study time (all students, not just top 3)
    examRankings: StudentRankingsMap;
    generalRankings: StudentRankingsMap;
}

// DI: Allow injecting repository
// DI: Allow injecting repository
import { IOccupancyRepository } from '@/repositories/interfaces/IOccupancyRepository';
import { IStudentRepository } from '@/repositories/interfaces/IStudentRepository';

export class BadgeService {

    private occupancyRepo: IOccupancyRepository;
    private studentRepo: IStudentRepository;

    constructor(
        occupancyRepo?: IOccupancyRepository,
        studentRepo?: IStudentRepository
    ) {
        this.occupancyRepo = occupancyRepo || new GoogleSheetOccupancyRepository();
        this.studentRepo = studentRepo || new GoogleSheetStudentRepository();
    }

    async getWeeklyBadges(targetDate: Date = new Date()): Promise<UnifiedWeeklyBadges> {
        // Rolling 7-day window based on JST
        // Convert targetDate (server time) to JST-shifted Date
        // "JST-shifted Date" means a Date object where GetHours() returns JST hours.
        // e.g. Real JST 09:00 -> Date object showing 09:00 (which is actually 09:00 UTC internally if created via string parsing without offset)
        const toJst = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

        const targetJst = toJst(targetDate);

        // End date: Yesterday at 23:59:59 (JST)
        const endDateJst = new Date(targetJst);
        endDateJst.setDate(endDateJst.getDate() - 1);
        endDateJst.setHours(23, 59, 59, 999);

        // Start date: 7 days total (yesterday + 6 days before)
        const startDateJst = new Date(endDateJst);
        startDateJst.setDate(endDateJst.getDate() - 6);
        startDateJst.setHours(0, 0, 0, 0);

        // Previous period for Rising Star comparison
        const prevEndDateJst = new Date(startDateJst);
        prevEndDateJst.setDate(startDateJst.getDate() - 1);
        prevEndDateJst.setHours(23, 59, 59, 999);

        const prevStartDateJst = new Date(prevEndDateJst);
        prevStartDateJst.setDate(prevEndDateJst.getDate() - 6);
        prevStartDateJst.setHours(0, 0, 0, 0);

        console.log(`[BadgeService - JST] Period: ${startDateJst.toLocaleString()} - ${endDateJst.toLocaleString()}`);

        const logs = await this.occupancyRepo.findAllLogs();
        const students = await this.studentRepo.findAll();

        // 2. Filter Logs using JST-shifted Dates
        const weekLogs = logs.filter(l => {
            const entryJst = toJst(new Date(l.entryTime));
            return entryJst >= startDateJst && entryJst <= endDateJst;
        });

        const prevWeekLogs = logs.filter(l => {
            const entryJst = toJst(new Date(l.entryTime));
            return entryJst >= prevStartDateJst && entryJst <= prevEndDateJst;
        });

        // 3. Group Students (only active students with status '在塾')
        const normalizeName = (name: string) => name.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

        const examGroup: string[] = [];
        const generalGroup: string[] = [];

        Object.values(students).forEach(s => {
            if (!s.grade || s.status !== '在塾') return;
            if (s.grade === '高3' || s.grade === '既卒') {
                examGroup.push(normalizeName(s.name));
            } else {
                generalGroup.push(normalizeName(s.name));
            }
        });

        // 4. Calculate Stats per Student
        const stats = new Map<string, StudentWeeklyStats>();
        Object.values(students).forEach(s => {
            stats.set(normalizeName(s.name), {
                name: s.name,
                totalDuration: 0,
                prevTotalDuration: 0,
                morningDuration: 0,
                nightDuration: 0,
                visitDays: new Set(),
                visitCount: 0
            });
        });

        // Group logs by student for correct duration calculation
        const studentLogsMap = new Map<string, EntryExitLog[]>();
        weekLogs.forEach(log => {
            const key = normalizeName(log.name);
            if (!stats.has(key)) return;

            if (!studentLogsMap.has(key)) {
                studentLogsMap.set(key, []);
            }
            studentLogsMap.get(key)!.push(log);
        });

        // Calculate Stats based on grouped logs
        studentLogsMap.forEach((studentLogs, key) => {
            const s = stats.get(key)!;

            // 1. Total Duration (with overlap merging)
            s.totalDuration = this.calculateEffectiveDuration(studentLogs);
            s.visitCount = studentLogs.length;

            // 2. Morning Duration: 4:00-9:00 JST (with overlap merging)
            s.morningDuration = this.calculateDurationInTimeRange(studentLogs, 4, 9, toJst);

            // 3. Night Duration: 20:00-24:00 JST (with overlap merging)
            s.nightDuration = this.calculateDurationInTimeRange(studentLogs, 20, 24, toJst);

            // 4. Visit Days (unique dates)
            studentLogs.forEach(log => {
                const entry = new Date(log.entryTime);
                const entryJst = toJst(entry);
                const dateStr = `${entryJst.getFullYear()}/${entryJst.getMonth() + 1}/${entryJst.getDate()}`;
                s.visitDays.add(dateStr);
            });
        });

        // Process Previous Week (for Growth / RISING_STAR)
        const prevLogsMap = new Map<string, EntryExitLog[]>();
        prevWeekLogs.forEach(log => {
            const key = normalizeName(log.name);
            if (!stats.has(key)) return;
            if (!prevLogsMap.has(key)) prevLogsMap.set(key, []);
            prevLogsMap.get(key)!.push(log);
        });

        prevLogsMap.forEach((logs, key) => {
            const s = stats.get(key)!;
            s.prevTotalDuration = this.calculateEffectiveDuration(logs);
        });

        // 5. Rank and Award Badges
        const examBadges: StudentBadgesMap = {};
        const generalBadges: StudentBadgesMap = {};

        this.awardBadgesForGroup(examGroup, stats, examBadges);
        this.awardBadgesForGroup(generalGroup, stats, generalBadges);

        const examRankings = this.calculateFullRankings(examGroup, stats);
        const generalRankings = this.calculateFullRankings(generalGroup, stats);

        return {
            exam: examBadges,
            general: generalBadges,
            totalExamStudents: examGroup.length,
            totalGeneralStudents: generalGroup.length,
            examRankings,
            generalRankings
        };
    }

    private calculateFullRankings(groupNames: string[], stats: Map<string, StudentWeeklyStats>): StudentRankingsMap {
        const rankings: StudentRankingsMap = {};

        // Sort by total duration descending
        const sorted = groupNames
            .map(name => ({ name, stats: stats.get(name) }))
            .filter(item => item.stats)
            .sort((a, b) => (b.stats!.totalDuration) - (a.stats!.totalDuration));

        sorted.forEach((item, index) => {
            rankings[item.stats!.name] = index + 1; // 1-indexed rank
        });

        return rankings;
    }

    private awardBadgesForGroup(groupNames: string[], stats: Map<string, StudentWeeklyStats>, result: StudentBadgesMap) {
        // Helper to sort and pick top 3
        const processRanking = (
            comparator: (a: StudentWeeklyStats, b: StudentWeeklyStats) => number,
            type: BadgeType,
            displayValue: (s: StudentWeeklyStats) => string | number,
            threshold: (s: StudentWeeklyStats) => boolean = () => true
        ) => {
            const candidates = groupNames
                .map(name => stats.get(name)!)
                .filter(s => s && threshold(s))
                .sort(comparator);

            candidates.slice(0, 3).forEach((s, index) => {
                if (!result[s.name]) result[s.name] = [];
                result[s.name].push({
                    type,
                    rank: index + 1,
                    value: displayValue(s)
                });
            });
        };

        // 1. HEAVY_USER (Total Duration)
        processRanking((a, b) => b.totalDuration - a.totalDuration, 'HEAVY_USER', s => Math.floor(s.totalDuration / 60) + 'h', s => s.totalDuration > 0);

        // 2. EARLY_BIRD (Morning Duration)
        processRanking((a, b) => b.morningDuration - a.morningDuration, 'EARLY_BIRD', s => Math.floor(s.morningDuration) + 'm', s => s.morningDuration > 30); // Min 30 mins

        // 3. NIGHT_OWL (Night Duration)
        processRanking((a, b) => b.nightDuration - a.nightDuration, 'NIGHT_OWL', s => Math.floor(s.nightDuration / 60) + 'h', s => s.nightDuration > 60); // Min 1 hour

        // 4. CONSISTENT (Visit Days)
        processRanking((a, b) => b.visitDays.size - a.visitDays.size, 'CONSISTENT', s => s.visitDays.size + 'd', s => s.visitDays.size >= 3);

        // 5. MARATHON (Avg Duration / Day)
        processRanking((a, b) => {
            const avgA = a.visitDays.size ? a.totalDuration / a.visitDays.size : 0;
            const avgB = b.visitDays.size ? b.totalDuration / b.visitDays.size : 0;
            return avgB - avgA;
        }, 'MARATHON', s => {
            const avg = s.visitDays.size ? Math.floor(s.totalDuration / s.visitDays.size / 60) : 0;
            return avg + 'h/d';
        }, s => s.totalDuration > 0);

        // 6. RISING_STAR (Growth)
        processRanking((a, b) => (b.totalDuration - b.prevTotalDuration) - (a.totalDuration - a.prevTotalDuration), 'RISING_STAR', s => {
            const diff = Math.floor((s.totalDuration - s.prevTotalDuration) / 60);
            return '+' + diff + 'h';
        }, s => (s.totalDuration - s.prevTotalDuration) > 120); // Min 2 hours growth
    }

    // --- Duration Calculation Utilities ---

    /**
     * Determine the effective exit time for a log, applying auto-close logic if missing.
     */
    private getEffectiveExitTime(log: EntryExitLog): Date {
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
     * Merge overlapping intervals and return total duration in minutes.
     * @param intervals Array of { start: number, end: number } (timestamps in ms)
     */
    private mergeIntervalsAndSum(intervals: Array<{ start: number; end: number }>): number {
        if (intervals.length === 0) return 0;

        // Sort by start time
        intervals.sort((a, b) => a.start - b.start);

        let totalDurationMs = 0;
        let currentStart = intervals[0].start;
        let currentEnd = intervals[0].end;

        for (let i = 1; i < intervals.length; i++) {
            const interval = intervals[i];

            if (interval.start < currentEnd) {
                // Overlap: extend end if needed
                if (interval.end > currentEnd) {
                    currentEnd = interval.end;
                }
            } else {
                // No overlap: close current and start new
                totalDurationMs += (currentEnd - currentStart);
                currentStart = interval.start;
                currentEnd = interval.end;
            }
        }

        // Add last interval
        totalDurationMs += (currentEnd - currentStart);

        return Math.floor(totalDurationMs / (1000 * 60));
    }

    /**
     * Calculate effective duration in minutes by merging overlapping intervals.
     */
    private calculateEffectiveDuration(logs: EntryExitLog[]): number {
        if (logs.length === 0) return 0;

        const intervals = logs.map(log => {
            const start = new Date(log.entryTime).getTime();
            const end = this.getEffectiveExitTime(log).getTime();
            return { start, end };
        }).filter(i => !isNaN(i.start) && !isNaN(i.end) && i.end > i.start);

        return this.mergeIntervalsAndSum(intervals);
    }

    /**
     * Calculate duration within a specific time range (e.g., 4:00-9:00 for morning).
     * Clips each log's interval to the time range, then merges overlapping intervals.
     * @param logs Entry/exit logs for a single student
     * @param rangeStartHour Start hour of the time range (inclusive)
     * @param rangeEndHour End hour of the time range (exclusive)
     * @param toJst Function to convert Date to JST
     */
    private calculateDurationInTimeRange(
        logs: EntryExitLog[],
        rangeStartHour: number,
        rangeEndHour: number,
        toJst: (d: Date) => Date
    ): number {
        if (logs.length === 0) return 0;

        const intervals: Array<{ start: number; end: number }> = [];

        for (const log of logs) {
            const entry = new Date(log.entryTime);
            const exit = this.getEffectiveExitTime(log);

            if (isNaN(entry.getTime()) || isNaN(exit.getTime()) || exit <= entry) {
                continue;
            }

            const entryJst = toJst(entry);
            const exitJst = toJst(exit);

            // Create range boundaries for the entry date
            const rangeStart = new Date(entryJst);
            rangeStart.setHours(rangeStartHour, 0, 0, 0);

            const rangeEnd = new Date(entryJst);
            rangeEnd.setHours(rangeEndHour, 0, 0, 0);

            // Clip interval to the time range
            const clippedStart = Math.max(entryJst.getTime(), rangeStart.getTime());
            const clippedEnd = Math.min(exitJst.getTime(), rangeEnd.getTime());

            if (clippedEnd > clippedStart) {
                intervals.push({ start: clippedStart, end: clippedEnd });
            }
        }

        return this.mergeIntervalsAndSum(intervals);
    }
}

interface StudentWeeklyStats {
    name: string;
    totalDuration: number;
    prevTotalDuration: number;
    morningDuration: number;
    nightDuration: number;
    visitDays: Set<string>;
    visitCount: number;
}
