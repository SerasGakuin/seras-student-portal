import { useMemo } from 'react';

// Data Interface (Shared)
export interface HeatmapDataPoint {
    date: string; // ISO string
    durationMinutes: number;
    // For TimeRangeChart mainly, but shared type usage
    entryTime?: string;
    exitTime?: string;
}

interface ActivityHeatmapProps {
    history?: HeatmapDataPoint[]; // Real data
    loading?: boolean;
}

// Helper to generate last 28 days dates
const getRecentDates = (days: number) => {
    const dates = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d);
    }
    return dates;
};

const CELL_SIZE = 32;
const GAP = 4;

export const ActivityHeatmap = ({ history = [], loading }: ActivityHeatmapProps) => {
    // 1. Generate Calendar Slots (Last 28 Days)
    const days = 28;

    // Map history for quick lookup (Summing multiple entries per day)
    const historyMap = useMemo(() => {
        const map = new Map<string, number>();
        history.forEach(h => {
            const d = new Date(h.date);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            const current = map.get(key) || 0;
            map.set(key, current + h.durationMinutes);
        });
        return map;
    }, [history]);

    const data = useMemo(() => {
        const dates = getRecentDates(days);
        return dates.map(date => {
            const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            return {
                date,
                value: historyMap.get(key) || 0
            };
        });
    }, [historyMap]);

    // 2. Structuring for Calendar Grid
    // Calculate start date to align to Monday
    // If data is empty (just initialized), use today as reference
    const baseDate = data.length > 0 ? data[0].date : new Date();
    const startDate = new Date(baseDate);
    const dayOfWeek = (startDate.getDay() + 6) % 7; // Mon=0
    startDate.setDate(startDate.getDate() - dayOfWeek); // Go back to Monday

    const gridData = [];
    const currentDateIter = new Date(startDate);
    const endDate = data.length > 0 ? data[data.length - 1].date : new Date();



    // Create necessary weeks covers
    while (currentDateIter <= endDate || gridData.length % 7 !== 0) {
        const match = data.find(d => d.date.toDateString() === currentDateIter.toDateString());
        gridData.push({
            date: new Date(currentDateIter),
            value: match ? match.value : 0,
            hasData: !!match
        });
        currentDateIter.setDate(currentDateIter.getDate() + 1);

        if (gridData.length > 50) break;
    }

    const chunkedWeeks = [];
    for (let i = 0; i < gridData.length; i += 7) {
        chunkedWeeks.push(gridData.slice(i, i + 7));
    }

    const getColor = (minutes: number) => {
        if (minutes === 0) return '#f8fafc';
        if (minutes < 60) return '#fff7ed';
        if (minutes < 120) return '#fed7aa';
        if (minutes < 180) return '#fdba74';
        return 'var(--brand-color)';
    };

    const weekDays = [
        { label: '月', color: '#64748b' },
        { label: '火', color: '#64748b' },
        { label: '水', color: '#64748b' },
        { label: '木', color: '#64748b' },
        { label: '金', color: '#64748b' },
        { label: '土', color: '#3b82f6' },
        { label: '日', color: '#ef4444' },
    ];

    if (loading) {
        return <div style={{ height: '220px', width: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.8rem' }}>Loading...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Minimal Header (Legend Only) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: 8, height: 8, background: '#f8fafc', borderRadius: 2 }} title="0分" />
                    <div style={{ width: 8, height: 8, background: '#fff7ed', borderRadius: 2 }} title="1時間未満" />
                    <div style={{ width: 8, height: 8, background: '#fed7aa', borderRadius: 2 }} title="2時間未満" />
                    <div style={{ width: 8, height: 8, background: '#fdba74', borderRadius: 2 }} title="3時間未満" />
                    <div style={{ width: 8, height: 8, background: 'var(--brand-color)', borderRadius: 2 }} title="3時間以上" />
                </div>
            </div>

            {/* Grid */}
            <div style={{ alignSelf: 'center' }}>
                <div style={{ display: 'flex', gap: `${GAP}px`, marginBottom: '6px' }}>
                    {weekDays.map((d, i) => (
                        <div key={i} style={{
                            width: `${CELL_SIZE}px`,
                            textAlign: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: d.color
                        }}>
                            {d.label}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
                    {chunkedWeeks.map((week, weekIndex) => (
                        <div key={weekIndex} style={{ display: 'flex', gap: `${GAP}px` }}>
                            {week.map((day, dayIndex) => {
                                const dayNum = day.date.getDay();
                                const dateColor = dayNum === 6 ? '#3b82f6' : dayNum === 0 ? '#ef4444' : '#94a3b8';
                                const isDark = day.value > 120;

                                return (
                                    <div
                                        key={dayIndex}
                                        style={{
                                            width: `${CELL_SIZE}px`,
                                            height: `${CELL_SIZE}px`,
                                            background: getColor(day.value),
                                            borderRadius: '6px',
                                            position: 'relative',
                                            cursor: 'default'
                                        }}
                                        title={`${day.date.toLocaleDateString()}: ${Math.floor(day.value / 60)}h ${day.value % 60}m`}
                                    >
                                        <span style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            right: '3px',
                                            fontSize: '0.55rem',
                                            color: isDark ? 'rgba(255,255,255,0.9)' : dateColor,
                                            fontWeight: 600,
                                            pointerEvents: 'none'
                                        }}>
                                            {day.date.getDate()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
