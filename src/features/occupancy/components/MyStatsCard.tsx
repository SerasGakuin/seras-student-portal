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
                const [detail7Res, detail28Res, rankingData] = await Promise.all([
                    fetch(`/api/dashboard/student-detail?name=${encodeURIComponent(student.name)}&days=7`),
                    fetch(`/api/dashboard/student-detail?name=${encodeURIComponent(student.name)}&days=28`),
                    api.ranking.get(student?.lineId)
                ]);

                if (detail7Res.ok) {
                    const data = await detail7Res.json();
                    setDetailData7Days(data);
                }
                if (detail28Res.ok) {
                    const data = await detail28Res.json();
                    setDetailData28Days(data);
                }

                // rankingData is already the data object
                setRankingData(rankingData);
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
        <GlassCard style={{ padding: '20px', marginBottom: '70px' }}>
            {/* Header */}
            <div style={{
                padding: '10px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '0px'
                }}>
                    <User size={20} style={{ color: 'var(--brand-color)' }} />
                    <h2 style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        color: 'var(--brand-color)',
                        letterSpacing: '0.02em'
                    }}>
                        MY STATS: {student?.name} さん
                    </h2>
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-sub)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{
                        padding: '2px 8px',
                        margin: '4px 0',
                        borderRadius: '4px',
                        background: '#fff7ed',
                        color: 'var(--brand-color)',
                        fontSize: '0.7rem',
                        fontWeight: 700
                    }}>
                        {rankingInfo?.groupLabel || '非受験生部門'}
                    </span>
                    直近7日間のあなたの記録
                </div>
            </div>

            {/* Badges Section */}
            {rankingInfo && rankingInfo.badges.length > 0 && (
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{
                            minWidth: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--brand-color)',
                            boxShadow: 'var(--shadow-badge)'
                        }}>
                            <Trophy size={18} />
                        </div>
                        <div>
                            <div style={{
                                fontWeight: 900,
                                fontSize: '1rem',
                                color: 'var(--text-main)',
                                marginBottom: '4px'
                            }}>
                                獲得バッジ
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {rankingInfo.badges.map((badge, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 247, 237, 0.8)',
                                            color: 'var(--brand-color)',
                                            fontSize: '0.8rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        {BADGE_CONFIG[badge.type]?.icon}
                                        {BADGE_CONFIG[badge.type]?.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Section */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
            }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    justifyContent: 'center'
                }}>
                    {/* Total Time */}
                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                        <Clock size={18} style={{ color: 'var(--brand-color)', marginBottom: '8px' }} />
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {hours}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>h</span>
                            {' '}{mins}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>m</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>合計学習時間</div>
                    </div>

                    {/* Visit Count */}
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                        <Calendar size={18} style={{ color: 'var(--brand-color)', marginBottom: '8px' }} />
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {stats.visitCount}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>/7日</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>通塾日数</div>
                    </div>

                    {/* Average per Visit */}
                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                        <Timer size={18} style={{ color: 'var(--brand-color)', marginBottom: '8px' }} />
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {avgHours}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>h</span>
                            {' '}{avgMins}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>m</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>平均滞在</div>
                    </div>

                    {/* Current Streak */}
                    {streakStats.currentStreak >= 2 && (
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                            <Flame size={18} style={{ color: '#ea580c', marginBottom: '8px' }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ea580c' }}>
                                {streakStats.currentStreak}<span style={{ fontSize: '0.85rem', fontWeight: 600 }}>日</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 700 }}>🔥 連続中</div>
                        </div>
                    )}

                    {/* Ranking */}
                    {rankingInfo && rankingInfo.rankPosition && (
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                            <Crown size={18} style={{ color: 'var(--brand-color)', marginBottom: '8px' }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {rankingInfo.rankPosition}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)' }}>位</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>
                                /{rankingInfo.totalStudents}人中
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Heatmap Section */}
            <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    活動ヒートマップ
                </div>
                <ActivityHeatmap history={detailData28Days?.history || []} />
            </div>

            {/* Time Range Chart Section */}
            <div style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    通塾時間帯
                </div>
                <div style={{ width: '100%', maxWidth: '500px', height: '200px' }}>
                    <TimeRangeChart history={detailData28Days?.history || []} />
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
                    🔥 {streakStats.currentStreak}日連続で頑張っています！明日も来て記録を伸ばそう！
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
                    過去最長 {streakStats.maxConsecutiveDays}日連続通塾を達成。また挑戦しよう！
                </div>
            ) : null}
        </GlassCard>
    );
};
