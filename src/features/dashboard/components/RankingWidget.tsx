import { StudentStats } from '@/services/dashboardService';

interface RankingWidgetProps {
    ranking: StudentStats[];
    periodDays: number;
    loading?: boolean;
}

export const RankingWidget = ({ ranking, periodDays, loading }: RankingWidgetProps) => {
    // Component is now Stateless & Pure
    // Data filtering is handled by the Page/API (Single Source of Truth)

    // Calculate max for bar chart background
    const maxDuration = Math.max(...ranking.map(s => s.totalDurationMinutes), 1);

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>学習時間ランキング</h2>
                </div>
                {/* Local Filters Removed (Moved to Global DashboardControls) */}
            </div>

            {loading && ranking.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.6 }}>
                    {/* Mock Skeleton Rows */}
                    {[...Array(5)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '50%' }} />
                            <div style={{ flex: 1, height: '20px', background: '#f1f5f9', borderRadius: '4px' }} />
                            <div style={{ width: '100px', height: '20px', background: '#f1f5f9', borderRadius: '4px' }} />
                        </div>
                    ))}
                </div>
            ) : ranking.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)' }}>
                    データがありません
                </div>
            ) : (
                <div style={{ overflowX: 'auto', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto' }}>
                    {/* Overlay Spinner or Text could be added here if desired, but opacity is usually sufficient for 'Wait' */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-sub)', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>順位</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>名前</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>学年</th>
                                <th style={{ padding: '12px', textAlign: 'right', width: '150px' }}>学習時間</th>
                                <th style={{ padding: '12px', textAlign: 'right', width: '80px' }}>通塾日数</th>
                                <th style={{ padding: '12px', textAlign: 'right', width: '80px' }}>通塾率</th>
                                <th style={{ padding: '12px', width: '100px' }}>比較</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((student, index) => {
                                const hours = Math.floor(student.totalDurationMinutes / 60);
                                const mins = student.totalDurationMinutes % 60;
                                const isTop3 = index < 3;

                                // Safe calculation for rate
                                const rate = periodDays > 0 ? Math.round((student.visitCount / periodDays) * 100) : 0;

                                // Bar width relative to max
                                const barPercent = Math.min((student.totalDurationMinutes / maxDuration) * 100, 100);

                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                        <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: isTop3 ? 'var(--brand-color)' : 'inherit' }}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontWeight: 700 }}>{student.name}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                                            <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{student.grade || '-'}</span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                            <span style={{ fontSize: '1.1rem' }}>{hours}</span><span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>h</span>{' '}
                                            <span style={{ fontSize: '1.1rem' }}>{mins}</span><span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>m</span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-sub)' }}>
                                            {student.visitCount}<span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '2px' }}>日</span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-sub)' }}>
                                            {rate}<span style={{ fontSize: '0.75rem' }}>%</span>
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${barPercent}%`, height: '100%', background: isTop3 ? 'var(--brand-color)' : '#94a3b8', borderRadius: '4px' }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
