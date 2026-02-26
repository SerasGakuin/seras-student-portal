'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DailyBreakdown } from '@/types/analysis';

interface DailyBreakdownChartProps {
  data: DailyBreakdown[];
}

/** 曜日略称を日本語に変換 */
function dayLabel(day: string): string {
  const map: Record<string, string> = {
    Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土', Sun: '日',
  };
  return map[day] || day;
}

export function DailyBreakdownChart({ data }: DailyBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-sub)', fontSize: '0.9rem' }}>
        データがありません
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
    }}>
      {data.map((day, idx) => (
        <div key={day.date} style={{
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '12px',
          padding: '12px 8px 8px',
        }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            textAlign: 'center',
            marginBottom: '6px',
          }}>
            {day.date.slice(5)} ({dayLabel(day.day)})
          </div>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <AreaChart data={day.points} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[6, 23]}
                  ticks={[6, 12, 18]}
                  tickFormatter={(t) => `${t}`}
                  tick={{ fontSize: 9, fill: '#a4b0be' }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#a4b0be' }}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(t: number) => {
                    const h = Math.floor(t);
                    const m = Math.round((t - h) * 60);
                    return `${h}:${m.toString().padStart(2, '0')}`;
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    `${value ?? 0} 人`,
                    name === 'building1' ? '本館' : '2号館',
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    fontSize: '0.75rem',
                  }}
                />
                {idx === 0 && (
                  <Legend
                    formatter={(name: string) => (name === 'building1' ? '本館' : '2号館')}
                    wrapperStyle={{ fontSize: '0.7rem' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="building1"
                  stackId="1"
                  stroke="#f29f30"
                  fill="#f29f30"
                  fillOpacity={0.7}
                  name="building1"
                />
                <Area
                  type="monotone"
                  dataKey="building2"
                  stackId="1"
                  stroke="#00cec9"
                  fill="#00cec9"
                  fillOpacity={0.7}
                  name="building2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
