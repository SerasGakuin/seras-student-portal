import { Student } from '@/types';
import { StudentStats, DashboardSummary } from '@/types/dashboard';
import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';
import { BadgeService } from '@/services/badgeService';
import { toJst, toJstDateString, toJstMonthString } from '@/lib/dateUtils';
import {
    calculateEffectiveDuration,
    calculateSingleLogDuration
} from '@/lib/durationUtils';
import { calculateRanksWithTies } from '@/lib/rankingUtils';
import { GRADE_ORDER } from '@/lib/schema';

// Re-export types for backward compatibility
export type { StudentStats, DashboardSummary } from '@/types/dashboard';

const occupancyRepo = new GoogleSheetOccupancyRepository();
const studentRepo = new GoogleSheetStudentRepository();
const badgeService = new BadgeService();

export class DashboardService {

    /**
     * Get aggregated Dashboard Stats for a specific period
     * Default: Current Month (in JST)
     */
    async getDashboardStats(from?: Date, to?: Date, gradeFilter?: string): Promise<DashboardSummary> {
        // Default to current month if not specified (JST-aware)
        const nowJst = toJst(new Date());

        // startDate: First day of JST month
        const startDate = from
            ? toJst(from)
            : new Date(nowJst.getFullYear(), nowJst.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);

        // endDate: Last day of JST month (or provided date)
        const endDate = to
            ? toJst(to)
            : new Date(nowJst.getFullYear(), nowJst.getMonth() + 1, 0, 23, 59, 59, 999);
        endDate.setHours(23, 59, 59, 999);

        // Calculate Period Days
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate Previous Period (for trend)
        const durationTime = endDate.getTime() - startDate.getTime();
        const prevStartDate = new Date(startDate.getTime() - durationTime);
        const prevEndDate = new Date(startDate.getTime() - 1);
        prevEndDate.setHours(23, 59, 59, 999);

        // Fetch ALL logs (Repository is cached)
        const logs = await occupancyRepo.findAllLogs();
        const studentRecord = await studentRepo.findAll();

        // --- FILTERING START ---
        // 在籍中の全生徒から eligibleStudentNames を構築（学習時間0でも表示するため）
        const eligibleStudentNames = new Set<string>();
        Object.values(studentRecord).forEach((s: Student) => {
            // 在塾ステータスのみ対象
            if (s.status !== '在塾') return;
            if (!s.grade) return;

            // グレードフィルタがある場合は適用
            if (gradeFilter && gradeFilter !== 'ALL') {
                let isMatch = false;
                if (gradeFilter === 'HS') {
                    isMatch = s.grade.includes('高') || s.grade.includes('既卒');
                } else if (gradeFilter === 'JHS') {
                    isMatch = s.grade.includes('中');
                } else if (gradeFilter === 'EXAM') {
                    isMatch = s.grade === '高3' || s.grade === '既卒';
                } else if (gradeFilter === 'NON_EXAM') {
                    // Non-examinees are everyone EXCEPT '高3' and '既卒'
                    isMatch = s.grade !== '高3' && s.grade !== '既卒';
                } else {
                    isMatch = s.grade === gradeFilter;
                }

                if (!isMatch) return;
            }

            eligibleStudentNames.add(s.name);
        });

        const relevantLogs = eligibleStudentNames.size > 0
            ? logs.filter(l => l.name && eligibleStudentNames.has(l.name))
            : logs;

        // --- FILTERING END ---

        // Current Period Stats
        const currentStats = await this.aggregateStats(relevantLogs, startDate, endDate, studentRecord, eligibleStudentNames);

        // Previous Period Stats (for Trend)
        const prevStats = await this.aggregateStats(relevantLogs, prevStartDate, prevEndDate, studentRecord, eligibleStudentNames);

        // Calculate Trends
        const durationTrend = this.calculateTrend(currentStats.totalDuration, prevStats.totalDuration);
        const visitsTrend = this.calculateTrend(currentStats.totalVisits, prevStats.totalVisits);

        // Available Months (Global Scan)
        const availableMonths = this.getAvailableMonths(logs);

        // History Calculation (Daily Cumulative for Graph)
        const allStudents = currentStats.ranking.map(s => s.name);
        const history = this.calculateHistory(relevantLogs, startDate, endDate, allStudents);
        const badgeResult = await badgeService.getWeeklyBadges();
        const badges = { ...badgeResult.exam, ...badgeResult.general };
        const badgePeriod = badgeResult.period;

        return {
            totalDuration: {
                value: currentStats.totalDuration,
                trend: durationTrend
            },
            totalVisits: {
                value: currentStats.totalVisits,
                trend: visitsTrend
            },
            avgDurationPerVisit: {
                value: currentStats.totalVisits > 0 ? Math.floor(currentStats.totalDuration / currentStats.totalVisits) : 0,
                trend: this.calculateTrend(
                    currentStats.totalVisits > 0 ? currentStats.totalDuration / currentStats.totalVisits : 0,
                    prevStats.totalVisits > 0 ? prevStats.totalDuration / prevStats.totalVisits : 0
                )
            },
            avgVisitsPerStudent: {
                value: currentStats.ranking.length > 0 ? Number((currentStats.totalVisits / currentStats.ranking.length).toFixed(1)) : 0,
                trend: this.calculateTrend(
                    currentStats.ranking.length > 0 ? currentStats.totalVisits / currentStats.ranking.length : 0,
                    prevStats.ranking.length > 0 ? prevStats.totalVisits / prevStats.ranking.length : 0
                )
            },
            topStudent: currentStats.ranking.length > 0 ? currentStats.ranking[0] : null,
            ranking: currentStats.ranking,
            period: {
                from: startDate.toISOString(),
                to: endDate.toISOString()
            },
            availableMonths,
            periodDays,
            history,
            metricLists: this.calculateLists(currentStats.ranking, prevStats.ranking),
            badges,
            badgePeriod,
        };
    }

