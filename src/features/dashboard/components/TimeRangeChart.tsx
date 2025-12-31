import { useMemo } from 'react';
import { HeatmapDataPoint } from './ActivityHeatmap';

interface TimeRangeChartProps {
    history?: HeatmapDataPoint[];
    loading?: boolean;
}

interface TimeSegment {
    start: number;
    end: number;
}

interface DailyChartData {
    date: Date;
    segments: TimeSegment[];
    minH: number;
    maxH: number;
    attended: boolean;
}

export const TimeRangeChart = ({ history = [], loading }: TimeRangeChartProps) => {
    // Generate last 28 days template
    const days = 28;

    // Process Data & Check Value Ranges
    const { data, minDataHour, maxDataHour } = useMemo(() => {
        const today = new Date();
        today.setDate(today.getDate() - 1); // Start from yesterday
        const result: DailyChartData[] = [];
        let overallMinH = 24;
        let overallMaxH = 0;

        // Group by Date Key
        const historyMap = new Map<string, HeatmapDataPoint[]>();
        history.forEach(h => {
            const d = new Date(h.date);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            if (!historyMap.has(key)) historyMap.set(key, []);
            historyMap.get(key)!.push(h);
        });

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

            const matches = historyMap.get(key) || [];
            const segments: TimeSegment[] = [];
            let dayMin = 24;
            let dayMax = 0;
            let attended = false;

            matches.forEach(match => {
                if (match.entryTime) {
                    const entry = new Date(match.entryTime);
                    const exit = match.exitTime ? new Date(match.exitTime) : new Date(entry.getTime() + match.durationMinutes * 60000);

                    // Convert to decimal hours
                    const start = entry.getHours() + entry.getMinutes() / 60;
                    const end = exit.getHours() + exit.getMinutes() / 60;

                    if (match.durationMinutes > 0) {
                        segments.push({ start, end });
                        if (start < dayMin) dayMin = start;
                        if (end > dayMax) dayMax = end;
                        attended = true;
                    }
                }
            });

            if (attended) {
                if (dayMin < overallMinH) overallMinH = dayMin;
                if (dayMax > overallMaxH) overallMaxH = dayMax;
            }

            result.push({
                date: d,
                segments, // Can be empty
                minH: dayMin,
                maxH: dayMax,
                attended
            });
        }
        return { data: result, minDataHour: overallMinH, maxDataHour: overallMaxH };
    }, [history]);

    // Dynamic Range Calculation
    const DEFAULT_MIN = 14;
    const DEFAULT_MAX = 22.5; // 22:30

    // Safety check: if no data, use defaults. If data, use data bounds but clamp to reasonable limits if wild.
    const effectiveMin = minDataHour < 24 ? Math.floor(Math.min(minDataHour, DEFAULT_MIN)) : DEFAULT_MIN;
    const effectiveMax = maxDataHour > 0 ? Math.ceil(Math.max(maxDataHour, DEFAULT_MAX)) : DEFAULT_MAX;

    const MIN_HOUR = Math.max(5, effectiveMin); // Clamp minimal to 5:00
    const MAX_HOUR = Math.min(24, effectiveMax); // Clamp max to 24:00
    const TOTAL_HOURS = MAX_HOUR - MIN_HOUR;

    const getPosition = (hour: number) => {
        // Clamp value
        const h = Math.max(MIN_HOUR, Math.min(MAX_HOUR, hour));
        return ((h - MIN_HOUR) / TOTAL_HOURS) * 100;
    };

    const jpDays = ['日', '月', '火', '水', '木', '金', '土'];
    const getDayColor = (d: Date) => {
        const day = d.getDay();
        if (day === 6) return '#3b82f6';
        if (day === 0) return '#ef4444';
        return '#64748b';
    };

    if (loading) {
        return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.8rem' }}>Loading...</div>;
    }

    // Generate Hour ticks
    const guideTicks = [Math.floor(MIN_HOUR), 12, 18, Math.floor(MAX_HOUR)].filter((v, i, a) => a.indexOf(v) === i && v >= MIN_HOUR && v <= MAX_HOUR);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '180px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>

                </h4>
            </div>

            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', borderBottom: '1px solid #e2e8f0', marginBottom: '32px' }}>
                {/* Horizontal Guide Lines */}
                {guideTicks.map(h => (
                    <div key={h} style={{
                        position: 'absolute',
                        top: `${getPosition(h)}%`,
                        left: 0,
                        right: 0,
                        borderTop: h === 12 ? '1px solid #e2e8f0' : '1px dashed #f1f5f9',
                        zIndex: 0
                    }}>
                        <span style={{ position: 'absolute', top: -8, left: -32, fontSize: '0.6rem', color: '#64748b', textAlign: 'right', width: '28px' }}>
                            {h}:00
                        </span>
                    </div>
                ))}

                {/* Bars */}
                {data.map((day, i) => {
                    return (
                        <div key={i} style={{
                            flex: 1,
                            height: '100%',
                            position: 'relative',
                        }}>
                            {/* Render Segments */}
                            {day.segments.map((seg, segIdx) => {
                                const top = getPosition(seg.start);
                                const bottom = getPosition(seg.end);
                                const height = Math.max(bottom - top, 0.5); // Min height

                                return (
                                    <div key={segIdx} style={{
                                        position: 'absolute',
                                        top: `${top}%`,
                                        height: `${height}%`,
                                        width: '60%',
                                        left: '20%',
                                        background: 'var(--brand-color)',
                                        borderRadius: '2px',
                                        opacity: 0.85,
                                        zIndex: 1,
                                        minHeight: '2px'
                                    }} title={`${day.date.toLocaleDateString()} ${Math.floor(seg.start)}:${Math.floor((seg.start % 1) * 60).toString().padStart(2, '0')} - ${Math.floor(seg.end)}:${Math.floor((seg.end % 1) * 60).toString().padStart(2, '0')}`} />
                                );
                            })}

                            {/* Date Label (Below Axis) - Decluttered */}
                            {(i === data.length - 1 || i % 4 === 0) && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-30px',
                                    left: '50%',
                                    transform: 'translateX(-50%) rotate(-45deg)', // Rotate
                                    transformOrigin: 'top center',
                                    fontSize: '0.55rem',
                                    fontWeight: 500,
                                    color: getDayColor(day.date),
                                    whiteSpace: 'nowrap',
                                    width: '100%',
                                    textAlign: 'center'
                                }}>
                                    {day.date.getDate()}({jpDays[day.date.getDay()]})
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Spacer removed (handled by margin) */}
        </div>
    );
};
