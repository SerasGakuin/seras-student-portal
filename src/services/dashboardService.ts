
import { Student } from '@/types';
import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';

// Stats Interfaces
export interface StudentStats {
    name: string;
    grade: string | null;
    totalDurationMinutes: number;
    visitCount: number;
    lastVisit: string | null;
}

export interface MetricWithTrend {
    value: number;
    trend: number; // percentage change vs previous period
}

export interface DashboardSummary {
    totalDuration: MetricWithTrend;
    totalVisits: MetricWithTrend;
    topStudent: StudentStats | null;
    ranking: StudentStats[];
    period: {
        from: string;
        to: string;
    };
    // New Fields for Visualization
    availableMonths: string[]; // e.g. ['2024-11', '2024-12']
    periodDays: number; // Total days in the selected period (for attendance rate)
    history: {
        date: string;
        [studentName: string]: number | string; // Cumulative minutes
    }[];
}

const occupancyRepo = new GoogleSheetOccupancyRepository();
const studentRepo = new GoogleSheetStudentRepository();

export class DashboardService {

    /**
     * Get aggregated Dashboard Stats for a specific period
     * Default: Current Month
     */
    async getDashboardStats(from?: Date, to?: Date, gradeFilter?: string): Promise<DashboardSummary> {
        // Default to current month if not specified
        const now = new Date();
        const startDate = from || new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = to || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Calculate Period Days (Start of day to End of day normalization for accurate count)
        const s = new Date(startDate); s.setHours(0, 0, 0, 0);
        const e = new Date(endDate); e.setHours(23, 59, 59, 999); // Ensure we cover the full last day
        // Add 1 to include the start day itself if difference is taken
        const periodDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate Previous Period (for trend)
        const durationTime = endDate.getTime() - startDate.getTime();
        const prevStartDate = new Date(startDate.getTime() - durationTime);
        // prevEndDate is implicitly new Date(startDate.getTime() - 1) for the aggregateStats call

        // Fetch ALL logs (Repository is cached, so cheap to re-filter in memory for now)
        // Optimization: In future, repo should accept date range.
        const logs = await occupancyRepo.findAllLogs();
        const studentRecord = await studentRepo.findAll(); // Fetch once

        // --- FILTERING START ---
        // 1. Determine eligible students based on Grade Filter
        let eligibleStudentNames: Set<string> | null = null;

        if (gradeFilter && gradeFilter !== 'ALL') {
            eligibleStudentNames = new Set();
            Object.values(studentRecord).forEach((s: Student) => {
                if (!s.grade) return;

                let isMatch = false;
                if (gradeFilter === 'HS') {
                    // HS = High School + High School Grads (often grouped) or just '高'
                    // Based on previous UI logic: HS includes '高' and '既卒'
                    isMatch = s.grade.includes('高') || s.grade.includes('既卒');
                } else if (gradeFilter === 'JHS') {
                    isMatch = s.grade.includes('中');
                } else if (gradeFilter === 'EXAM') {
                    // EXAM = High School 3 + Graduates
                    isMatch = s.grade === '高3' || s.grade === '既卒';
                } else {
                    // Exact match (e.g., '高3', '中1')
                    isMatch = s.grade === gradeFilter;
                }

                if (isMatch) {
                    eligibleStudentNames!.add(s.name);
                }
            });
        }

        // 2. Filter Logs based on eligible students
        // If eligibleStudentNames is null, we take all students (ALL)
        const relevantLogs = eligibleStudentNames
            ? logs.filter(l => l.name && eligibleStudentNames!.has(l.name))
            : logs;

        // --- FILTERING END ---

        // 3. Current Period Stats
        const currentStats = await this.aggregateStats(relevantLogs, startDate, endDate, studentRecord);

        // 4. Previous Period Stats (for Trend) where we apply SAME student filter
        // Note: aggregation internally filters by date range, but we pass pre-filtered logs by student
        const prevStats = await this.aggregateStats(relevantLogs, prevStartDate, new Date(startDate.getTime() - 1), studentRecord);

        // Calculate Trends
        const durationTrend = this.calculateTrend(currentStats.totalDuration, prevStats.totalDuration);
        const visitsTrend = this.calculateTrend(currentStats.totalVisits, prevStats.totalVisits);

        // 5. Available Months (Global Scan)
        const availableMonths = this.getAvailableMonths(logs);

        // 6. History Calculation (Daily Cumulative for Graph)
        // User requested ALL students, not just top 15.
        const allStudents = currentStats.ranking.map(s => s.name);
        const history = this.calculateHistory(relevantLogs, startDate, endDate, allStudents);

        return {
            totalDuration: {
                value: currentStats.totalDuration,
                trend: durationTrend
            },
            totalVisits: {
                value: currentStats.totalVisits,
                trend: visitsTrend
            },
            topStudent: currentStats.ranking.length > 0 ? currentStats.ranking[0] : null,
            ranking: currentStats.ranking,
            period: {
                from: startDate.toISOString(),
                to: endDate.toISOString()
            },
            availableMonths,
            periodDays,
            history
        };
    }

