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
        // Rolling 7-day window: Yesterday and the 6 days before it
        // Updated daily at 6am (cache/cron handled separately)

        // End date: Yesterday at 23:59:59
        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);

        // Start date: 7 days total (yesterday + 6 days before)
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        // Previous period for Rising Star comparison (7 days before startDate)
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(startDate.getDate() - 1);
        prevEndDate.setHours(23, 59, 59, 999);

        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevEndDate.getDate() - 6);
        prevStartDate.setHours(0, 0, 0, 0);

        console.log(`[BadgeService] Calculating for period: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        const logs = await occupancyRepo.findAllLogs();
        const students = await studentRepo.findAll();

        // 2. Filter Logs
        const weekLogs = logs.filter(l => {
            const d = new Date(l.entryTime);
            return d >= startDate && d <= endDate;
        });

        const prevWeekLogs = logs.filter(l => {
            const d = new Date(l.entryTime);
            return d >= prevStartDate && d <= prevEndDate;
        });

        // 3. Group Students (only active students with status '在塾')
        const normalizeName = (name: string) => name.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

        const examGroup: string[] = [];
        const generalGroup: string[] = [];

        Object.values(students).forEach(s => {
            // Only include active students (在塾)
            if (!s.grade || s.status !== '在塾') return;
            // Exam: High School 3, Graduates
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
                morningDuration: 0, // Before 9:00
                nightDuration: 0,   // After 20:00
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

            const entry = new Date(log.entryTime);
            const dateStr = entry.toLocaleDateString();
            s.visitDays.add(dateStr);

            // Morning Duration (Before 9:00)
            // If entry is before 9:00.
            const morningCutoff = new Date(entry);
            morningCutoff.setHours(9, 0, 0, 0);
            if (entry < morningCutoff) {
                // If exit is also before 9:00, full duration.
                // If exit is after 9:00, duration until 9:00.
                // For simplicity, let's use Entry Time logic or overlap?
                // User said "Duration before 9am".
                const exit = new Date(entry.getTime() + duration * 60000);
                const end = exit < morningCutoff ? exit : morningCutoff;
                const morningMins = (end.getTime() - entry.getTime()) / 60000;
                if (morningMins > 0) s.morningDuration += morningMins;
            }

            // Night Duration (After 20:00)
            const nightStart = new Date(entry);
            nightStart.setHours(20, 0, 0, 0);
            const exit = new Date(entry.getTime() + duration * 60000);

            if (exit > nightStart) {
                const start = entry > nightStart ? entry : nightStart;
                const nightMins = (exit.getTime() - start.getTime()) / 60000;
                if (nightMins > 0) s.nightDuration += nightMins;
            }
        });

        // Process Previous Week (for Growth)
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

        // Calculate full rankings for all students based on total duration
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
