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

const occupancyRepo = new GoogleSheetOccupancyRepository();
const studentRepo = new GoogleSheetStudentRepository();

export class BadgeService {

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

        const logs = await occupancyRepo.findAllLogs();
        const students = await studentRepo.findAll();

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

        weekLogs.forEach(log => {
            const key = normalizeName(log.name);
            if (!stats.has(key)) return;
            const s = stats.get(key)!;
            const duration = this.calculateDuration(log);

            s.totalDuration += duration;
            s.visitCount++;

            // Use JST Date for everything
            const entry = new Date(log.entryTime);
            const entryJst = toJst(entry);

            // 4-1. Visit Days (CONSISTENT badge) - Use JST Date String
            // entryJst is already shifted to JST time values.
            // Using logic: `entryJst.getFullYear() + '/' + ...` ensures JST date.
            const dateStr = `${entryJst.getFullYear()}/${entryJst.getMonth() + 1}/${entryJst.getDate()}`;
            s.visitDays.add(dateStr);

            // 4-2. Morning Duration (EARLY_BIRD) [04:00 - 09:00 JST]
            const morningCutoff = new Date(entryJst);
            morningCutoff.setHours(9, 0, 0, 0);
            const morningStart = new Date(entryJst);
            morningStart.setHours(4, 0, 0, 0);

            if (entryJst < morningCutoff && entryJst >= morningStart) {
                // Calculate JST Exit
                const exitTime = new Date(entry.getTime() + duration * 60000); // Raw Exit
                const exitJst = toJst(exitTime); // Shifted Exit

                const end = exitJst < morningCutoff ? exitJst : morningCutoff;
                const morningMins = (end.getTime() - entryJst.getTime()) / 60000;

                if (morningMins > 0) s.morningDuration += morningMins;
            }

            // 4-3. Night Duration (NIGHT_OWL) [After 20:00 JST]
            const nightCutoff = new Date(entryJst);
            nightCutoff.setHours(20, 0, 0, 0);

            const exitTime = new Date(entry.getTime() + duration * 60000);
            const exitJst = toJst(exitTime);

            if (exitJst > nightCutoff) {
                const start = entryJst > nightCutoff ? entryJst : nightCutoff;
                const nightMins = (exitJst.getTime() - start.getTime()) / 60000;
                if (nightMins > 0) s.nightDuration += nightMins;
            }
        });

        // Process Previous Week (for Growth / RISING_STAR)
        prevWeekLogs.forEach(log => {
            const key = normalizeName(log.name);
            if (!stats.has(key)) return;
            const s = stats.get(key)!;
            s.prevTotalDuration += this.calculateDuration(log);
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

    // Copied from DashboardService (DRY violation but simple enough for now, prefer Utils in future)
    private calculateDuration(log: EntryExitLog): number {
        const entry = new Date(log.entryTime);
        if (isNaN(entry.getTime())) return 0;

        let exit: Date;

        if (log.exitTime) {
            exit = new Date(log.exitTime);
        } else {
            // Imputation logic needed if we run this for TODAY, but for Last Week, everything should be closed?
            // If data is missing exit, assume 22:00 or max 4h
            const closeTime = new Date(entry);
            closeTime.setHours(22, 0, 0, 0);
            exit = new Date(entry.getTime() + 4 * 60 * 60 * 1000);
            if (exit > closeTime) exit = closeTime;
        }

        const diff = (exit.getTime() - entry.getTime()) / 60000;
        return Math.max(0, Math.floor(diff));
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
