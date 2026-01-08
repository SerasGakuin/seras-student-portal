import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { EntryExitLog, IOccupancyRepository } from '@/repositories/interfaces/IOccupancyRepository';
import { IStudentRepository } from '@/repositories/interfaces/IStudentRepository';
import { toJst } from '@/lib/dateUtils';
import {
    calculateEffectiveDuration,
    calculateDurationInTimeRange,
} from '@/lib/durationUtils';
import { normalizeName } from '@/lib/stringUtils';
import {
    BadgeType,
    Badge,
    StudentBadgesMap,
    StudentRankingsMap,
    UnifiedWeeklyBadges,
} from '@/types/badge';

// Re-export types for backward compatibility
export type { BadgeType, Badge, StudentBadgesMap, StudentRankingsMap, UnifiedWeeklyBadges };

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
            s.totalDuration = calculateEffectiveDuration(studentLogs);
            s.visitCount = studentLogs.length;

            // 2. Morning Duration: 4:00-9:00 JST (with overlap merging)
            s.morningDuration = calculateDurationInTimeRange(studentLogs, 4, 9, toJst);

            // 3. Night Duration: 20:00-24:00 JST (with overlap merging)
            s.nightDuration = calculateDurationInTimeRange(studentLogs, 20, 24, toJst);

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
            s.prevTotalDuration = calculateEffectiveDuration(logs);
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
