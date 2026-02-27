'use client';

interface MonthSelectorProps {
    month: string;          // "YYYY-MM"
    onMonthChange: (month: string) => void;
    topN: number;
    onTopNChange: (topN: number) => void;
}

const TOP_N_OPTIONS = [3, 5, 10] as const;

export function MonthSelector({ month, onMonthChange, topN, onTopNChange }: MonthSelectorProps) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                対象月
                <input
                    type="month"
                    value={month}
                    onChange={(e) => onMonthChange(e.target.value)}
                    style={{
                        padding: '10px 14px',
                        fontSize: '0.95rem',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '10px',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        outline: 'none',
                    }}
                />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                    表示人数（Top N）
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {TOP_N_OPTIONS.map((n) => (
                        <button
                            key={n}
                            onClick={() => onTopNChange(n)}
                            style={{
                                padding: '10px 18px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                border: topN === n ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '10px',
                                background: topN === n ? '#f29f30' : 'var(--card-bg)',
                                color: topN === n ? '#fff' : 'var(--text-main)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
