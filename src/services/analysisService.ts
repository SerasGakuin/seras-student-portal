import { getGoogleSheets } from '@/lib/googleSheets';
import { CONFIG } from '@/lib/config';
import { unstable_cache } from 'next/cache';
import {
  OccupancySnapshot,
  OccupancyAnalysisData,
  HeatmapData,
  TrendsData,
  DailyBreakdown,
} from '@/types/analysis';

// 曜日マッピング: Day文字列 → weekday番号 (1=Mon, 7=Sun)
const DAY_TO_WEEKDAY: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
};

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
const HOUR_MIN = 7;
const HOUR_MAX = 22;
const HOUR_LABELS = Array.from({ length: HOUR_MAX - HOUR_MIN + 1 }, (_, i) => i + HOUR_MIN);

// --- Google Sheets からデータ取得（1時間キャッシュ） ---
const getCachedOccupancyLogs = unstable_cache(
  async (): Promise<OccupancySnapshot[]> => {
    const sheets = await getGoogleSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
      range: 'occupancy_logs!A2:G',
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return [];

    return rows
      .map((row): OccupancySnapshot | null => {
        const [timestamp, dateRaw, day, hourRaw, b1Raw, b2Raw, totalRaw] = row;
        if (!timestamp || !dateRaw) return null;

        const hour = Number(hourRaw) || 0;
        const building1 = Number(b1Raw) || 0;
        const building2 = Number(b2Raw) || 0;
        const total = Number(totalRaw) || 0;

        // 日付を YYYY-MM-DD 形式に正規化
        const normalizedDate = normalizeDate(dateRaw);

        // timestampから分を抽出
        const minute = extractMinute(timestamp);

        return {
          timestamp,
          date: normalizedDate,
          day: day || '',
          hour,
          minute,
          building1,
          building2,
          total,
        };
      })
      .filter((s): s is OccupancySnapshot => s !== null);
  },
  ['analysis-occupancy-logs'],
  { revalidate: 3600, tags: ['analysis-occupancy-logs'] }
);

/** YYYY/M/D or YYYY-MM-DD → YYYY-MM-DD */
function normalizeDate(raw: string): string {
  if (raw.includes('/')) {
    const parts = raw.split('/');
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return raw;
}

/** timestamp文字列から分を抽出 */
function extractMinute(ts: string): number {
  // "YYYY/M/D HH:MM:SS" or ISO format
  const match = ts.match(/:(\d{2}):/);
  return match ? Number(match[1]) : 0;
}

// --- 公開メソッド ---

export async function getOccupancyAnalysis(from: Date, to: Date): Promise<OccupancyAnalysisData> {
  const allLogs = await getCachedOccupancyLogs();
  const filtered = filterByDateRange(allLogs, from, to);
  return {
    heatmap: aggregateHeatmap(filtered),
    trends: aggregateTrends(filtered),
    breakdown: aggregateBreakdown(filtered),
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    totalDays: countUniqueDates(filtered),
  };
}

// --- 内部関数（テスト可能にexport） ---

export function filterByDateRange(
  snapshots: OccupancySnapshot[],
  from: Date,
  to: Date
): OccupancySnapshot[] {
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  return snapshots.filter((s) => s.date >= fromStr && s.date <= toStr);
}

export function aggregateHeatmap(snapshots: OccupancySnapshot[]): HeatmapData {
  // [weekday 0-6][hour 0-15] → { sum, count }
  const acc: { sum: number; count: number }[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: HOUR_LABELS.length }, () => ({ sum: 0, count: 0 }))
  );

  for (const s of snapshots) {
    if (s.hour < HOUR_MIN || s.hour > HOUR_MAX) continue;
    const weekday = DAY_TO_WEEKDAY[s.day];
    if (!weekday) continue;

    const wIdx = weekday - 1; // 0=Mon ... 6=Sun
    const hIdx = s.hour - HOUR_MIN;
    acc[wIdx][hIdx].sum += s.total;
    acc[wIdx][hIdx].count += 1;
  }

  let maxValue = 0;
  const matrix = acc.map((row) =>
    row.map((cell) => {
      const avg = cell.count > 0 ? cell.sum / cell.count : 0;
      if (avg > maxValue) maxValue = avg;
      return Math.round(avg * 10) / 10; // 小数1位
    })
  );

  return {
    matrix,
    weekdayLabels: WEEKDAY_LABELS,
    hourLabels: HOUR_LABELS,
    maxValue: Math.round(maxValue * 10) / 10,
  };
}

export function aggregateTrends(snapshots: OccupancySnapshot[]): TrendsData {
  // 平日/休日に分けて time → values[] を収集
  const weekdayMap = new Map<number, number[]>();
  const weekendMap = new Map<number, number[]>();

  for (const s of snapshots) {
    const time = Math.round((s.hour + s.minute / 60) * 4) / 4;
    const weekday = DAY_TO_WEEKDAY[s.day];
    if (!weekday) continue;

    const isWeekend = weekday >= 6; // 6=Sat, 7=Sun
    const map = isWeekend ? weekendMap : weekdayMap;

    const existing = map.get(time);
    if (existing) {
      existing.push(s.total);
    } else {
      map.set(time, [s.total]);
    }
  }

  const toMeans = (map: Map<number, number[]>) =>
    Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([time, values]) => ({
        time,
        total: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      }));

  return {
    weekdayMean: toMeans(weekdayMap),
    weekendMean: toMeans(weekendMap),
  };
}

export function aggregateBreakdown(snapshots: OccupancySnapshot[]): DailyBreakdown[] {
  const dateMap = new Map<string, { day: string; points: DailyBreakdown['points'] }>();

  for (const s of snapshots) {
    let entry = dateMap.get(s.date);
    if (!entry) {
      entry = { day: s.day, points: [] };
      dateMap.set(s.date, entry);
    }
    entry.points.push({
      time: Math.round((s.hour + s.minute / 60) * 4) / 4,
      building1: s.building1,
      building2: s.building2,
      total: s.total,
    });
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { day, points }]) => ({
      date,
      day,
      points: points.sort((a, b) => a.time - b.time),
    }));
}

function countUniqueDates(snapshots: OccupancySnapshot[]): number {
  return new Set(snapshots.map((s) => s.date)).size;
}
