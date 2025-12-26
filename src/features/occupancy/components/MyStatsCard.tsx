'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLiff } from '@/lib/liff';
import { ActivityHeatmap, HeatmapDataPoint } from '@/features/dashboard/components/ActivityHeatmap';
import { TimeRangeChart } from '@/features/dashboard/components/TimeRangeChart';
import {
    User, Clock, Calendar, Flame, Trophy, Crown, Sunrise, Moon, CalendarDays, Timer, Zap
} from 'lucide-react';
import type { BadgeType, UnifiedWeeklyBadges } from '@/services/badgeService';

const BADGE_CONFIG: Record<BadgeType, { label: string; icon: React.ReactNode }> = {
    'HEAVY_USER': { label: 'トップランカー', icon: <Crown size={16} /> },
    'EARLY_BIRD': { label: '早起きマスター', icon: <Sunrise size={16} /> },
    'NIGHT_OWL': { label: '深夜マスター', icon: <Moon size={16} /> },
    'CONSISTENT': { label: '皆勤賞候補', icon: <CalendarDays size={16} /> },
    'MARATHON': { label: '長時間マスター', icon: <Timer size={16} /> },
    'RISING_STAR': { label: '急上昇', icon: <Zap size={16} /> },
};

interface StudentDetailResponse {
    history: HeatmapDataPoint[];
    maxConsecutiveDays: number;
    currentStreak: number;
}

export const MyStatsCard = () => {
    const { student, isLoading: isLiffLoading } = useLiff();
    const [detailData7Days, setDetailData7Days] = useState<StudentDetailResponse | null>(null);
    const [detailData28Days, setDetailData28Days] = useState<StudentDetailResponse | null>(null);
    const [rankingData, setRankingData] = useState<UnifiedWeeklyBadges | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is a teacher (should not see this card)
    const isTeacher = student?.status.includes('講師') || student?.status === '教室長';

    // Determine group (exam or general) based on student grade
    const groupKey = useMemo(() => {
        if (!student?.grade) return 'general';
        return (student.grade === '高3' || student.grade === '既卒') ? 'exam' : 'general';
    }, [student?.grade]);

    useEffect(() => {
        if (!student?.name || isLiffLoading) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch parallel: 7 days for stats, 28 days for visualizations
                const [detail7Data, detail28Data, rankingDataRes] = await Promise.all([
                    api.dashboard.getStudentDetail(student.lineId, student.name, 7),
                    api.dashboard.getStudentDetail(student.lineId, student.name, 28),
                    api.ranking.get(student?.lineId)
                ]);

                if (detail7Data) setDetailData7Days(detail7Data);
                if (detail28Data) setDetailData28Days(detail28Data);
                setRankingData(rankingDataRes);
            } catch (e) {
                console.error('Failed to fetch stats:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [student?.name, isLiffLoading]);

    // Calculate stats from 7-day data (time stats only)
    const stats = useMemo(() => {
        if (!detailData7Days || !student?.name) return null;

        const { history } = detailData7Days;

        // Total duration and visit count from history
        const totalMinutes = history.reduce((sum, h) => sum + h.durationMinutes, 0);
        const uniqueDays = new Set(history.map(h => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })).size;

        return {
            totalMinutes,
            visitCount: uniqueDays,
            avgMinutesPerVisit: uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0
        };
    }, [detailData7Days, student?.name]);

    // Get streak stats from 28-day API response
    // Note: currentStreak is calculated from ALL history on the backend
    const streakStats = useMemo(() => {
        if (!detailData28Days) return { maxConsecutiveDays: 0, currentStreak: 0 };

        return {
            maxConsecutiveDays: detailData28Days.maxConsecutiveDays || 0,
            currentStreak: detailData28Days.currentStreak || 0
        };
    }, [detailData28Days]);

    // Find ranking position
    const rankingInfo = useMemo(() => {
        if (!rankingData || !student?.name) return null;

        const groupData = rankingData[groupKey] || {};
        const myBadges = groupData[student.name] || [];

        // Get rank from full rankings (not just badge winners)
        const rankingsMap = groupKey === 'exam'
            ? rankingData.examRankings
            : rankingData.generalRankings;
        const rankPosition = rankingsMap?.[student.name] || null;

        // Use total students from API (all registered students in group, not just those with activity)
        const totalStudents = groupKey === 'exam'
            ? rankingData.totalExamStudents
            : rankingData.totalGeneralStudents;

        return {
            badges: myBadges,
            rankPosition,
            totalStudents: totalStudents || 0,
            groupLabel: groupKey === 'exam' ? '受験生部門' : '非受験生部門'
        };
    }, [rankingData, student?.name, groupKey]);

    // Don't render if not a student or no data (unless in dev mode)
    if (isLiffLoading || !student || isTeacher) {
        return null;
    }

    if (isLoading) {
        return (
            <GlassCard style={{ padding: '32px', marginBottom: '70px' }}>
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
    const avgHours = Math.floor(stats.avgMinutesPerVisit / 60);
    const avgMins = stats.avgMinutesPerVisit % 60;

    return (
        <GlassCard style={{ padding: '9px', marginBottom: '70px', overflow: 'hidden' }}>
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
                        My Stats
                    </h2>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-sub)',
                        fontWeight: 500,
                        marginLeft: 'auto'
                    }}>
                        {rankingInfo?.groupLabel || '非受験生部門'}
                    </span>
                </div>
                <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-sub)',
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.5
                }}>
                    <strong style={{ color: 'var(--brand-color)', fontWeight: 700 }}>{student?.name}</strong> さんの直近7日間の記録です
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
                                        {BADGE_CONFIG[badge.type]?.icon}
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
                    gridTemplateColumns: 'repeat(2, 1fr)',
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
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Heatmap Card */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
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
                    <ActivityHeatmap history={detailData28Days?.history || []} />
                </div>

                {/* Time Range Chart Card */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
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
                        <TimeRangeChart history={detailData28Days?.history || []} />
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