    private calculateLists(currentStats: StudentStats[], prevStats: StudentStats[]) {
        const prevMap = new Map(prevStats.map(s => [s.name, s.totalDurationMinutes]));

        const growers: StudentStats[] = [];
        const droppers: StudentStats[] = [];
        const vanished: StudentStats[] = [];

        currentStats.forEach(curr => {
            const prevDuration = prevMap.get(curr.name) || 0;
            const delta = curr.totalDurationMinutes - prevDuration;
            const statWithGrowth = { ...curr, growth: delta };

            if (delta > 0) growers.push(statWithGrowth);
            if (delta < 0) droppers.push(statWithGrowth);

            prevMap.delete(curr.name);
        });

        prevMap.forEach((prevDuration, name) => {
            if (prevDuration > 60) {
                vanished.push({
                    name,
                    grade: '不明',
                    totalDurationMinutes: 0,
                    visitCount: 0,
                    lastVisit: null,
                    growth: -prevDuration
                });
            }
        });

        growers.sort((a, b) => (b.growth || 0) - (a.growth || 0));
        droppers.sort((a, b) => (a.growth || 0) - (b.growth || 0));
        vanished.sort((a, b) => (a.growth || 0) - (b.growth || 0));

        return { growers, droppers, vanished };
    }

    private calculateTrend(current: number, prev: number): number {
        if (prev === 0) return current > 0 ? 100 : 0;
        return Number(((current - prev) / prev * 100).toFixed(1));
    }

    private getAvailableMonths(logs: EntryExitLog[]): string[] {
        const months = new Set<string>();
        logs.forEach(log => {
            const d = new Date(log.entryTime);
            if (!isNaN(d.getTime())) {
                months.add(toJstMonthString(d));
            }
        });
        return Array.from(months).sort().reverse();
    }

