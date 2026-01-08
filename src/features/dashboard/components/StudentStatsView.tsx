import { GlassCard } from '@/components/ui/GlassCard';
import { ActivityHeatmap, HeatmapDataPoint } from '@/features/dashboard/components/ActivityHeatmap';
import { TimeRangeChart } from '@/features/dashboard/components/TimeRangeChart';
import { BadgeType } from '@/types/badge';
import { BADGE_CONFIG } from '@/constants/badges';
import { User, Clock, Calendar, Flame, Trophy, Crown } from 'lucide-react';

export interface StudentStatsViewProps {
    studentName: string;
    description: React.ReactNode;
    rankingInfo: {
        badges: { type: BadgeType }[];
        rankPosition: number | null;
        totalStudents: number;
        groupLabel: string;
    } | null;
    stats: {
        totalMinutes: number;
        visitCount: number;
    } | null;
    streakStats: {
        maxConsecutiveDays: number;
        currentStreak: number;
    };
    history: HeatmapDataPoint[];
    loading?: boolean;
}

export const StudentStatsView = ({
    studentName,
    description,
    rankingInfo,
    stats,
    streakStats,
    history,
    loading = false
}: StudentStatsViewProps) => {

    if (loading) {
        return (
            <GlassCard style={{ padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-sub)' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9' }} />
                    <span>データを読み込み中...</span>
                </div>
            </GlassCard>
        );
    }

    if (!stats) return null;

    const hours = Math.floor(stats.totalMinutes / 60);
    const mins = stats.totalMinutes % 60;

    return (
        <GlassCard style={{ padding: '9px', marginBottom: '24px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px'
                }}>
                    <User size={20} style={{ color: 'var(--brand-color)' }} />
                    <h2 style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        color: 'var(--text-main)',
                        margin: 0
                    }}>
                        {studentName}さんの記録
                    </h2>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-sub)',
                        fontWeight: 500,
                        marginLeft: 'auto'
                    }}>
                        {rankingInfo?.groupLabel || '部門なし'}
                    </span>
                </div>
                <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-sub)',
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.5
                }}>
                    {description}
                </p>
            </div>

            {/* Badges Section */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #fff5eb 0%, #ffede0 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-color)',
                        flexShrink: 0
                    }}>
                        <Trophy size={18} />
                    </div>
                    <div>
                        <div style={{
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: 'var(--text-main)',
                            marginBottom: '8px'
                        }}>
                            獲得バッジ
                        </div>
                        {rankingInfo && rankingInfo.badges.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {rankingInfo.badges.map((badge, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            background: 'linear-gradient(135deg, #fff5eb 0%, #ffede0 100%)',
                                            color: 'var(--brand-color)',
                                            fontSize: '0.85rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        {BADGE_CONFIG[badge.type]?.icon(16)}
                                        {BADGE_CONFIG[badge.type]?.label}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-sub)',
                                fontWeight: 500
                            }}>
                                まだ獲得していません<br />各部門3位以内を目指そう！
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', // More flexible for mobile
                    gap: '12px'
                }}>
                    {/* Total Time */}
                    <div style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Clock size={16} style={{ color: 'var(--brand-color)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>合計学習時間</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {hours}<span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-sub)' }}>h </span>
                            {mins}<span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-sub)' }}>m</span>
                        </div>
                    </div>

                    {/* Visit Count */}
                    <div style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Calendar size={16} style={{ color: 'var(--brand-color)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>通塾日数</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {stats.visitCount}<span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-sub)' }}> / 7日</span>
                        </div>
                    </div>

                    {/* Streak (Current > Max) */}
                    {streakStats.currentStreak >= 2 ? (
                        <div style={{
                            padding: '16px',
                            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(234,88,12,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Flame size={16} style={{ color: '#ea580c' }} />
                                <span style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 600 }}>連続通塾中 🔥</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c' }}>
                                {streakStats.currentStreak}<span style={{ fontSize: '0.9rem', fontWeight: 600 }}>日</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '16px',
                            border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Flame size={16} style={{ color: 'var(--text-sub)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>最長連続</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {streakStats.maxConsecutiveDays}<span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-sub)' }}>日</span>
                            </div>
                        </div>
                    )}

                    {/* Ranking */}
                    {rankingInfo && rankingInfo.rankPosition ? (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '16px',
                            border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Crown size={16} style={{ color: 'var(--brand-color)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>ランキング</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {rankingInfo.rankPosition}<span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-sub)' }}>位</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}> / {rankingInfo.totalStudents}人</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '16px',
                            border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Crown size={16} style={{ color: 'var(--text-sub)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>ランキング</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-sub)' }}>
                                --<span style={{ fontSize: '0.9rem', fontWeight: 600 }}>位</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div style={{
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', // Safe responsive grid
                gap: '12px'
            }}>
                {/* Heatmap Card */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 0, // Prevent flex/grid item overflow
                    maxWidth: '100%' // Ensure no spillover
                }}>
                    <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginBottom: '16px',
                        textAlign: 'left',
                        width: '100%'
                    }}>
                        通塾ヒートマップ
                    </div>
                    {/* Width 100% to fill container */}
                    <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                        <ActivityHeatmap history={history} />
                    </div>
                </div>

                {/* Time Range Chart Card */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 0,
                    maxWidth: '100%'
                }}>
                    <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginBottom: '16px',
                        textAlign: 'left',
                        width: '100%'
                    }}>
                        通塾時間帯
                    </div>
                    <div style={{ width: '80%', maxWidth: '400px', height: '200px' }}>
                        <TimeRangeChart history={history} />
                    </div>
                </div>
            </div>

            {/* Motivation Footer */}
            {streakStats.currentStreak >= 2 ? (
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.03)',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#c2410c'
                }}>
                    🔥 {streakStats.currentStreak}日連続で頑張っています！<br />明日も来て記録を伸ばしましょう！
                </div>
            ) : streakStats.maxConsecutiveDays > 0 ? (
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.03)',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-sub)'
                }}>
                    これまで最大 {streakStats.maxConsecutiveDays}日連続通塾を達成しています。<br />また挑戦しましょう！
                </div>
            ) : null}
        </GlassCard>
    );
};
