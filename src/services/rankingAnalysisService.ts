/**
 * 月間学習時間ランキング サービス
 *
 * 純粋関数（calculateMonthlyStudentStats, groupAndRankStudents）は
 * モックなしでテスト可能。非同期オーケストレータ（getMonthlyRanking）は
 * リポジトリ経由でデータを取得し、純粋関数に委譲する。
 */

import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';
import { Student } from '@/lib/schema';
import { normalizeName } from '@/lib/stringUtils';
import { filterLogsByDateRange, getMonthRangeJst, toJstMonthString, countUniqueVisitDays } from '@/lib/dateUtils';
import { calculateEffectiveDuration } from '@/lib/durationUtils';
import { getTopNWithTies } from '@/lib/rankingUtils';
import { GoogleSheetOccupancyRepository } from '@/repositories/googleSheets/GoogleSheetOccupancyRepository';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
import { IOccupancyRepository } from '@/repositories/interfaces/IOccupancyRepository';
import { IStudentRepository } from '@/repositories/interfaces/IStudentRepository';
import {
    StudentMonthlyStats,
    RankedStudent,
    RankedGroup,
    MonthlyRankingData,
} from '@/types/analysis';

/** 受験組の学年 (badgeService.ts と同じ基準) */
const EXAM_GRADES = new Set(['高3', '既卒']);

// ============================================
// 純粋関数（テスト可能にexport）
// ============================================

/**
 * 入退室ログと生徒マスターから、生徒ごとの月間統計を計算する
 *
 * 再利用:
 * - normalizeName() でログ名と生徒名をマッチング
 * - calculateEffectiveDuration() でオーバーラップ統合済み滞在時間を計算
 * - toJst() で通塾日のJSTカウント
 */
export function calculateMonthlyStudentStats(
    logs: EntryExitLog[],
    students: Record<string, Student>,
): StudentMonthlyStats[] {
    // 在塾ステータスの生徒のみ対象（講師も除外: status !== '在塾'）
    const activeStudents = new Map<string, Student>();
    for (const s of Object.values(students)) {
        if (s.status !== '在塾') continue;
        activeStudents.set(normalizeName(s.name), s);
    }

    // ログを正規化名でグループ化
    const studentLogsMap = new Map<string, EntryExitLog[]>();
    for (const l of logs) {
        const key = normalizeName(l.name);
        if (!activeStudents.has(key)) continue;
        if (!studentLogsMap.has(key)) {
            studentLogsMap.set(key, []);
        }
        studentLogsMap.get(key)!.push(l);
    }

    // 各生徒の統計を計算
    const results: StudentMonthlyStats[] = [];
    for (const [normalizedName, stu] of activeStudents) {
        const studentLogs = studentLogsMap.get(normalizedName) || [];
        const totalMinutes = calculateEffectiveDuration(studentLogs);

        results.push({
            name: stu.name,
            grade: stu.grade,
            totalMinutes,
            attendanceDays: countUniqueVisitDays(studentLogs),
        });
    }

    return results;
}

/**
 * 統計データを受験部門/一般部門に分割し、各グループ内でランキングする
 *
 * 再利用: getTopNWithTies() でOlympic式タイ対応ランキング
 */
export function groupAndRankStudents(
    stats: StudentMonthlyStats[],
    topN: number,
): { examGroup: RankedGroup; generalGroup: RankedGroup } {
    const examStats = stats.filter((s) => EXAM_GRADES.has(s.grade));
    const generalStats = stats.filter((s) => !EXAM_GRADES.has(s.grade));

    return {
        examGroup: rankGroup(examStats, topN, '受験生の部'),
        generalGroup: rankGroup(generalStats, topN, '高2以下の部'),
    };
}

function rankGroup(
    stats: StudentMonthlyStats[],
    topN: number,
    label: string,
): RankedGroup {
    const items = stats.map((s) => ({ item: s, value: s.totalMinutes }));
    const ranked = getTopNWithTies(items, topN, 1); // minThreshold=1分

    const students: RankedStudent[] = ranked.map(({ item, rank }) => ({
        rank,
        name: item.name,
        grade: item.grade,
        totalHours: Math.round((item.totalMinutes / 60) * 10) / 10,
        totalMinutes: item.totalMinutes,
        attendanceDays: item.attendanceDays,
    }));

    return { label, students, totalStudents: stats.length };
}

// ============================================
// 非同期オーケストレータ
// ============================================

/**
 * 月間ランキングデータを取得する
 *
 * @param month "YYYY-MM" 形式
 * @param topN 表示する上位人数（デフォルト5）
 * @param occupancyRepo DI用（テスト時にモック注入可能）
 * @param studentRepo DI用
 */
export async function getMonthlyRanking(
    month: string,
    topN: number = 5,
    occupancyRepo?: IOccupancyRepository,
    studentRepo?: IStudentRepository,
): Promise<MonthlyRankingData> {
    const occRepo = occupancyRepo || new GoogleSheetOccupancyRepository();
    const stuRepo = studentRepo || new GoogleSheetStudentRepository();

    const [allLogs, students] = await Promise.all([
        occRepo.findAllLogs(),
        stuRepo.findAll(),
    ]);

    const { start, end } = getMonthRangeJst(month);
    const monthLogs = filterLogsByDateRange(allLogs, start, end);

    const stats = calculateMonthlyStudentStats(monthLogs, students);
    const { examGroup, generalGroup } = groupAndRankStudents(stats, topN);

    // toJstMonthString 用に月中の日付を生成
    const [yearStr, monStr] = month.split('-');
    const monthDate = new Date(parseInt(yearStr, 10), parseInt(monStr, 10) - 1, 15);

    return {
        month,
        monthLabel: toJstMonthString(monthDate),
        examGroup,
        generalGroup,
        topN,
        generatedAt: new Date().toISOString(),
    };
}