    private calculateHistory(logs: EntryExitLog[], from: Date, to: Date, targetStudents: string[]) {
        const dailyMap = new Map<string, Record<string, number>>();
        const studentsSet = new Set(targetStudents);

        // Initialize timeline (in JST)
        const timeline: string[] = [];
        const cursor = new Date(from);
        cursor.setHours(0, 0, 0, 0);

        const effectiveEnd = new Date(to);
        const nowJst = toJst(new Date());
        nowJst.setHours(23, 59, 59, 999);
        if (effectiveEnd > nowJst) {
            effectiveEnd.setTime(nowJst.getTime());
        }

        while (cursor <= effectiveEnd) {
            const dateStr = `${cursor.getFullYear()}/${cursor.getMonth() + 1}/${cursor.getDate()}`;
            timeline.push(dateStr);
            dailyMap.set(dateStr, {});
            cursor.setDate(cursor.getDate() + 1);
        }

        // Filter and aggregate logs
        // Filter and aggregate logs
        const rangeLogs = logs.filter(l => {
            const entryJst = toJst(new Date(l.entryTime));
            return entryJst >= from && entryJst <= to && l.name && studentsSet.has(l.name);
        });

        // Group by Date -> Student -> Logs
        const dailyStudentLogs: Record<string, Record<string, EntryExitLog[]>> = {};

        rangeLogs.forEach(log => {
            const dateStr = toJstDateString(new Date(log.entryTime));
            if (!dailyStudentLogs[dateStr]) dailyStudentLogs[dateStr] = {};
            if (!dailyStudentLogs[dateStr][log.name!]) dailyStudentLogs[dateStr][log.name!] = [];
            dailyStudentLogs[dateStr][log.name!].push(log);
        });

        const dailyTotals: Record<string, Record<string, number>> = {};

        // Calculate effective duration per student per day
        Object.entries(dailyStudentLogs).forEach(([dateStr, studentMap]) => {
            dailyTotals[dateStr] = {};
            Object.entries(studentMap).forEach(([studentName, studentLogs]) => {
                dailyTotals[dateStr][studentName] = calculateEffectiveDuration(studentLogs);
            });
        });

        // Cumulative Sum over Timeline
        const result: { date: string;[key: string]: number | string }[] = [];
        const runningTotals: Record<string, number> = {};

        targetStudents.forEach(s => runningTotals[s] = 0);

        // Add "Start" point
        const startData: { date: string;[key: string]: number | string } = { date: 'Start' };
        targetStudents.forEach(s => startData[s] = 0);
        result.push(startData);

        for (const dateStr of timeline) {
            const dayData: { date: string;[key: string]: number | string } = { date: dateStr };
            const daysLog = dailyTotals[dateStr] || {};

            targetStudents.forEach(student => {
                const daily = daysLog[student] || 0;
                runningTotals[student] += daily;
                dayData[student] = Math.floor(runningTotals[student] / 60);
            });
            result.push(dayData);
        }

        return result;
    }

    private async aggregateStats(
        logs: EntryExitLog[],
        from: Date,
        to: Date,
        studentMap: Record<string, Student>,
        eligibleStudentNames?: Set<string>
    ): Promise<{ totalDuration: number; totalVisits: number; ranking: StudentStats[] }> {

        // Filter Logs using JST comparison
        const periodLogs = logs.filter(log => {
            const entryJst = toJst(new Date(log.entryTime));
            return entryJst >= from && entryJst <= to;
        });

        const nameToStudent = new Map(Object.values(studentMap).map((s: Student) => [s.name, s]));

        // Group logs by student
        const studentLogsMap = new Map<string, EntryExitLog[]>();
        periodLogs.forEach(log => {
            if (!log.name) return;
            if (!studentLogsMap.has(log.name)) {
                studentLogsMap.set(log.name, []);
            }
            studentLogsMap.get(log.name)!.push(log);
        });

        // 対象生徒リストを決定
        // eligibleStudentNames があれば使用、なければログがある生徒のみ（後方互換性）
        const targetStudents = eligibleStudentNames
            ? Array.from(eligibleStudentNames)
            : Array.from(studentLogsMap.keys());

        const ranking: StudentStats[] = [];
        let totalDuration = 0;
        let totalVisits = 0;

        for (const name of targetStudents) {
            const studentLogs = studentLogsMap.get(name) || [];
            const student = nameToStudent.get(name);

            // 1. Calculate Effective Duration (Merge Overlaps)
            const duration = studentLogs.length > 0
                ? calculateEffectiveDuration(studentLogs)
                : 0;

            // 2. Calculate Visits (Unique Days)
            const visitedDays = new Set<string>();
            let lastVisit: string | null = null;

            studentLogs.forEach(log => {
                const dateStr = toJstDateString(new Date(log.entryTime));
                visitedDays.add(dateStr);
                if (!lastVisit || new Date(log.entryTime) > new Date(lastVisit)) {
                    lastVisit = log.entryTime;
                }
            });

            const visitCount = visitedDays.size;

            ranking.push({
                name,
                grade: student ? student.grade : '不明',
                totalDurationMinutes: duration,
                visitCount,
                lastVisit,
                docLink: student?.docLink || undefined,
                sheetLink: student?.sheetLink || undefined
            });

            totalDuration += duration;
            totalVisits += visitCount;
        }

        // 複合ソート: 学習時間 → 学年 → 名前
        ranking.sort((a, b) => {
            // 1. 学習時間で降順
            if (b.totalDurationMinutes !== a.totalDurationMinutes) {
                return b.totalDurationMinutes - a.totalDurationMinutes;
            }
            // 2. 学年で降順
            const gradeA = GRADE_ORDER[a.grade || ''] || 0;
            const gradeB = GRADE_ORDER[b.grade || ''] || 0;
            if (gradeB !== gradeA) {
                return gradeB - gradeA;
            }
            // 3. 名前で昇順
            return (a.name || '').localeCompare(b.name || '', 'ja');
        });

        // Assign Olympic-style ranks (ties share same rank)
        const rankedItems = calculateRanksWithTies(
            ranking.map(s => ({ item: s, value: s.totalDurationMinutes }))
        );
        rankedItems.forEach(({ item, rank }) => {
            item.rank = rank;
        });

        console.log(`[DEBUG-JST] From: ${from.toLocaleString()}, To: ${to.toLocaleString()}`);
        console.log(`[DEBUG-JST] Total Logs: ${logs.length}, Period Logs: ${periodLogs.length}`);
        if (ranking.length > 0) {
            console.log(`[DEBUG-JST] Top Student: ${ranking[0].name}, Duration: ${ranking[0].totalDurationMinutes}, Visits: ${ranking[0].visitCount}`);
        }

        return { totalDuration, totalVisits, ranking };
    }

