'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLiff } from '@/lib/liff';
import { HeatmapDataPoint } from '@/features/dashboard/components/ActivityHeatmap';
import type { UnifiedWeeklyBadges } from '@/services/badgeService';
import { StudentStatsView } from '@/features/dashboard/components/StudentStatsView';

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
            groupLabel: groupKey === 'exam' ? '受験生の部' : '一般の部'
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

    return (
        <StudentStatsView
            studentName={student.name}
            description={
                <>
                    <strong style={{ color: 'var(--brand-color)', fontWeight: 700 }}>{student.name}</strong> さんの最近の記録です
                </>
            }
            rankingInfo={rankingInfo}
            stats={stats}
            streakStats={streakStats}
            history={detailData28Days?.history || []}
            loading={isLoading}
            periodDays={7}
            badgePeriodLabel={rankingData?.period?.label}
        />
    );
};
