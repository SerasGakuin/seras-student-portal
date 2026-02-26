'use client';

interface AnalysisDateRangeProps {
  from: string;  // "YYYY-MM-DD"
  to: string;
  onChange: (from: string, to: string) => void;
}

export function AnalysisDateRange({ from, to, onChange }: AnalysisDateRangeProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-md)',
      flexWrap: 'wrap',
      marginBottom: 'var(--spacing-lg)',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
        開始日
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          style={{
            padding: '10px 14px',
            fontSize: '0.9rem',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '10px',
            background: '#fff',
            color: 'var(--text-main)',
          }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
        終了日
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          style={{
            padding: '10px 14px',
            fontSize: '0.9rem',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '10px',
            background: '#fff',
            color: 'var(--text-main)',
          }}
        />
      </label>
    </div>
  );
}
