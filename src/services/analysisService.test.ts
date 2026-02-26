import {
  aggregateHeatmap,
  aggregateTrends,
  aggregateBreakdown,
  filterByDateRange,
  percentile,
} from '@/services/analysisService';
import { OccupancySnapshot } from '@/types/analysis';

// テスト用ヘルパー: スナップショットを生成
function snap(overrides: Partial<OccupancySnapshot> = {}): OccupancySnapshot {
  return {
    timestamp: '2026-01-06T10:00:00',
    date: '2026-01-06',  // Tuesday
    day: 'Tue',
    hour: 10,
    minute: 0,
    building1: 3,
    building2: 2,
    total: 5,
    ...overrides,
  };
}

describe('analysisService', () => {
  // ===== aggregateHeatmap =====
  describe('aggregateHeatmap', () => {
    it('月曜10時のデータが正しいセルに集計される', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, total: 8 }),
      ];
      const result = aggregateHeatmap(data);

      // 月曜 = index 0, 10時 = index 3 (7時がindex 0)
      expect(result.matrix[0][3]).toBe(8);
      expect(result.weekdayLabels[0]).toBe('月');
      expect(result.hourLabels[3]).toBe(10);
    });

    it('複数データの平均が正しい', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, total: 6 }),
        snap({ date: '2026-01-12', day: 'Mon', hour: 10, total: 10 }),
      ];
      const result = aggregateHeatmap(data);

      expect(result.matrix[0][3]).toBe(8); // (6+10)/2 = 8
    });

    it('7-22時の範囲外のデータは無視される', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 5, total: 3 }),
        snap({ date: '2026-01-05', day: 'Mon', hour: 23, total: 1 }),
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, total: 7 }),
      ];
      const result = aggregateHeatmap(data);

      // 5時と23時のデータはマトリクスに含まれない
      expect(result.matrix[0][3]).toBe(7); // 10時のデータのみ
    });

    it('日曜のデータが最後の行に入る', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-11', day: 'Sun', hour: 14, total: 12 }),
      ];
      const result = aggregateHeatmap(data);

      // 日曜 = index 6, 14時 = index 7
      expect(result.matrix[6][7]).toBe(12);
      expect(result.weekdayLabels[6]).toBe('日');
    });

    it('maxValueが正しく計算される', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, total: 3 }),
        snap({ date: '2026-01-06', day: 'Tue', hour: 15, total: 15 }),
        snap({ date: '2026-01-07', day: 'Wed', hour: 12, total: 8 }),
      ];
      const result = aggregateHeatmap(data);

      expect(result.maxValue).toBe(15);
    });
  });

  // ===== percentile =====
  describe('percentile', () => {
    it('空配列で0を返す', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('1要素で常にその値を返す', () => {
      expect(percentile([7], 10)).toBe(7);
      expect(percentile([7], 90)).toBe(7);
    });

    it('P50が中央値になる', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('P25/P75が正しい', () => {
      // [1,2,3,4,5] -> P25=2, P75=4
      expect(percentile([1, 2, 3, 4, 5], 25)).toBe(2);
      expect(percentile([1, 2, 3, 4, 5], 75)).toBe(4);
    });

    it('偶数個の配列で線形補間される', () => {
      // [2, 4, 6, 8] -> P50 = 5 (idx=1.5 -> 4 + (6-4)*0.5 = 5)
      expect(percentile([2, 4, 6, 8], 50)).toBe(5);
    });
  });

  // ===== aggregateTrends =====
  describe('aggregateTrends', () => {
    it('平日と休日が正しく分離される', () => {
      const data: OccupancySnapshot[] = [
        // 平日 (Mon)
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 0, total: 5 }),
        // 休日 (Sat)
        snap({ date: '2026-01-10', day: 'Sat', hour: 10, minute: 0, total: 10 }),
      ];
      const result = aggregateTrends(data);

      expect(result.weekdayMean.length).toBeGreaterThan(0);
      expect(result.weekendMean.length).toBeGreaterThan(0);

      const weekdayPoint = result.weekdayMean.find(p => p.time === 10);
      const weekendPoint = result.weekendMean.find(p => p.time === 10);
      expect(weekdayPoint?.total).toBe(5);
      expect(weekendPoint?.total).toBe(10);
    });

    it('同じ時刻の複数日データが平均される', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 0, total: 4 }),
        snap({ date: '2026-01-06', day: 'Tue', hour: 10, minute: 0, total: 8 }),
        snap({ date: '2026-01-07', day: 'Wed', hour: 10, minute: 0, total: 6 }),
      ];
      const result = aggregateTrends(data);

      const point = result.weekdayMean.find(p => p.time === 10);
      expect(point?.total).toBe(6); // (4+8+6)/3 = 6
    });

    it('15分刻みの時刻が保持される', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 15, total: 5 }),
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 30, total: 7 }),
      ];
      const result = aggregateTrends(data);

      const pt1 = result.weekdayMean.find(p => p.time === 10.25);
      const pt2 = result.weekdayMean.find(p => p.time === 10.5);
      expect(pt1?.total).toBe(5);
      expect(pt2?.total).toBe(7);
    });

    it('パーセンタイル統計量が含まれる', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 0, total: 2 }),
        snap({ date: '2026-01-06', day: 'Tue', hour: 10, minute: 0, total: 4 }),
        snap({ date: '2026-01-07', day: 'Wed', hour: 10, minute: 0, total: 6 }),
        snap({ date: '2026-01-08', day: 'Thu', hour: 10, minute: 0, total: 8 }),
        snap({ date: '2026-01-09', day: 'Fri', hour: 10, minute: 0, total: 10 }),
      ];
      const result = aggregateTrends(data);

      const point = result.weekdayMean.find(p => p.time === 10);
      expect(point).toBeDefined();
      expect(point!.total).toBe(6);   // mean = (2+4+6+8+10)/5 = 6
      expect(point!.p10).toBeDefined();
      expect(point!.p25).toBeDefined();
      expect(point!.p75).toBeDefined();
      expect(point!.p90).toBeDefined();
      // p25=4, p75=8 for [2,4,6,8,10]
      expect(point!.p25).toBe(4);
      expect(point!.p75).toBe(8);
    });
  });

  // ===== aggregateBreakdown =====
  describe('aggregateBreakdown', () => {
    it('各日付が独立したオブジェクトになる', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, building1: 3, building2: 2, total: 5 }),
        snap({ date: '2026-01-06', day: 'Tue', hour: 11, building1: 4, building2: 3, total: 7 }),
      ];
      const result = aggregateBreakdown(data);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-01-05');
      expect(result[0].day).toBe('Mon');
      expect(result[1].date).toBe('2026-01-06');
      expect(result[1].day).toBe('Tue');
    });

    it('各日付のポイントに正しいデータが含まれる', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 0, building1: 3, building2: 2, total: 5 }),
        snap({ date: '2026-01-05', day: 'Mon', hour: 10, minute: 15, building1: 4, building2: 3, total: 7 }),
      ];
      const result = aggregateBreakdown(data);

      expect(result).toHaveLength(1);
      expect(result[0].points).toHaveLength(2);
      expect(result[0].points[0]).toEqual({ time: 10, building1: 3, building2: 2, total: 5 });
      expect(result[0].points[1]).toEqual({ time: 10.25, building1: 4, building2: 3, total: 7 });
    });

    it('日付順にソートされる', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-07', day: 'Wed' }),
        snap({ date: '2026-01-05', day: 'Mon' }),
        snap({ date: '2026-01-06', day: 'Tue' }),
      ];
      const result = aggregateBreakdown(data);

      expect(result[0].date).toBe('2026-01-05');
      expect(result[1].date).toBe('2026-01-06');
      expect(result[2].date).toBe('2026-01-07');
    });
  });

  // ===== 空データ処理 =====
  describe('空データ処理', () => {
    it('空配列でヒートマップがエラーにならない', () => {
      const result = aggregateHeatmap([]);

      expect(result.matrix).toHaveLength(7);
      expect(result.matrix[0]).toHaveLength(16);
      expect(result.maxValue).toBe(0);
    });

    it('空配列でトレンドがエラーにならない', () => {
      const result = aggregateTrends([]);

      expect(result.weekdayMean).toEqual([]);
      expect(result.weekendMean).toEqual([]);
    });

    it('空配列で内訳がエラーにならない', () => {
      const result = aggregateBreakdown([]);

      expect(result).toEqual([]);
    });
  });

  // ===== filterByDateRange =====
  describe('filterByDateRange', () => {
    it('from/to 範囲外のデータが除外される', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-01' }),
        snap({ date: '2026-01-05' }),
        snap({ date: '2026-01-10' }),
        snap({ date: '2026-01-15' }),
        snap({ date: '2026-01-20' }),
      ];
      const result = filterByDateRange(data, new Date('2026-01-05'), new Date('2026-01-15'));

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2026-01-05');
      expect(result[2].date).toBe('2026-01-15');
    });

    it('範囲の境界値が含まれる', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-05' }),
        snap({ date: '2026-01-10' }),
      ];
      const result = filterByDateRange(data, new Date('2026-01-05'), new Date('2026-01-10'));

      expect(result).toHaveLength(2);
    });

    it('全データが範囲外の場合、空配列を返す', () => {
      const data: OccupancySnapshot[] = [
        snap({ date: '2026-01-01' }),
        snap({ date: '2026-01-02' }),
      ];
      const result = filterByDateRange(data, new Date('2026-02-01'), new Date('2026-02-28'));

      expect(result).toHaveLength(0);
    });
  });
});
