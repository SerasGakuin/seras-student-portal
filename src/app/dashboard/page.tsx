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

import { Clock, Users, Trophy } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useRouter } from 'next/navigation';

// Re-defining these here or importing them if I had moved them.
// For now, let's just use string types compatible with the component or import from the old file if it still exists (it does).
import { FilterType, DateRangeOption } from '@/features/dashboard/components/DashboardControls';

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
    const { canViewDashboard, isLoading: isRoleLoading, authMethod, displayName } = useRole();
    const { signInWithGoogle } = useGoogleAuth();
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
            setIsLoading(true);
            try {
                // Construct URL with params
                const params = new URLSearchParams();
                if (dateRange.from) params.set('from', dateRange.from.toISOString());
                if (dateRange.to) params.set('to', dateRange.to.toISOString());

                // Add Grade Param
                if (gradeFilter !== 'ALL') params.set('grade', gradeFilter);

                const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                setStats(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        if (canViewDashboard) {
            fetchStats();
        }
    }, [canViewDashboard, dateRange, gradeFilter]);

    // Fetch Badges Removed (Now in DashboardStats)


    const handleRangeChange = (option: DateRangeOption, from: Date, to: Date) => {
        setRangeOption(option);
        setDateRange({ from, to });
    };

    if (isRoleLoading) return <LoadingOverlay />;

    // Show login screen for unauthenticated users
    if (!canViewDashboard) {
        return (
            <div className="container" style={{ maxWidth: '480px', paddingTop: '100px', textAlign: 'center' }}>
                <GlassCard style={{ padding: '40px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '16px' }}>講師用ダッシュボード</h1>
                    <p style={{ color: 'var(--text-sub)', marginBottom: '24px' }}>
                        このページは講師・教室長専用です。<br />Seras学院のアカウントでログインしてください。
                    </p>
                    <button
                        onClick={() => signInWithGoogle()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            width: '100%',
                            padding: '14px 24px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#fff',
                            background: 'var(--brand-color)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-badge)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Googleでログイン
                    </button>
                    <div style={{ marginTop: '24px' }}>
                        <BackLink href="/">ポータルに戻る</BackLink>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '1200px', paddingBottom: '80px', position: 'relative' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                {/* Row 1: Totals */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Cumulative Growth Chart */}
                <GlassCard style={{ padding: '32px' }}>
                    <CumulativeGrowthChart
                        data={stats?.history || []}
                        loading={isLoading}
                        selectedStudents={selectedStudents}
                        onSelectionChange={setSelectedStudents}
                    />
                </GlassCard>

                {/* Ranking */}
                <GlassCard style={{ padding: '32px' }}>
                    <RankingWidget
                        ranking={stats?.ranking || []}
                        periodDays={stats?.periodDays || 0}
                        loading={isLoading}
                        badges={stats?.badges}
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
