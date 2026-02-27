import { getMonthRangeJst } from '@/lib/dateUtils';
import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';
import { Student } from '@/lib/schema';
import {
    calculateMonthlyStudentStats,
    groupAndRankStudents,
} from './rankingAnalysisService';

// --- ヘルパー ---

/** テスト用 EntryExitLog ファクトリ */
function log(overrides: Partial<EntryExitLog> & { entryTime: string }): EntryExitLog {
    return {
        exitTime: null,
        place: '1',
        name: 'テスト太郎',
        ...overrides,
    };
}

/** テスト用 Student ファクトリ */
function student(overrides: Partial<Student> & { name: string }): Student {
    return {
        lineId: `line_${overrides.name}`,
        grade: '高1',
        status: '在塾',
        ...overrides,
    };
}

/** Student の Record を作成 */
function studentsRecord(...students: Student[]): Record<string, Student> {
    const result: Record<string, Student> = {};
    for (const s of students) {
        result[s.lineId] = s;
    }
    return result;
}

// --- getMonthRangeJst ---

describe('getMonthRangeJst', () => {
    it('2026-02 の月初・月末を正しく返す', () => {
        const { start, end } = getMonthRangeJst('2026-02');

        // 月初: 2026-02-01 00:00:00 JST = 2026-01-31 15:00:00 UTC
        expect(start.toISOString()).toBe('2026-01-31T15:00:00.000Z');

        // 月末: 2026-02-28 23:59:59.999 JST = 2026-02-28 14:59:59.999 UTC
        expect(end.toISOString()).toBe('2026-02-28T14:59:59.999Z');
    });

    it('12月の年境界を正しく処理する', () => {
        const { start, end } = getMonthRangeJst('2025-12');

        // 月初: 2025-12-01 00:00:00 JST = 2025-11-30 15:00:00 UTC
        expect(start.toISOString()).toBe('2025-11-30T15:00:00.000Z');

        // 月末: 2025-12-31 23:59:59.999 JST = 2025-12-31 14:59:59.999 UTC
        expect(end.toISOString()).toBe('2025-12-31T14:59:59.999Z');
    });

    it('閏年の2月を正しく処理する (2024-02)', () => {
        const { end } = getMonthRangeJst('2024-02');

        // 2024年は閏年: 2月29日まで
        // 月末: 2024-02-29 23:59:59.999 JST = 2024-02-29 14:59:59.999 UTC
        expect(end.toISOString()).toBe('2024-02-29T14:59:59.999Z');
    });

    it('31日の月を正しく処理する (2026-01)', () => {
        const { end } = getMonthRangeJst('2026-01');
        expect(end.toISOString()).toBe('2026-01-31T14:59:59.999Z');
    });
});

// --- calculateMonthlyStudentStats ---

describe('calculateMonthlyStudentStats', () => {
    it('入退室ログから学習時間（分）を計算する', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '田中太郎',
                // 2h = 120分
                entryTime: '2026-02-10T05:00:00.000Z', // 14:00 JST
                exitTime: '2026-02-10T07:00:00.000Z',  // 16:00 JST
            }),
        ];
        const students = studentsRecord(
            student({ name: '田中太郎', grade: '高1' }),
        );

        const result = calculateMonthlyStudentStats(logs, students);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('田中太郎');
        expect(result[0].totalMinutes).toBe(120);
    });

    it('同日の複数ログは1通塾日としてカウントする', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '田中太郎',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
            log({
                name: '田中太郎',
                entryTime: '2026-02-10T09:00:00.000Z',
                exitTime: '2026-02-10T11:00:00.000Z',
            }),
        ];
        const students = studentsRecord(
            student({ name: '田中太郎' }),
        );

        const result = calculateMonthlyStudentStats(logs, students);
        expect(result[0].attendanceDays).toBe(1);
        // 合計: 2h + 2h = 240分
        expect(result[0].totalMinutes).toBe(240);
    });

    it('異なる日のログは別々の通塾日としてカウントする', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '田中太郎',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
            log({
                name: '田中太郎',
                entryTime: '2026-02-11T05:00:00.000Z',
                exitTime: '2026-02-11T07:00:00.000Z',
            }),
        ];
        const students = studentsRecord(
            student({ name: '田中太郎' }),
        );

        const result = calculateMonthlyStudentStats(logs, students);
        expect(result[0].attendanceDays).toBe(2);
    });

    it('在塾ステータスの生徒のみ対象にする', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '退塾生',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
            log({
                name: '現役生',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
        ];
        const students = studentsRecord(
            student({ name: '退塾生', status: '退塾' }),
            student({ name: '現役生', status: '在塾' }),
        );

        const result = calculateMonthlyStudentStats(logs, students);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('現役生');
    });

    it('講師はランキング対象外', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '先生',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
        ];
        const students = studentsRecord(
            student({ name: '先生', grade: '講師', status: '在塾(講師)' }),
        );

        const result = calculateMonthlyStudentStats(logs, students);
        expect(result).toHaveLength(0);
    });

    it('生徒マスターに存在しないログは無視する', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '不明者',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
        ];
        const students = studentsRecord(
            student({ name: '田中太郎' }),
        );

        const result = calculateMonthlyStudentStats(logs, students);
        // 田中太郎はログがないので0分
        expect(result[0].totalMinutes).toBe(0);
        expect(result[0].attendanceDays).toBe(0);
    });

    it('空のログ配列でエラーにならない', () => {
        const students = studentsRecord(
            student({ name: '田中太郎' }),
        );

        const result = calculateMonthlyStudentStats([], students);
        expect(result).toHaveLength(1);
        expect(result[0].totalMinutes).toBe(0);
    });

    it('空の生徒Recordでエラーにならない', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '田中太郎',
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
        ];

        const result = calculateMonthlyStudentStats(logs, {});
        expect(result).toHaveLength(0);
    });

    it('名前の空白を正規化してマッチングする', () => {
        const logs: EntryExitLog[] = [
            log({
                name: '田中　太郎', // 全角スペースあり
                entryTime: '2026-02-10T05:00:00.000Z',
                exitTime: '2026-02-10T07:00:00.000Z',
            }),
        ];
        const students = studentsRecord(
            student({ name: '田中太郎' }), // スペースなし
        );

        const result = calculateMonthlyStudentStats(logs, students);
        expect(result[0].totalMinutes).toBe(120);
    });
});

