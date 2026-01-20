/**
 * ダッシュボード関連の型定義
 */

import { StudentBadgesMap, WeekPeriod } from './badge';

/**
 * 生徒統計情報
 */
export interface StudentStats {
    name: string;
    grade: string | null;
    totalDurationMinutes: number;
    visitCount: number;
    lastVisit: string | null;
    growth?: number; // Delta vs previous period
    docLink?: string; // Google Docs link
    sheetLink?: string; // Google Sheets link
    rank?: number; // Olympic-style rank (ties share same rank)
}

/**
 * トレンド付きメトリック
 */
export interface MetricWithTrend {
    value: number;
    trend: number; // percentage change vs previous period
}

/**
 * ダッシュボードサマリーデータ
 */
export interface DashboardSummary {
    totalDuration: MetricWithTrend;
    totalVisits: MetricWithTrend;
    avgDurationPerVisit: MetricWithTrend;
    avgVisitsPerStudent: MetricWithTrend;
    topStudent: StudentStats | null;
    ranking: StudentStats[];
    period: {
        from: string;
        to: string;
    };
    availableMonths: string[]; // e.g. ['2024-11', '2024-12']
    periodDays: number; // Total days in the selected period
    history: {
        date: string;
        [studentName: string]: number | string; // Cumulative minutes
    }[];
    metricLists?: {
        growers: StudentStats[];
        droppers: StudentStats[];
        vanished: StudentStats[];
    };
    badges?: StudentBadgesMap;
    badgePeriod?: WeekPeriod;  // バッジ計算対象の週期間情報
}

/**
 * 生徒詳細履歴エントリ
 */
export interface StudentDetailEntry {
    date: string;
    durationMinutes: number;
    entryTime: string;
    exitTime: string;
}

/**
 * 生徒詳細レスポンス
 */
export interface StudentDetailResponse {
    history: StudentDetailEntry[];
    maxConsecutiveDays: number;
    currentStreak: number;
}
