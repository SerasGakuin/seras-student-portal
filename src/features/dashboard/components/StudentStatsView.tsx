import { GlassCard } from '@/components/ui/GlassCard';
import { ActivityHeatmap, HeatmapDataPoint } from '@/features/dashboard/components/ActivityHeatmap';
import { TimeRangeChart } from '@/features/dashboard/components/TimeRangeChart';
import { getBadgeStyle } from '@/features/dashboard/components/RankingDetailView';
import { BadgeType } from '@/types/badge';
import { splitMinutes } from '@/lib/formatUtils';
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
    periodDays: number;
    badgePeriodLabel?: string;
}

export const StudentStatsView = ({
    studentName,
    description,
    rankingInfo,
    stats,
    streakStats,
    history,
    loading = false,
    periodDays,
    badgePeriodLabel
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

    const { hours, mins } = splitMinutes(stats.totalMinutes);
    const isExaminee = rankingInfo?.groupLabel === '受験生の部';
    const badgeStyle = getBadgeStyle(isExaminee);

    return (
        <GlassCard style={{ padding: '16px', marginBottom: '24px', overflow: 'hidden' }}>
            {/* Header - Compact */}
            <div style={{
                padding: '12px 8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <User size={18} style={{ color: 'var(--brand-color)' }} />
                <h2 style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    margin: 0
                }}>
                    {studentName}さんの記録
                </h2>
            </div>

            {/* Badges Section */}
            <div style={{
                padding: '16px 20px 20px',
                background: 'linear-gradient(135deg, rgba(255,245,235,0.5) 0%, rgba(255,237,224,0.3) 100%)',
                borderRadius: '14px',
                margin: '0 0 20px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                }}>
                    <Trophy size={14} style={{ color: 'var(--brand-color)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>獲得バッジ</span>
                    {rankingInfo?.groupLabel && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-sub)' }}>
                            {rankingInfo.groupLabel}
                        </span>
                    )}
                    {badgePeriodLabel && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-sub)' }}>
                            / {badgePeriodLabel}
                        </span>
                    )}
                </div>
                {rankingInfo && rankingInfo.badges.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {rankingInfo.badges.map((badge, i) => (
                            <span
                                key={i}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '6px 12px',
                                    borderRadius: '14px',
                                    background: badgeStyle.background,
                                    color: badgeStyle.color,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: badgeStyle.border
                                }}
                            >
                                {BADGE_CONFIG[badge.type]?.icon(14)}
                                {BADGE_CONFIG[badge.type]?.label}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 500, lineHeight: 1.6 }}>
                        まだ獲得していません。各部門3位以内を目指そう！
                    </div>
                )}
            </div>

            {/* Stats Section */}
            <div style={{ padding: '0 0 20px' }}>
                <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    padding: '0 8px',
                    marginBottom: '14px'
                }}>
                    直近7日間の記録
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                }}>
                    {/* Total Time */}
                    <div style={{
                        padding: '16px 18px',
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: '14px',
                        border: '1px solid rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Clock size={13} style={{ color: 'var(--brand-color)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 600 }}>学習時間</span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {hours}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}>h </span>
                            {mins}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}>m</span>
                        </div>
                    </div>

                    {/* Visit Count */}
                    <div style={{
                        padding: '16px 18px',
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: '14px',
                        border: '1px solid rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Calendar size={13} style={{ color: 'var(--brand-color)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 600 }}>通塾日数</span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {stats.visitCount}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}> / {periodDays}日</span>
                        </div>
                    </div>

                    {/* Streak */}
                    {streakStats.currentStreak >= 2 ? (
                        <div style={{
                            padding: '16px 18px',
                            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                            borderRadius: '14px',
                            border: '1px solid rgba(234,88,12,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Flame size={13} style={{ color: '#ea580c' }} />
                                <span style={{ fontSize: '0.7rem', color: '#c2410c', fontWeight: 600 }}>連続通塾中</span>
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ea580c' }}>
                                {streakStats.currentStreak}<span style={{ fontSize: '0.8rem', fontWeight: 600 }}>日</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '16px 18px',
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '14px',
                            border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Flame size={13} style={{ color: 'var(--text-sub)' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 600 }}>最長連続</span>
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {streakStats.maxConsecutiveDays}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}>日</span>
                            </div>
                        </div>
                    )}

                    {/* Ranking */}
                    {rankingInfo && rankingInfo.rankPosition ? (
                        <div style={{
                            padding: '16px 18px',
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '14px',
                            border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Crown size={13} style={{ color: 'var(--brand-color)' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 600 }}>ランキング</span>
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {rankingInfo.rankPosition}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}>位</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)' }}> / {rankingInfo.totalStudents}人</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '16px 18px',
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '14px',
                            border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Crown size={13} style={{ color: 'var(--text-sub)' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 600 }}>ランキング</span>
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-sub)' }}>
                                --<span style={{ fontSize: '0.8rem', fontWeight: 600 }}>位</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div style={{
                padding: '0',
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
