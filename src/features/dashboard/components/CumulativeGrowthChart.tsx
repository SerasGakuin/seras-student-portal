import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface CumulativeGrowthChartProps {
    data: {
        date: string;
        [key: string]: number | string;
    }[];
    loading?: boolean;
    selectedStudents: string[];
    onSelectionChange: (students: string[]) => void;
}

// Sophisticated Palette (Vibrant yet Professional)
const GRADIENT_STOPS = [
    { r: 116, g: 0, b: 19 },    // #740013
    { r: 182, g: 0, b: 15 },    // #b6000f
    { r: 254, g: 39, b: 19 },   // #fe2713
    { r: 255, g: 129, b: 75 },  // #ff814b
    { r: 255, g: 200, b: 131 }  // #ffc883
];

const interpolateColor = (color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }, factor: number) => {
    const result = {
        r: Math.round(color1.r + (color2.r - color1.r) * factor),
        g: Math.round(color1.g + (color2.g - color1.g) * factor),
        b: Math.round(color1.b + (color2.b - color1.b) * factor)
    };
    return `rgb(${result.r}, ${result.g}, ${result.b})`;
};

const getGradientColors = (count: number): string[] => {
    if (count <= 1) return [`rgb(${GRADIENT_STOPS[0].r}, ${GRADIENT_STOPS[0].g}, ${GRADIENT_STOPS[0].b})`];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1); // 0 to 1
        const segmentLength = 1 / (GRADIENT_STOPS.length - 1);
        const segmentIndex = Math.min(Math.floor(t / segmentLength), GRADIENT_STOPS.length - 2);
        const segmentStartT = segmentIndex * segmentLength;
        const localT = (t - segmentStartT) / segmentLength;
        colors.push(interpolateColor(GRADIENT_STOPS[segmentIndex], GRADIENT_STOPS[segmentIndex + 1], localT));
    }
    return colors;
};

import styles from './CumulativeGrowthChart.module.css';

// ... (imports remain)

// ... (GRADIENT_STOPS, interpolateColor, getGradientColors remain)

