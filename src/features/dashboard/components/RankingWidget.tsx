import { useState, Fragment } from 'react';
import { api } from '@/lib/api';
import { StudentStats } from '@/services/dashboardService';
import { ChevronDown, ChevronUp, Clock, Calendar, Crown, Sunrise, Moon, CalendarDays, Timer, Zap, Flame } from 'lucide-react';
import { ActivityHeatmap, HeatmapDataPoint } from './ActivityHeatmap';
import { TimeRangeChart } from './TimeRangeChart';
import { StudentBadgesMap } from '@/services/badgeService';

const getBadgeIcon = (type: string) => {
    switch (type) {
        case 'HEAVY_USER': return <Crown size={16} color="var(--brand-color)" />;
        case 'EARLY_BIRD': return <Sunrise size={16} color="var(--brand-color)" />;
        case 'NIGHT_OWL': return <Moon size={16} color="var(--brand-color)" />;
        case 'CONSISTENT': return <CalendarDays size={16} color="var(--brand-color)" />;
        case 'MARATHON': return <Timer size={16} color="var(--brand-color)" />;
        case 'RISING_STAR': return <Zap size={16} color="var(--brand-color)" />;
        default: return null;
    }
};

const getBadgeLabel = (type: string) => {
    switch (type) {
        case 'HEAVY_USER': return 'トップランカー';
        case 'EARLY_BIRD': return '早起きマスター';
        case 'NIGHT_OWL': return '深夜マスター';
        case 'CONSISTENT': return '皆勤賞候補';
        case 'MARATHON': return '長時間マスター';
        case 'RISING_STAR': return '急上昇';
        default: return '';
    }
};

interface RankingWidgetProps {
    ranking: StudentStats[];
    periodDays: number;
    loading?: boolean;
    badges?: StudentBadgesMap;
    viewerId?: string | null;
}

