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
import { calculateRanksWithTies, getTopNWithTies } from '@/lib/rankingUtils';
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

        // Prepare items for ranking
        const items = groupNames
            .map(name => ({ name, stats: stats.get(name) }))
            .filter(item => item.stats)
            .map(item => ({
                item: item,
                value: item.stats!.totalDuration
            }));

        // Calculate ranks with tie handling (Olympic-style)
        const ranked = calculateRanksWithTies(items);

        ranked.forEach(({ item, rank }) => {
            rankings[item.stats!.name] = rank;
        });

        return rankings;
    }

    private awardBadgesForGroup(groupNames: string[], stats: Map<string, StudentWeeklyStats>, result: StudentBadgesMap) {
        // Helper to rank and pick top 3 with proper tie handling
        const processRanking = (
            getValue: (s: StudentWeeklyStats) => number,
            type: BadgeType,
            displayValue: (s: StudentWeeklyStats) => string | number,
            minThreshold?: number
        ) => {
            // Prepare items for ranking
            const items = groupNames
                .map(name => stats.get(name)!)
                .filter(s => s)
                .map(s => ({
                    item: s,
                    value: getValue(s)
                }));

            // Get top 3 with tie handling (Olympic-style)
            const ranked = getTopNWithTies(items, 3, minThreshold);

            ranked.forEach(({ item, rank }) => {
                if (!result[item.name]) result[item.name] = [];
                result[item.name].push({
                    type,
                    rank,
                    value: displayValue(item)
                });
            });
        };

        // 1. HEAVY_USER (Total Duration)
        // Min threshold: > 0 means >= 1 (any positive value)
        processRanking(s => s.totalDuration, 'HEAVY_USER', s => Math.floor(s.totalDuration / 60) + 'h', 1);

        // 2. EARLY_BIRD (Morning Duration)
        // Min threshold: > 30 means >= 31
        processRanking(s => s.morningDuration, 'EARLY_BIRD', s => Math.floor(s.morningDuration) + 'm', 31);

        // 3. NIGHT_OWL (Night Duration)
        // Min threshold: > 60 means >= 61
        processRanking(s => s.nightDuration, 'NIGHT_OWL', s => Math.floor(s.nightDuration / 60) + 'h', 61);

        // 4. CONSISTENT (Visit Days)
        // Min threshold: >= 3
        processRanking(s => s.visitDays.size, 'CONSISTENT', s => s.visitDays.size + 'd', 3);

        // 5. MARATHON (Avg Duration / Day)
        // Min threshold: > 0 means >= 1 (any positive value)
        processRanking(
            s => s.visitDays.size ? s.totalDuration / s.visitDays.size : 0,
            'MARATHON',
            s => {
                const avg = s.visitDays.size ? Math.floor(s.totalDuration / s.visitDays.size / 60) : 0;
                return avg + 'h/d';
            },
            1
        );

        // 6. RISING_STAR (Growth)
        // Min threshold: > 120 means >= 121 (more than 2 hours growth)
        processRanking(
            s => s.totalDuration - s.prevTotalDuration,
            'RISING_STAR',
            s => {
                const diff = Math.floor((s.totalDuration - s.prevTotalDuration) / 60);
                return '+' + diff + 'h';
            },
            121
        );
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