export const CumulativeGrowthChart = ({ data, loading, selectedStudents, onSelectionChange }: CumulativeGrowthChartProps) => {
    const [hoveredStudent, setHoveredStudent] = useState<string | null>(null);

    if (!data || data.length === 0) {
        return <div style={{ padding: '40px', color: 'var(--text-sub)', textAlign: 'center' }}>データがありません</div>;
    }

    // Extract student names (keys excluding 'date')
    const allKeys = Object.keys(data[0]).filter(k => k !== 'date');

    // Sort keys by final value (descending)
    const finalRow = data[data.length - 1];
    const sortedKeys = allKeys.sort((a, b) => {
        const valA = Number(finalRow[a] || 0);
        const valB = Number(finalRow[b] || 0);
        return valB - valA;
    });

    const toggleSelection = (student: string) => {
        if (selectedStudents.includes(student)) {
            onSelectionChange(selectedStudents.filter((s: string) => s !== student));
        } else {
            onSelectionChange([...selectedStudents, student]);
        }
    };

    const clearSelection = () => onSelectionChange([]);

    // Custom Dot Render for Last Point (Today)
    const renderLastDot = (props: { cx?: number, cy?: number, index?: number }, studentKey: string, color: string) => {
        const { cx, cy, index } = props;
        if (index !== data.length - 1) return null;

        const isSelected = selectedStudents.includes(studentKey);
        const isHovered = hoveredStudent === studentKey;
        const anySelection = selectedStudents.length > 0;

        let opacity = 1;
        if (anySelection) {
            if (!isSelected && !isHovered) opacity = 0.1;
        } else {
            if (hoveredStudent && !isHovered) opacity = 0.1;
        }

        return (
            <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={2} opacity={opacity} style={{ transition: 'opacity 0.2s' }} />
        );
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    学習時間の累積
                </h2>
            </div>

            {loading && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-sub)' }}>Loading...</div>
                </div>
            )}

            <div className={loading ? styles.contentWrapperLoading : styles.contentWrapper}>
                {/* Chart Area */}
                <div className={styles.chartArea}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                            onMouseLeave={() => setHoveredStudent(null)}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'var(--font-geist-sans)' }}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickMargin={12}
                                tickFormatter={(val) => {
                                    if (val === 'Start') return 'Start'; // Handle Origin Label
                                    const parts = val.split('/');
                                    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
                                }}
                            />
                            <YAxis
                                unit="h"
                                tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'var(--font-geist-sans)' }}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                            />
                            {sortedKeys.map((key, index) => {
                                const dynamicColors = getGradientColors(sortedKeys.length);
                                const color = dynamicColors[index];

                                const isSelected = selectedStudents.includes(key);
                                const isHovered = hoveredStudent === key;
                                const anySelection = selectedStudents.length > 0;

                                let strokeWidth = 2;
                                let strokeOpacity = 0.8;

                                if (anySelection) {
                                    if (isSelected || isHovered) {
                                        strokeWidth = 3;
                                        strokeOpacity = 1;
                                    } else {
                                        strokeOpacity = 0.1;
                                    }
                                } else {
                                    if (isHovered) {
                                        strokeWidth = 4;
                                        strokeOpacity = 1;
                                    } else if (hoveredStudent) {
                                        strokeOpacity = 0.1;
                                    }
                                }

                                return (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={color}
                                        strokeWidth={strokeWidth}
                                        strokeOpacity={strokeOpacity}
                                        dot={(props) => renderLastDot(props, key, color)}
                                        activeDot={false}
                                        connectNulls
                                        isAnimationActive={false}
                                        onMouseEnter={() => setHoveredStudent(key)}
                                        onClick={() => toggleSelection(key)}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'stroke-width 0.2s, stroke-opacity 0.2s'
                                        }}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.sidebar}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', height: '28px',
                        padding: '0 8px', // Align header with items
                        flexShrink: 0
                    }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>生徒</div>

                        {selectedStudents.length === 0 ? (
                            <div style={{ fontSize: '0.7rem', color: '#a1a8b1ff', fontWeight: 500, animation: 'fadeIn 0.3s' }}>
                                クリックして比較
                            </div>
                        ) : (
                            <button
                                onClick={clearSelection}
                                style={{
                                    fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', border: 'none',
                                    backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 600,
                                    transition: 'all 0.2s', animation: 'fadeIn 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                クリア ({selectedStudents.length})
                            </button>
                        )}
                    </div>
                    <div style={{ flex: 1, paddingRight: '4px', overflowY: 'auto' }}>
                        {sortedKeys.map((key, index) => {
                            const dynamicColors = getGradientColors(sortedKeys.length);
                            const color = dynamicColors[index];
                            const isSelected = selectedStudents.includes(key);
                            const isHovered = hoveredStudent === key;
                            const anySelection = selectedStudents.length > 0;
                            const finalValue = Number(finalRow[key] || 0);

                            // Opacity Logic
                            let opacity = 1;
                            if (anySelection) {
                                if (!isSelected && !isHovered) opacity = 0.4;
                            } else {
                                if (hoveredStudent && !isHovered) opacity = 0.4;
                            }

                            const bg = (isSelected || isHovered) ? 'rgba(0,0,0,0.03)' : 'transparent';

                            return (
                                <div
                                    key={key}
                                    onMouseEnter={() => setHoveredStudent(key)}
                                    onMouseLeave={() => setHoveredStudent(null)}
                                    onClick={() => toggleSelection(key)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '2px',
                                        backgroundColor: bg, opacity: opacity, transition: 'all 0.2s', position: 'relative'
                                    }}
                                >
                                    {/* Left: Indicator & Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1, paddingLeft: '4px' }}>
                                        <div style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: color, flexShrink: 0,
                                            boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : 'none',
                                            transition: 'box-shadow 0.2s',
                                            margin: '1px' // Micro adjustment for visual centering with shadow
                                        }} />
                                        <span style={{
                                            fontSize: '0.9rem', color: 'var(--text-main)',
                                            fontWeight: (isSelected || isHovered) ? 600 : 500,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>
                                            {key}
                                        </span>
                                    </div>

                                    {/* Right: Value & Action Icon */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                                            {finalValue}h
                                        </span>

                                        {/* Status Icon Area (Fixed width to prevent jumping) */}
                                        <div style={{ width: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {isSelected ? (
                                                <span style={{ color: color, fontSize: '0.9rem', fontWeight: 800 }}>✓</span>
                                            ) : isHovered ? (
                                                <span style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1 }}>+</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
