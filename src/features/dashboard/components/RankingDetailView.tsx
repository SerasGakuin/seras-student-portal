import { GlassCard } from '@/components/ui/GlassCard';
import { ActivityHeatmap, HeatmapDataPoint } from '@/features/dashboard/components/ActivityHeatmap';
import { TimeRangeChart } from '@/features/dashboard/components/TimeRangeChart';
import { BadgeType } from '@/services/badgeService';
import {
    Clock, Calendar, Flame, Trophy, Crown, Sunrise, Moon, CalendarDays, Timer, Zap
} from 'lucide-react';
import styles from './RankingDetailView.module.css';

export const BADGE_CONFIG: Record<BadgeType, { label: string; icon: React.ReactNode }> = {
    'HEAVY_USER': { label: 'トップランカー', icon: <Crown size={16} /> },
    'EARLY_BIRD': { label: '早起きマスター', icon: <Sunrise size={16} /> },
    'NIGHT_OWL': { label: '深夜マスター', icon: <Moon size={16} /> },
    'CONSISTENT': { label: '皆勤賞候補', icon: <CalendarDays size={16} /> },
    'MARATHON': { label: '長時間マスター', icon: <Timer size={16} /> },
    'RISING_STAR': { label: '急上昇', icon: <Zap size={16} /> },
};

export interface RankingDetailViewProps {
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
    variant?: 'default' | 'mobile';
}

export const RankingDetailView = ({
    rankingInfo,
    stats,
    streakStats,
    history,
    loading = false,
    variant = 'default'
}: RankingDetailViewProps) => {

    if (loading) {
        return (
            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
                <span>データを読み込み中...</span>
            </div>
        );
    }

    if (!stats) return null;

    const hours = Math.floor(stats.totalMinutes / 60);
    const mins = stats.totalMinutes % 60;

    // Mobile Flat Design
    if (variant === 'mobile') {
        return (
            <div className={styles.mobileFlatContainer}>
                {/* Badges - Simple List (Styled like PC) */}
                {rankingInfo && rankingInfo.badges.length > 0 && (
                    <div className={styles.mobileFlatBadges}>
                        {rankingInfo.badges.map((badge, i) => (
                            <span
                                key={i}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    background: '#fff7ed',
                                    color: '#ea580c',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    border: '1px solid rgba(234,88,12,0.1)'
                                }}
                            >
                                {BADGE_CONFIG[badge.type]?.icon}
                                {BADGE_CONFIG[badge.type]?.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Stats - Flat Grid (PC Colors) */}
                <div className={styles.mobileFlatGrid}>
                    <div className={styles.mobileFlatItem}>
                        <div className={styles.mobileFlatLabel}>
                            <Clock size={14} style={{ color: 'var(--brand-color)' }} /> 合計学習時間
                        </div>
                        <div className={styles.mobileFlatValue}>
                            {hours}<span style={{ fontSize: '0.8em', fontWeight: 400, color: 'var(--text-sub)', marginLeft: '2px' }}>h</span> {mins}<span style={{ fontSize: '0.8em', fontWeight: 400, color: 'var(--text-sub)', marginLeft: '2px' }}>m</span>
                        </div>
                    </div>
                    <div className={styles.mobileFlatItem}>
                        <div className={styles.mobileFlatLabel}>
                            <Calendar size={14} style={{ color: 'var(--brand-color)' }} /> 通塾日数
                        </div>
                        <div className={styles.mobileFlatValue}>
                            {stats.visitCount}<span style={{ fontSize: '0.8em', fontWeight: 400, color: 'var(--text-sub)', marginLeft: '2px' }}>日</span>
                        </div>
                    </div>
                    <div className={styles.mobileFlatItem}>
                        <div className={styles.mobileFlatLabel}>
                            <Flame size={14} className={streakStats.currentStreak >= 2 ? "text-orange-500" : ""} style={{ color: streakStats.currentStreak >= 2 ? '#ea580c' : 'var(--text-sub)' }} />
                            {streakStats.currentStreak >= 2 ? '連続通塾' : '最長連続'}
                        </div>
                        <div className={styles.mobileFlatValue} style={{ color: streakStats.currentStreak >= 2 ? '#ea580c' : 'inherit' }}>
                            {streakStats.currentStreak >= 2 ? streakStats.currentStreak : streakStats.maxConsecutiveDays}
                            <span style={{ fontSize: '0.8em', fontWeight: 400, color: streakStats.currentStreak >= 2 ? '#ea580c' : 'var(--text-sub)', marginLeft: '2px' }}>日</span>
                        </div>
                    </div>
                </div>

                {/* Visualizations - Card style even in mobile but simplified */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>通塾状況</div>
                        <div style={{ padding: '0px', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ paddingBottom: '20px', flexShrink: 0 }}>
                                <ActivityHeatmap history={history} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>時間帯</div>
                        <div style={{ paddingLeft: '40px', width: '90%', height: '180px' }}>
                            <TimeRangeChart history={history} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Rich Design (PC)
    return (
        <GlassCard style={{ padding: '4px', marginBottom: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.4)' }}>

            {/* Badges Section - Compact */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={16} className="text-orange-500" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginRight: '8px' }}>獲得バッジ:</span>

                    {rankingInfo && rankingInfo.badges.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {rankingInfo.badges.map((badge, i) => (
                                <span
                                    key={i}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        background: '#fff7ed',
                                        color: '#ea580c',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        border: '1px solid rgba(234,88,12,0.1)'
                                    }}
                                >
                                    {BADGE_CONFIG[badge.type]?.icon}
                                    {BADGE_CONFIG[badge.type]?.label}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>なし</span>
                    )}
                </div>
            </div>

            {/* Stats Grid - Rich Design */}
            <div className={styles.detailContainer}>
                <div className={styles.statsGrid}>
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
                </div>

                {/* Visualizations Grid */}
                <div className={styles.visualizationsGrid}>
                    {/* Heatmap */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.6)',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.04)',
                        minWidth: 0
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>
                            通塾状況
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ActivityHeatmap history={history} />
                        </div>
                    </div>

                    {/* Time Range */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.6)',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.04)',
                        minWidth: 0,
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>
                            時間帯
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '95%', height: '180px', paddingLeft: '16px', paddingTop: '20px' }}>
                                <TimeRangeChart history={history} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard >
    );
};