// --- groupAndRankStudents ---

describe('groupAndRankStudents', () => {
    it('受験組(高3/既卒)と一般に分割する', () => {
        const stats = [
            { name: 'A', grade: '高3', totalMinutes: 300, attendanceDays: 5 },
            { name: 'B', grade: '既卒', totalMinutes: 200, attendanceDays: 4 },
            { name: 'C', grade: '高1', totalMinutes: 100, attendanceDays: 3 },
            { name: 'D', grade: '中3', totalMinutes: 150, attendanceDays: 4 },
        ];

        const result = groupAndRankStudents(stats, 10);
        expect(result.examGroup.students).toHaveLength(2);
        expect(result.examGroup.label).toBe('受験生の部');
        expect(result.generalGroup.students).toHaveLength(2);
        expect(result.generalGroup.label).toBe('高2以下の部');
    });

    it('グループ内で独立にランキングする', () => {
        const stats = [
            { name: 'A', grade: '高3', totalMinutes: 300, attendanceDays: 5 },
            { name: 'B', grade: '高3', totalMinutes: 200, attendanceDays: 4 },
            { name: 'C', grade: '高1', totalMinutes: 400, attendanceDays: 6 },
        ];

        const result = groupAndRankStudents(stats, 10);

        // 受験生の部: A(1位) > B(2位)
        expect(result.examGroup.students[0].rank).toBe(1);
        expect(result.examGroup.students[0].name).toBe('A');
        expect(result.examGroup.students[1].rank).toBe(2);

        // 高2以下の部: C(1位)
        expect(result.generalGroup.students[0].rank).toBe(1);
    });

    it('topN で上位のみに絞る', () => {
        const stats = [
            { name: 'A', grade: '高1', totalMinutes: 500, attendanceDays: 7 },
            { name: 'B', grade: '高1', totalMinutes: 400, attendanceDays: 6 },
            { name: 'C', grade: '高1', totalMinutes: 300, attendanceDays: 5 },
            { name: 'D', grade: '高1', totalMinutes: 200, attendanceDays: 4 },
            { name: 'E', grade: '高1', totalMinutes: 100, attendanceDays: 3 },
        ];

        const result = groupAndRankStudents(stats, 3);
        expect(result.generalGroup.students).toHaveLength(3);
        expect(result.generalGroup.totalStudents).toBe(5);
    });

    it('タイの場合はOlympic式ランキング（同率は全員含む）', () => {
        const stats = [
            { name: 'A', grade: '高1', totalMinutes: 300, attendanceDays: 5 },
            { name: 'B', grade: '高1', totalMinutes: 300, attendanceDays: 4 },
            { name: 'C', grade: '高1', totalMinutes: 200, attendanceDays: 3 },
            { name: 'D', grade: '高1', totalMinutes: 100, attendanceDays: 2 },
        ];

        // topN=2 だが、1位タイが2人いるので 1位×2 + 3位 の計3人が返る
        // ※ getTopNWithTies の仕様: rank <= N の全員を含む
        const result = groupAndRankStudents(stats, 2);
        expect(result.generalGroup.students).toHaveLength(2);
        expect(result.generalGroup.students[0].rank).toBe(1);
        expect(result.generalGroup.students[1].rank).toBe(1);
    });

    it('0分の生徒はランキングに含まない', () => {
        const stats = [
            { name: 'A', grade: '高1', totalMinutes: 300, attendanceDays: 5 },
            { name: 'B', grade: '高1', totalMinutes: 0, attendanceDays: 0 },
        ];

        const result = groupAndRankStudents(stats, 10);
        expect(result.generalGroup.students).toHaveLength(1);
        expect(result.generalGroup.totalStudents).toBe(2);
    });

    it('totalHours は分を60で割って小数1位に丸める', () => {
        const stats = [
            { name: 'A', grade: '高1', totalMinutes: 150, attendanceDays: 3 }, // 2.5h
        ];

        const result = groupAndRankStudents(stats, 10);
        expect(result.generalGroup.students[0].totalHours).toBe(2.5);
        expect(result.generalGroup.students[0].totalMinutes).toBe(150);
    });

    it('空配列でエラーにならない', () => {
        const result = groupAndRankStudents([], 5);
        expect(result.examGroup.students).toHaveLength(0);
        expect(result.examGroup.totalStudents).toBe(0);
        expect(result.generalGroup.students).toHaveLength(0);
        expect(result.generalGroup.totalStudents).toBe(0);
    });

    it('グループの生徒数がtopN未満の場合は全員表示', () => {
        const stats = [
            { name: 'A', grade: '高3', totalMinutes: 300, attendanceDays: 5 },
            { name: 'B', grade: '高3', totalMinutes: 200, attendanceDays: 4 },
        ];

        const result = groupAndRankStudents(stats, 10);
        expect(result.examGroup.students).toHaveLength(2);
    });
});
