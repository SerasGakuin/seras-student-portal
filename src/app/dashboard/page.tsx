'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DashboardSummary } from '@/services/dashboardService';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { BackLink } from '@/components/ui/BackLink';

import { KPICard } from '@/features/dashboard/components/KPICard';
import { RankerListCard } from '@/features/dashboard/components/RankerListCard';
import { RankingWidget } from '@/features/dashboard/components/RankingWidget';
// Removed legacy DashboardControls
import { FilterCommandBar } from '@/features/dashboard/components/FilterCommandBar';
import { CumulativeGrowthChart } from '@/features/dashboard/components/CumulativeGrowthChart';

import { Clock, Users } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useLiff } from '@/lib/liff';
import { useRouter } from 'next/navigation';// Re-defining these here or importing them if I had moved them.
// For now, let's just use string types compatible with the component or import from the old file if it still exists (it does).
import { FilterType, DateRangeOption } from '@/features/dashboard/components/DashboardControls';
// ... (imports)
import { fetchWithAuth } from '@/lib/api';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Global Filter State
    const [rangeOption, setRangeOption] = useState<DateRangeOption>('last_7_days');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
        from: undefined,
        to: undefined
    });
    const [gradeFilter, setGradeFilter] = useState<FilterType>('ALL'); // Global Grade Filter

    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    // Access Control
    const { canViewDashboard, isLoading: isRoleLoading } = useRole();
    const { profile } = useLiff();
    const router = useRouter();

    // Initialize date range to last 7 days on client mount (EXCLUDING Today)
    useEffect(() => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        const from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 6); // 7 days inclusive (Yesterday counting back)
        from.setHours(0, 0, 0, 0);

        const to = yesterday;

        setDateRange({ from, to });
    }, []);

    useEffect(() => {
        if (!isRoleLoading) {
            if (!canViewDashboard) {
                // If not authorized, redirect to home
                router.replace('/');
            }
        }
    }, [isRoleLoading, canViewDashboard, router]);

    // Clear chart selection when grade filter changes
    useEffect(() => {
        setSelectedStudents([]);
    }, [gradeFilter]);

    useEffect(() => {
        const fetchStats = async () => {
            // Don't fetch until dateRange is properly initialized
            if (!dateRange.from || !dateRange.to) return;

            setIsLoading(true);
            try {
                // Construct URL with params
                const params = new URLSearchParams();
                params.set('from', dateRange.from.toISOString());
                params.set('to', dateRange.to.toISOString());

                // Add Grade Param
                if (gradeFilter !== 'ALL') params.set('grade', gradeFilter);

                const data = await fetchWithAuth<DashboardSummary>(
                    `/api/dashboard/stats?${params.toString()}`,
                    profile?.userId
                );
                setStats(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        if (canViewDashboard && dateRange.from && dateRange.to) {
            fetchStats();
        }
    }, [canViewDashboard, dateRange, gradeFilter, profile?.userId]);

    // Fetch Badges Removed (Now in DashboardStats)


    const handleRangeChange = (option: DateRangeOption, from: Date, to: Date) => {
        setRangeOption(option);
        setDateRange({ from, to });
    };


    if (isRoleLoading) return <LoadingOverlay />;
    if (!canViewDashboard) return null; // Redirect handled in useEffect

    // Error State (Loaded but no data)
    if (!stats && !isLoading) {
        return (
            <div className={styles.container}>
                <PageHeader
                    title="講師用ダッシュボード"
                    subtitle="生徒の学習状況・ランキング"
                />
                <div className="p-8 mt-8 text-center bg-red-50 rounded-xl border border-red-200">
                    <p className="text-red-600 font-medium mb-2">データの読み込みに失敗しました</p>
                    <p className="text-gray-600 text-sm mb-4">
                        認証エラーまたはサーバーエラーが発生しました。<br />
                        時間をおいて再読み込みしてください。
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        ページを再読み込み
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <PageHeader
                title="講師用ダッシュボード"
                subtitle="生徒の学習状況・ランキング"
            />

            {/* Sticky Command Bar */}
            <FilterCommandBar
                currentRange={rangeOption}
                currentGrade={gradeFilter}
                availableMonths={stats?.availableMonths || []}
                onRangeChange={handleRangeChange}
                onGradeChange={setGradeFilter}
            />

            {/* KPI Section */}
            <div className={styles.kpiSection}>
                {/* Row 1: Totals */}
                <div className={styles.kpiGrid}>
                    <KPICard
                        label="平均学習時間 (生徒1人・1日あたり)"
                        value={stats ? Math.floor(stats.avgDurationPerVisit.value / 60) : 0}
                        unit={'時間 ' + (stats ? `${stats.avgDurationPerVisit.value % 60}分` : '')}
                        trend={stats?.avgDurationPerVisit.trend && stats.avgDurationPerVisit.trend > 0 ? 'up' : stats?.avgDurationPerVisit.trend && stats.avgDurationPerVisit.trend < 0 ? 'down' : 'neutral'}
                        trendValue={stats ? `${Math.abs(stats.avgDurationPerVisit.trend)}%` : ''}
                        icon={<Clock size={24} />}
                        loading={isLoading}
                    />
                    <KPICard
                        label="平均通塾回数 (生徒1人あたり)"
                        value={stats ? stats.avgVisitsPerStudent.value : 0}
                        unit={`回 / ${stats ? stats.periodDays : '-'}日`}
                        trend={stats?.avgVisitsPerStudent.trend && stats.avgVisitsPerStudent.trend > 0 ? 'up' : stats?.avgVisitsPerStudent.trend && stats.avgVisitsPerStudent.trend < 0 ? 'down' : 'neutral'}
                        trendValue={stats ? `${Math.abs(stats.avgVisitsPerStudent.trend)}%` : ''}
                        icon={<Users size={24} />}
                        loading={isLoading}
                    />
                </div>

                {/* Row 2: Rankings (Top, Growth, Drop) */}
                <div className={styles.listsGrid}>
                    <RankerListCard
                        title="トップランカー"
                        icon="user"
                        type="duration"
                        data={stats?.ranking || []}
                        loading={isLoading}
                    />
                    <RankerListCard
                        title="急上昇 (前期間比)"
                        icon="trend-up"
                        type="growth"
                        data={stats?.metricLists?.growers || []}
                        loading={isLoading}
                    />
                    <RankerListCard
                        title="減少 (前期間比)"
                        icon="trend-down"
                        type="drop" // OR "vanished" if we want to combine? Let's use droppers for now.
                        data={stats?.metricLists?.droppers || []}
                        loading={isLoading}
                    />
                </div>
            </div>

            {/* Chart & Ranking Section */}
            <div className={styles.mainGrid}>
                {/* Cumulative Growth Chart */}
                <GlassCard className={styles.cardPadding}>
                    <CumulativeGrowthChart
                        data={stats?.history || []}
                        loading={isLoading}
                        selectedStudents={selectedStudents}
                        onSelectionChange={setSelectedStudents}
                    />
                </GlassCard>

                {/* Ranking */}
                <GlassCard className={styles.cardPadding}>
                    <RankingWidget
                        ranking={stats?.ranking || []}
                        periodDays={stats?.periodDays || 0}
                        loading={isLoading}
                        badges={stats?.badges}
                        viewerId={profile?.userId}
                    />
                </GlassCard>
            </div>

            <div style={{ marginTop: '40px' }}>
                <BackLink href="/">
                    ポータルに戻る
                </BackLink>
            </div>
        </div >
    );
}
