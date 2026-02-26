'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendsData, TrendsPoint } from '@/types/analysis';

interface DailyTrendsChartProps {
  data: TrendsData;
}

/** TrendsPoint[] をチャート用のフラットデータに変換 */
function buildChartData(
  weekday: TrendsPoint[],
  weekend: TrendsPoint[]
) {
  const timeSet = new Set<number>();
  for (const p of weekday) timeSet.add(p.time);
  for (const p of weekend) timeSet.add(p.time);

  const wdMap = new Map(weekday.map((p) => [p.time, p]));
  const weMap = new Map(weekend.map((p) => [p.time, p]));

  return Array.from(timeSet)
    .sort((a, b) => a - b)
    .filter((t) => t >= 6 && t <= 23)
    .map((time) => {
      const wd = wdMap.get(time);
      const we = weMap.get(time);
      return {
        time,
        // 平日
        wdMean: wd?.total ?? null,
        wdBandOuter: wd ? [wd.p10, wd.p90] as [number, number] : null,
        wdBandInner: wd ? [wd.p25, wd.p75] as [number, number] : null,
        // 休日
        weMean: we?.total ?? null,
        weBandOuter: we ? [we.p10, we.p90] as [number, number] : null,
        weBandInner: we ? [we.p25, we.p75] as [number, number] : null,
      };
    });
}

export function DailyTrendsChart({ data }: DailyTrendsChartProps) {
  const chartData = buildChartData(data.weekdayMean, data.weekendMean);

  const formatTime = (t: number) => {
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dfe6e9" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[6, 23]}
            ticks={[6, 9, 12, 15, 18, 21]}
            tickFormatter={(t) => `${t}時`}
            tick={{ fontSize: 12, fill: '#a4b0be' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#a4b0be' }}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={formatTime}
            formatter={(value: number | [number, number] | undefined, name: string | undefined) => {
              if (Array.isArray(value)) return null;
              const labels: Record<string, string> = {
                wdMean: '平日平均',
                weMean: '土日平均',
              };
              const label = labels[name ?? ''];
              if (!label) return null;
              return [`${(value ?? 0).toFixed(1)} 人`, label];
            }}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)',
              fontSize: '0.82rem',
            }}
          />

          {/* 平日 P10-P90 (薄いバンド) */}
          <Area
            type="monotone"
            dataKey="wdBandOuter"
            stroke="none"
            fill="#6c5ce7"
            fillOpacity={0.08}
            connectNulls
            legendType="none"
          />
          {/* 平日 P25-P75 (濃いバンド) */}
          <Area
            type="monotone"
            dataKey="wdBandInner"
            stroke="none"
            fill="#6c5ce7"
            fillOpacity={0.15}
            connectNulls
            legendType="none"
          />
          {/* 休日 P10-P90 (薄いバンド) */}
          <Area
            type="monotone"
            dataKey="weBandOuter"
            stroke="none"
            fill="#ff7675"
            fillOpacity={0.08}
            connectNulls
            legendType="none"
          />
          {/* 休日 P25-P75 (濃いバンド) */}
          <Area
            type="monotone"
            dataKey="weBandInner"
            stroke="none"
            fill="#ff7675"
            fillOpacity={0.15}
            connectNulls
            legendType="none"
          />

          {/* 平日平均線 */}
          <Line
            type="monotone"
            dataKey="wdMean"
            stroke="#6c5ce7"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            name="wdMean"
          />
          {/* 休日平均線 */}
          <Line
            type="monotone"
            dataKey="weMean"
            stroke="#ff7675"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            name="weMean"
          />

          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                wdMean: '平日平均（P25-P75 / P10-P90）',
                weMean: '土日平均（P25-P75 / P10-P90）',
              };
              return labels[value] ?? value;
            }}
            wrapperStyle={{ fontSize: '0.82rem' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
