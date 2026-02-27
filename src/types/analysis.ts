/** 15分間隔の在室スナップショット */
export interface OccupancySnapshot {
  timestamp: string;
  date: string;         // "YYYY-MM-DD"
  day: string;          // "Sun", "Mon", ...
  hour: number;
  minute: number;
  building1: number;
  building2: number;
  total: number;
}

/** ヒートマップデータ: 曜日(0-6) × 時間(7-22) の平均値マトリクス */
export interface HeatmapData {
  matrix: number[][];         // [7][16] - weekday × hour (Mon-Sun × 7-22)
  weekdayLabels: string[];    // ["月","火","水","木","金","土","日"]
  hourLabels: number[];       // [7,8,...,22]
  maxValue: number;
}

/** トレンドの1時刻分の統計量 */
export interface TrendsPoint {
  time: number;
  total: number;       // 平均
  p10: number;         // 10th percentile
  p25: number;         // 25th percentile
  p75: number;         // 75th percentile
  p90: number;         // 90th percentile
}

/** 日次トレンドデータ */
export interface TrendsData {
  weekdayMean: TrendsPoint[];
  weekendMean: TrendsPoint[];
}

/** 日次内訳データ（1日分） */
export interface DailyBreakdown {
  date: string;
  day: string;
  points: { time: number; building1: number; building2: number; total: number }[];
}

/** API レスポンス全体 */
export interface OccupancyAnalysisData {
  heatmap: HeatmapData;
  trends: TrendsData;
  breakdown: DailyBreakdown[];
  period: { from: string; to: string };
  totalDays: number;
}

// ============================================
// 月間学習時間ランキング
// ============================================

/** 1生徒の月間集計（サービス内部用） */
export interface StudentMonthlyStats {
  name: string;
  grade: string;
  totalMinutes: number;
  attendanceDays: number;
}

/** ランキング表示用の1生徒 */
export interface RankedStudent {
  rank: number;
  name: string;
  grade: string;
  totalHours: number;       // 小数1位
  totalMinutes: number;
  attendanceDays: number;
}

/** グループランキング */
export interface RankedGroup {
  label: string;            // "受験部門" or "一般部門"
  students: RankedStudent[];
  totalStudents: number;    // グループ全体の在塾生数
}

/** 月間ランキング API レスポンス */
export interface MonthlyRankingData {
  month: string;            // "YYYY-MM"
  monthLabel: string;       // "2026年02月"
  examGroup: RankedGroup;
  generalGroup: RankedGroup;
  topN: number;
  generatedAt: string;      // ISO timestamp
}