    private calculateTrend(current: number, prev: number): number {
        if (prev === 0) return current > 0 ? 100 : 0; // If prev 0, and current > 0, assume 100% growth (or distinct generic value)
        return Number(((current - prev) / prev * 100).toFixed(1));
    }

    private getAvailableMonths(logs: EntryExitLog[]): string[] {
        const months = new Set<string>();
        logs.forEach(log => {
            const d = new Date(log.entryTime);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                months.add(`${yyyy}年${mm}月`); // Format for UI: "2025年12月"
            }
        });
        // Sort DESC
        return Array.from(months).sort().reverse();
    }

    private calculateHistory(logs: EntryExitLog[], from: Date, to: Date, targetStudents: string[]) {
        // Create map of DateString -> { student: cumulative }
        const dailyMap = new Map<string, Record<string, number>>();
        const studentsSet = new Set(targetStudents);

        // Initialize timeline
        const timeline: string[] = [];
        const cursor = new Date(from);
        cursor.setHours(0, 0, 0, 0);

        const end = new Date(to);
        // Cap end date at Today (now) to avoid future flat lines
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const effectiveEnd = end > now ? now : end;

        while (cursor <= effectiveEnd) {
            const dateStr = `${cursor.getFullYear()}/${(cursor.getMonth() + 1)}/${cursor.getDate()}`;
            timeline.push(dateStr);
            dailyMap.set(dateStr, {});
            cursor.setDate(cursor.getDate() + 1);
        }

        // Aggregate daily study time
        // Need to iterate logs and assign to day
        // Optimization: Filter logs to range first (already done implicitly by logic below?)
        const rangeLogs = logs.filter(l => {
            const d = new Date(l.entryTime);
            return d >= from && d <= to && l.name && studentsSet.has(l.name);
        });

        // 1. Calculate Daily Totals
        const dailyTotals: Record<string, Record<string, number>> = {}; // date -> name -> minutes
        rangeLogs.forEach(log => {
            const d = new Date(log.entryTime);
            // Normalize to YYYY/M/D
            const dateStr = `${d.getFullYear()}/${(d.getMonth() + 1)}/${d.getDate()}`;
            if (!dailyTotals[dateStr]) dailyTotals[dateStr] = {};

            if (!dailyTotals[dateStr][log.name]) dailyTotals[dateStr][log.name] = 0;
            dailyTotals[dateStr][log.name] += this.calculateDurationMinutes(log);
        });

        // 2. Cumulative Sum over Timeline
        const result: { date: string;[key: string]: number | string }[] = [];
        const runningTotals: Record<string, number> = {};

        targetStudents.forEach(s => runningTotals[s] = 0);

        // Add "Start" point (Origin) where everyone is at 0
        // This ensures the graph starts from a zero baseline before the first actual date
        const startData: { date: string;[key: string]: number | string } = { date: 'Start' };
        targetStudents.forEach(s => startData[s] = 0);
        result.push(startData);

        for (const dateStr of timeline) {
            const dayData: { date: string;[key: string]: number | string } = { date: dateStr };
            const daysLog = dailyTotals[dateStr] || {};

            targetStudents.forEach(student => {
                const daily = daysLog[student] || 0;
                runningTotals[student] += daily;
                dayData[student] = Math.floor(runningTotals[student] / 60); // Store as Hours
            });
            result.push(dayData);
        }

        return result;
    }

    private async aggregateStats(
        logs: EntryExitLog[],
        from: Date,
        to: Date,
        studentMap: Record<string, Student>
    ): Promise<{ totalDuration: number; totalVisits: number; ranking: StudentStats[] }> {

        // Filter Logs
        const periodLogs = logs.filter(log => {
            const entry = new Date(log.entryTime);
            return entry >= from && entry <= to;
        });

        // Map name -> Stats
        const statsMap = new Map<string, StudentStats>();

        // Create Grade Map for quick lookup (Optimized)
        // Note: logs only have Name. We match Name -> Student to get Grade.
        const nameToStudent = new Map(Object.values(studentMap).map((s: Student) => [s.name, s]));
        const visitedDaysMap = new Map<string, Set<string>>();

        for (const log of periodLogs) {
            const name = log.name;
            if (!name) continue;

            const duration = this.calculateDurationMinutes(log);

            if (!statsMap.has(name)) {
                statsMap.set(name, {
                    name,
                    grade: null,
                    totalDurationMinutes: 0,
                    visitCount: 0,
                    lastVisit: null
                });
                visitedDaysMap.set(name, new Set());
            }

            const stat = statsMap.get(name)!;
            stat.totalDurationMinutes += duration;

            // Unique Day Logic: Count 1 visit per day per student
            const d = new Date(log.entryTime);
            // Use local date string to identify unique calendar days
            const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

            const visitedSet = visitedDaysMap.get(name)!;
            if (!visitedSet.has(dateStr)) {
                stat.visitCount += 1;
                visitedSet.add(dateStr);
            }

            // Update last visit
            if (!stat.lastVisit || new Date(log.entryTime) > new Date(stat.lastVisit)) {
                stat.lastVisit = log.entryTime;
            }
        }

        // Finalize Ranking Array and Fill Grades
        const ranking: StudentStats[] = Array.from(statsMap.values()).map(stat => {
            const student = nameToStudent.get(stat.name);
            return {
                name: stat.name,
                grade: student ? student.grade : '不明',
                totalDurationMinutes: stat.totalDurationMinutes,
                visitCount: stat.visitCount,
                lastVisit: stat.lastVisit
            };
        });

        // Sort by Duration Desc
        ranking.sort((a, b) => b.totalDurationMinutes - a.totalDurationMinutes);

        // Calculate Totals
        const totalDuration = ranking.reduce((sum, s) => sum + s.totalDurationMinutes, 0);
        const totalVisits = ranking.reduce((sum, s) => sum + s.visitCount, 0);

        console.log(`[DEBUG] From: ${from.toISOString()}, To: ${to.toISOString()}`);
        console.log(`[DEBUG] Total Logs: ${logs.length}, Period Logs: ${periodLogs.length}`);
        if (ranking.length > 0) {
            console.log(`[DEBUG] Top Student: ${ranking[0].name}, Duration: ${ranking[0].totalDurationMinutes}, Visits: ${ranking[0].visitCount}`);
        }

        return { totalDuration, totalVisits, ranking };
    }

    private calculateDurationMinutes(log: EntryExitLog): number {
        const entry = new Date(log.entryTime);
        if (isNaN(entry.getTime())) return 0; // Invalid entry time

        let exit: Date;
        const now = new Date();

        // Check if exitTime exists AND is valid
        let isValidExit = false;
        if (log.exitTime) {
            const parsed = new Date(log.exitTime);
            if (!isNaN(parsed.getTime())) {
                exit = parsed;
                isValidExit = true;
            }
        }

        if (!isValidExit) {
            // Imputation Strategy
            const diffHours = (now.getTime() - entry.getTime()) / (1000 * 60 * 60);

            if (diffHours < 12) {
                exit = now;
            } else {
                // Cap at 4 hours or 22:00
                const closeTime = new Date(entry);
                closeTime.setHours(22, 0, 0, 0);
                const fourHoursLater = new Date(entry.getTime() + 4 * 60 * 60 * 1000);

                if (fourHoursLater < closeTime) {
                    exit = fourHoursLater;
                } else {
                    exit = closeTime;
                }
            }
        }

        // @ts-expect-error: Date arithmetic returns number, but TS might infer otherwise or check strict types
        const diffMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60);
        return Math.max(0, Math.floor(diffMinutes));
    }
}
