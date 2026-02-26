'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendsData } from '@/types/analysis';

interface DailyTrendsChartProps {
  data: TrendsData;
}

export function DailyTrendsChart({ data }: DailyTrendsChartProps) {
  // 平日・休日のデータを同じ time キーでマージ
  const timeSet = new Set<number>();
  for (const p of data.weekdayMean) timeSet.add(p.time);
  for (const p of data.weekendMean) timeSet.add(p.time);

  const weekdayMap = new Map(data.weekdayMean.map((p) => [p.time, p.total]));
  const weekendMap = new Map(data.weekendMean.map((p) => [p.time, p.total]));

  const merged = Array.from(timeSet)
    .sort((a, b) => a - b)
    .filter((t) => t >= 6 && t <= 23)
    .map((time) => ({
      time,
      weekday: weekdayMap.get(time) ?? null,
      weekend: weekendMap.get(time) ?? null,
    }));

  const formatTime = (t: number) => {
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
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
            formatter={(value: number | undefined, name: string | undefined) => [
              `${(value ?? 0).toFixed(1)} 人`,
              name === 'weekday' ? '平日平均' : '土日平均',
            ]}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)',
              fontSize: '0.82rem',
            }}
          />
          <Legend
            formatter={(value: string) => (value === 'weekday' ? '平日平均' : '土日平均')}
            wrapperStyle={{ fontSize: '0.82rem' }}
          />
          <Line
            type="monotone"
            dataKey="weekday"
            stroke="#6c5ce7"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            name="weekday"
          />
          <Line
            type="monotone"
            dataKey="weekend"
            stroke="#ff7675"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            name="weekend"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
