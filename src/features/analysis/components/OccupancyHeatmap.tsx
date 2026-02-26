'use client';

import { HeatmapData } from '@/types/analysis';

interface OccupancyHeatmapProps {
  data: HeatmapData;
}

/** 値に基づいて白→ブランドカラー→濃い橙のグラデーション色を返す */
function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return '#ffffff';
  const ratio = Math.min(value / max, 1);

  // 白(255,255,255) → ブランド(242,159,48) → 濃橙(211,84,0)
  let r: number, g: number, b: number;
  if (ratio <= 0.5) {
    const t = ratio * 2;
    r = Math.round(255 + (242 - 255) * t);
    g = Math.round(255 + (159 - 255) * t);
    b = Math.round(255 + (48 - 255) * t);
  } else {
    const t = (ratio - 0.5) * 2;
    r = Math.round(242 + (211 - 242) * t);
    g = Math.round(159 + (84 - 159) * t);
    b = Math.round(48 + (0 - 48) * t);
  }

  return `rgb(${r},${g},${b})`;
}

export function OccupancyHeatmap({ data }: OccupancyHeatmapProps) {
  const { matrix, weekdayLabels, hourLabels, maxValue } = data;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        borderCollapse: 'separate',
        borderSpacing: '2px',
        width: '100%',
        minWidth: '600px',
      }}>
        <thead>
          <tr>
            <th style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-sub)',
              textAlign: 'center',
            }} />
            {hourLabels.map((h) => (
              <th key={h} style={{
                padding: '6px 4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-sub)',
                textAlign: 'center',
                minWidth: '36px',
              }}>
                {h}時
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, wIdx) => (
            <tr key={wIdx}>
              <td style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                {weekdayLabels[wIdx]}
              </td>
              {row.map((val, hIdx) => (
                <td key={hIdx} style={{
                  padding: '8px 4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: getHeatColor(val, maxValue),
                  color: val > maxValue * 0.6 ? '#fff' : 'var(--text-main)',
                  borderRadius: '4px',
                  minWidth: '36px',
                }}>
                  {val > 0 ? val.toFixed(1) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* カラーバー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '12px',
        fontSize: '0.72rem',
        color: 'var(--text-sub)',
      }}>
        <span>0</span>
        <div style={{
          width: '120px',
          height: '10px',
          borderRadius: '5px',
          background: 'linear-gradient(to right, #ffffff, #f29f30, #d35400)',
          border: '1px solid rgba(0,0,0,0.08)',
        }} />
        <span>{maxValue.toFixed(1)}</span>
        <span style={{ marginLeft: '4px' }}>人</span>
      </div>
    </div>
  );
}