    async getStudentDetails(studentName: string, days: number = 28) {
        // Period calculation using JST
        const nowJst = toJst(new Date());
        const endDate = new Date(nowJst);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(nowJst);
        startDate.setDate(nowJst.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        const logs = await occupancyRepo.findAllLogs();

        const allStudentLogs = logs.filter(l => l.name === studentName);

        // Filter logs for the specified period using JST comparison
        const relevantLogs = allStudentLogs.filter(l => {
            const entryJst = toJst(new Date(l.entryTime));
            return entryJst >= startDate && entryJst <= endDate;
        });

        const details = relevantLogs.map(log => {
            const duration = calculateSingleLogDuration(log);
            const entry = new Date(log.entryTime);
            const exit = new Date(entry.getTime() + duration * 60 * 1000);

            return {
                date: entry.toISOString(),
                durationMinutes: duration,
                entryTime: entry.toISOString(),
                exitTime: exit.toISOString()
            };
        });

        details.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate streaks using JST dates
        const allUniqueDates = [...new Set(allStudentLogs.map(l => {
            const jst = toJst(new Date(l.entryTime));
            return `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;
        }))].sort();

        let maxConsecutive = 0;
        let tempStreak = 0;
        let previousDate: Date | null = null;

        for (const dateStr of allUniqueDates) {
            const currentDate = new Date(dateStr + 'T00:00:00');

            if (previousDate) {
                const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
            } else {
                tempStreak = 1;
            }

            maxConsecutive = Math.max(maxConsecutive, tempStreak);
            previousDate = currentDate;
        }

        // Current Streak (must include today or yesterday in JST)
        const sortedDatesDesc = [...allUniqueDates].reverse();
        let currentStreak = 0;
        const todayJst = toJst(new Date());
        todayJst.setHours(0, 0, 0, 0);

        if (sortedDatesDesc.length > 0) {
            const latestDate = new Date(sortedDatesDesc[0] + 'T00:00:00');
            const diffFromToday = Math.round((todayJst.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffFromToday <= 1) {
                currentStreak = 1;
                for (let i = 1; i < sortedDatesDesc.length; i++) {
                    const prevDate = new Date(sortedDatesDesc[i - 1] + 'T00:00:00');
                    const currDate = new Date(sortedDatesDesc[i] + 'T00:00:00');
                    const diff = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }

        return {
            history: details,
            maxConsecutiveDays: maxConsecutive,
            currentStreak: currentStreak
        };
    }
}