export const RankingWidget = ({ ranking, periodDays, loading, badges, viewerId }: RankingWidgetProps) => {
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [expandedData, setExpandedData] = useState<{ history: HeatmapDataPoint[]; maxConsecutiveDays: number } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Calculate max for bar chart background
    const maxDuration = Math.max(...ranking.map(s => s.totalDurationMinutes), 1);

    const toggleExpand = async (studentName: string) => {
        if (expandedStudent === studentName) {
            setExpandedStudent(null);
            setExpandedData(null);
            return;
        }

        setExpandedStudent(studentName);
        setDetailLoading(true);
        setExpandedData(null); // Clear previous

        try {
            const data = await api.dashboard.getStudentDetail(viewerId, studentName);
            setExpandedData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>学習時間ランキング</h2>
                </div>
            </div>

            {loading && ranking.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.6 }}>
                    {/* Mock Skeleton Rows */}
                    {[...Array(5)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                            <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '50%' }} />
                            <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '4px' }} />
                            <div style={{ width: '100px', height: '24px', background: '#f1f5f9', borderRadius: '4px' }} />
                        </div>
                    ))}
                </div>
            ) : ranking.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-sub)' }}>
                    データがありません
                </div>
            ) : (
                <div style={{ overflowX: 'auto', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-sub)', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <th style={{ padding: '16px', textAlign: 'center', width: '60px' }}>順位</th>
                                <th style={{ padding: '16px', textAlign: 'left' }}>名前</th>
                                <th style={{ padding: '16px', textAlign: 'center', width: '80px' }}>学年</th>
                                <th style={{ padding: '16px', textAlign: 'right', width: '150px' }}>学習時間</th>
                                <th style={{ padding: '16px', textAlign: 'right', width: '80px' }}>通塾日数</th>
                                <th style={{ padding: '16px', textAlign: 'right', width: '80px' }}>通塾率</th>
                                <th style={{ padding: '16px', width: '100px' }}>比較</th>
                                <th style={{ width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((student, index) => {
                                const hours = Math.floor(student.totalDurationMinutes / 60);
                                const mins = student.totalDurationMinutes % 60;
                                const isTop3 = index < 3;
                                const isExpanded = expandedStudent === student.name;

                                // Safe calculation for rate
                                const rate = periodDays > 0 ? Math.round((student.visitCount / periodDays) * 100) : 0;

                                // Bar width relative to max
                                const barPercent = Math.min((student.totalDurationMinutes / maxDuration) * 100, 100);

                                return (
                                    <Fragment key={student.name}>
                                        <tr
                                            onClick={() => toggleExpand(student.name)}
                                            style={{
                                                borderBottom: isExpanded ? 'none' : '1px solid rgba(0,0,0,0.03)',
                                                cursor: 'pointer',
                                                background: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => !isExpanded && (e.currentTarget.style.background = 'rgba(0,0,0,0.01)')}
                                            onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '24px 16px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: isTop3 ? 'var(--brand-color)' : 'inherit' }}>
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                            </td>
                                            <td style={{ padding: '24px 16px', fontWeight: 700 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {student.name}
                                                        {badges && badges[student.name] && (
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                {badges[student.name].map((b, i) => (
                                                                    <span key={i} title={`${getBadgeLabel(b.type)}: ${b.value || ''}`} style={{ cursor: 'help', fontSize: '1rem' }}>
                                                                        {getBadgeIcon(b.type)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Google Docs/Sheets Links - Right Aligned */}
                                                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                                        {student.docLink && (
                                                            <a
                                                                href={student.docLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Googleドキュメント"
                                                                style={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <img src="/icons/google-docs.svg" alt="Docs" width={24} height={24} />
                                                            </a>
                                                        )}
                                                        {student.sheetLink && (
                                                            <a
                                                                href={student.sheetLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Googleスプレッドシート"
                                                                style={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <img src="/icons/google-sheets.svg" alt="Sheets" width={24} height={24} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                                                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{student.grade || '-'}</span>
                                            </td>
                                            <td style={{ padding: '24px 16px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                                <span style={{ fontSize: '1.1rem' }}>{hours}</span><span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>h</span>{' '}
                                                <span style={{ fontSize: '1.1rem' }}>{mins}</span><span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>m</span>
                                            </td>
                                            <td style={{ padding: '24px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-sub)' }}>
                                                {student.visitCount}<span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '2px' }}>日</span>
                                            </td>
                                            <td style={{ padding: '24px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-sub)' }}>
                                                {rate}<span style={{ fontSize: '0.75rem' }}>%</span>
                                            </td>
                                            <td style={{ padding: '24px 16px' }}>
                                                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${barPercent}%`, height: '100%', background: isTop3 ? 'var(--brand-color)' : '#94a3b8', borderRadius: '4px' }} />
                                                </div>
                                            </td>
                                            <td style={{ padding: '24px 16px', color: 'var(--text-sub)' }}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr key={`${student.name}-detail`} style={{ background: 'rgba(0,0,0,0.02)' }}>
                                                <td colSpan={8} style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                    <div style={{
                                                        background: 'white',
                                                        borderRadius: '12px',
                                                        padding: '24px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                        marginTop: '8px'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                                                    {student.name}
                                                                </h4>

                                                                {/* Summary Stats */}
                                                                <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <Clock size={15} style={{ color: 'var(--text-sub)', marginRight: '6px' }} />
                                                                        <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                                                                            平均して
                                                                            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem', margin: '0 4px' }}>
                                                                                {student.visitCount > 0
                                                                                    ? `${Math.floor((student.totalDurationMinutes / student.visitCount) / 60)}時間${Math.round((student.totalDurationMinutes / student.visitCount) % 60)}分`
                                                                                    : '-'}
                                                                            </span>
                                                                            滞在
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <Calendar size={15} style={{ color: 'var(--text-sub)', marginRight: '6px' }} />
                                                                        <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                                                                            最後は
                                                                            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem', margin: '0 4px' }}>
                                                                                {student.lastVisit ? (() => {
                                                                                    const d = new Date(student.lastVisit);
                                                                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                                                                })() : '-'}
                                                                            </span>
                                                                            に通塾
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <Flame size={15} style={{ color: 'var(--brand-color)', marginRight: '6px' }} />
                                                                        <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                                                                            最大
                                                                            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem', margin: '0 4px' }}>
                                                                                {expandedData?.maxConsecutiveDays || 0}日連続
                                                                            </span>
                                                                            通塾
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action / Tag (Simplified) */}
                                                            {isTop3 && (
                                                                <span style={{ fontSize: '0.8rem', background: '#fff7ed', color: '#ea580c', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                                                                    🏆 トップランカー
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Visualizations Container */}
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '80px' }}>
                                                            {/* Left: Heatmap */}
                                                            <div style={{ flex: '0 0 auto' }}>
                                                                <ActivityHeatmap history={expandedData?.history || []} loading={detailLoading} />
                                                            </div>

                                                            {/* Right: Time Range Chart */}
                                                            <div style={{ flex: 1, minWidth: '300px' }}>
                                                                <TimeRangeChart history={expandedData?.history || []} loading={detailLoading} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Badge Legend */}
            <div style={{
                marginTop: '40px',
                padding: '24px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '12px'
            }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-sub)' }}>
                    バッジ解説
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Crown size={18} color="var(--brand-color)" />
                        <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>トップランカー</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginLeft: '8px' }}>総学習時間TOP3</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sunrise size={18} color="var(--brand-color)" />
                        <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>早起きマスター</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginLeft: '8px' }}>朝4〜9時の学習TOP3</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Moon size={18} color="var(--brand-color)" />
                        <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>深夜マスター</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginLeft: '8px' }}>夜20時以降の学習TOP3</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarDays size={18} color="var(--brand-color)" />
                        <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>皆勤賞候補</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginLeft: '8px' }}>通塾日数TOP3</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Timer size={18} color="var(--brand-color)" />
                        <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>長時間マスター</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginLeft: '8px' }}>1日あたりの平均滞在TOP3</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={18} color="var(--brand-color)" />
                        <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>急上昇</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginLeft: '8px' }}>先週比で学習時間増加TOP3</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
