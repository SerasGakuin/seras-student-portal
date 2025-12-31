import { useState, Fragment } from 'react';
import { api } from '@/lib/api';
import { StudentStats } from '@/services/dashboardService';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { StudentBadgesMap } from '@/services/badgeService';
import { RankingDetailView, BADGE_CONFIG, getBadgeStyle } from '@/features/dashboard/components/RankingDetailView';
import { HeatmapDataPoint } from './ActivityHeatmap';
import styles from './RankingWidget.module.css';

interface RankingWidgetProps {
    ranking: StudentStats[];
    periodDays: number;
    loading?: boolean;
    badges?: StudentBadgesMap;
    viewerId?: string | null;
}

export const RankingWidget = ({ ranking, periodDays, loading, badges, viewerId }: RankingWidgetProps) => {
    // ... (state and maxDuration calc remain same)
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [expandedData, setExpandedData] = useState<{ history: HeatmapDataPoint[]; maxConsecutiveDays: number; currentStreak: number } | null>(null);
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
            // Fetch 28 days for visualizations (Heatmap/Streak context)
            const data = await api.dashboard.getStudentDetail(viewerId, studentName, 28);
            setExpandedData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 className={styles.title}>学習時間ランキング</h2>
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
                <>
                    {/* Desktop Table View */}
                    <div className={styles.desktopView}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th} style={{ textAlign: 'center', width: '60px' }}>順位</th>
                                    <th className={styles.th} style={{ textAlign: 'left' }}>名前</th>
                                    <th className={styles.th} style={{ textAlign: 'center', width: '80px' }}>学年</th>
                                    <th className={styles.th} style={{ textAlign: 'right', width: '150px' }}>学習時間</th>
                                    <th className={styles.th} style={{ textAlign: 'right', width: '80px' }}>通塾日数</th>
                                    <th className={styles.th} style={{ textAlign: 'right', width: '80px' }}>通塾率</th>
                                    <th className={styles.th} style={{ width: '100px' }}>比較</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranking.map((student, index) => {
                                    const hours = Math.floor(student.totalDurationMinutes / 60);
                                    const mins = student.totalDurationMinutes % 60;
                                    const isTop3 = index < 3;
                                    const isExpanded = expandedStudent === student.name;
                                    const isExaminee = student.grade === '高3' || student.grade === '既卒';
                                    const badgeStyle = getBadgeStyle(isExaminee);

                                    // Safe calculation for rate
                                    const rate = periodDays > 0 ? Math.round((student.visitCount / periodDays) * 100) : 0;

                                    // Bar width relative to max
                                    const barPercent = Math.min((student.totalDurationMinutes / maxDuration) * 100, 100);

                                    return (
                                        <Fragment key={student.name}>
                                            <tr
                                                onClick={() => toggleExpand(student.name)}
                                                className={styles.td}
                                                style={{
                                                    borderBottom: isExpanded ? 'none' : '1px solid rgba(0,0,0,0.03)',
                                                    cursor: 'pointer',
                                                    background: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent',
                                                }}
                                                onMouseEnter={(e) => !isExpanded && (e.currentTarget.style.background = 'rgba(0,0,0,0.01)')}
                                                onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <td className={`${styles.rankBadge} ${isTop3 ? styles.topRank : ''}`} style={{ padding: '24px 16px' }}>
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                                </td>
                                                <td style={{ padding: '24px 16px', fontWeight: 700 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {student.name}
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {badges?.[student.name]?.map((badge, i) => (
                                                                <span
                                                                    key={i}
                                                                    title={BADGE_CONFIG[badge.type]?.label}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        borderRadius: '50%',
                                                                        background: badgeStyle.background,
                                                                        color: badgeStyle.color,
                                                                        border: badgeStyle.border
                                                                    }}
                                                                >
                                                                    <span style={{ transform: 'scale(0.8)' }}>
                                                                        {BADGE_CONFIG[badge.type]?.icon}
                                                                    </span>
                                                                </span>
                                                            ))}
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
                                                    <td colSpan={8} style={{ padding: '0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <div style={{
                                                            position: 'sticky',
                                                            left: 0,
                                                            width: 'min(100%, calc(100vw - 48px))',
                                                        }}>
                                                            <div style={{ padding: '16px 24px' }}>
                                                                <RankingDetailView
                                                                    studentName={student.name}
                                                                    description={null}
                                                                    rankingInfo={{
                                                                        badges: badges?.[student.name] || [],
                                                                        rankPosition: index + 1,
                                                                        totalStudents: ranking.length,
                                                                        groupLabel: (student.grade === '高3' || student.grade === '既卒') ? '受験生の部' : '一般の部'
                                                                    }}
                                                                    stats={{
                                                                        totalMinutes: student.totalDurationMinutes,
                                                                        visitCount: student.visitCount
                                                                    }}
                                                                    streakStats={{
                                                                        maxConsecutiveDays: expandedData?.maxConsecutiveDays || 0,
                                                                        currentStreak: expandedData?.currentStreak || 0
                                                                    }}
                                                                    history={expandedData?.history || []}
                                                                    loading={detailLoading}
                                                                />
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

                    {/* Mobile Card View */}
                    <div className={styles.mobileView}>
                        {ranking.map((student, index) => {
                            const hours = Math.floor(student.totalDurationMinutes / 60);
                            const mins = student.totalDurationMinutes % 60;
                            const isTop3 = index < 3;
                            const isExpanded = expandedStudent === student.name;
                            const barPercent = Math.min((student.totalDurationMinutes / maxDuration) * 100, 100);
                            const isExaminee = student.grade === '高3' || student.grade === '既卒';
                            const badgeStyle = getBadgeStyle(isExaminee);

                            return (
                                <div
                                    key={student.name}
                                    className={`${styles.mobileCard} ${(isExpanded && detailLoading) ? styles.loadingState : ''}`}
                                    onClick={() => toggleExpand(student.name)}
                                >
                                    <div className={styles.mobileCardHeader}>
                                        <div className={`${styles.mobileRankBadge} ${isTop3 ? styles.mobileTopRank : ''}`}>
                                            {index + 1}
                                        </div>
                                        <div className={styles.mobileName}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span>{student.name}</span>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {badges?.[student.name]?.map((badge, i) => (
                                                        <span
                                                            key={i}
                                                            title={BADGE_CONFIG[badge.type]?.label}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                background: badgeStyle.background,
                                                                color: badgeStyle.color,
                                                                border: badgeStyle.border
                                                            }}
                                                        >
                                                            <span style={{ transform: 'scale(0.8)' }}>
                                                                {BADGE_CONFIG[badge.type]?.icon}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                                                {student.grade}
                                            </span>
                                        </div>
                                        <div>
                                            {isExpanded ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                                        </div>
                                    </div>

                                    <div className={styles.mobileStatsGrid}>
                                        <div className={styles.mobileStatItem}>
                                            <div className={styles.mobileStatLabel}>学習時間</div>
                                            <div className={styles.mobileStatValue}>
                                                {hours}<span style={{ fontSize: '0.8em' }}>h</span> {mins}<span style={{ fontSize: '0.8em' }}>m</span>
                                            </div>
                                        </div>
                                        <div className={styles.mobileStatItem}>
                                            <div className={styles.mobileStatLabel}>通塾日数</div>
                                            <div className={styles.mobileStatValue}>
                                                {student.visitCount}<span style={{ fontSize: '0.7em', fontWeight: 400 }}>日</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.mobileBarArea}>
                                        <div className={`${styles.mobileBarFill} ${isTop3 ? styles.mobileBarFillActive : ''}`} style={{ width: `${barPercent}%` }}></div>
                                    </div>

                                    {/* Expanded Detail for Mobile */}
                                    {isExpanded && (
                                        <div className={styles.mobileDetailWrapper} onClick={(e) => e.stopPropagation()}>
                                            <RankingDetailView
                                                studentName={student.name}
                                                description={null}
                                                rankingInfo={{
                                                    badges: badges?.[student.name] || [],
                                                    rankPosition: index + 1,
                                                    totalStudents: ranking.length,
                                                    groupLabel: (student.grade === '高3' || student.grade === '既卒') ? '受験生の部' : '一般の部'
                                                }}
                                                stats={{
                                                    totalMinutes: student.totalDurationMinutes,
                                                    visitCount: student.visitCount
                                                }}
                                                streakStats={{
                                                    maxConsecutiveDays: expandedData?.maxConsecutiveDays || 0,
                                                    currentStreak: expandedData?.currentStreak || 0
                                                }}
                                                history={expandedData?.history || []}
                                                loading={detailLoading}
                                                variant="mobile"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};
