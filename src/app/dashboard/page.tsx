'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DashboardSummary } from '@/services/dashboardService';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

import { KPICard } from '@/features/dashboard/components/KPICard';
import { RankingWidget } from '@/features/dashboard/components/RankingWidget';
// Removed legacy DashboardControls
import { FilterCommandBar } from '@/features/dashboard/components/FilterCommandBar';
import { CumulativeGrowthChart } from '@/features/dashboard/components/CumulativeGrowthChart';

import { Clock, Users, Trophy } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useRouter } from 'next/navigation';

import { useLiff } from '@/lib/liff';

// Re-defining these here or importing them if I had moved them.
// For now, let's just use string types compatible with the component or import from the old file if it still exists (it does).
import { FilterType, DateRangeOption } from '@/features/dashboard/components/DashboardControls';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Global Filter State
    const [rangeOption, setRangeOption] = useState<DateRangeOption>('last_30_days');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
        from: undefined,
        to: undefined
    });
    const [gradeFilter, setGradeFilter] = useState<FilterType>('ALL'); // Global Grade Filter

    // Access Control
    const { canViewDashboard, isLoading: isRoleLoading } = useRole();
    const { profile } = useLiff();
    const router = useRouter();

    // Initialize date range to last 30 days on client mount
    useEffect(() => {
        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - 29); // 30 days inclusive
        from.setHours(0, 0, 0, 0);
        const to = new Date(); // now

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

    useEffect(() => {
        const fetchStats = async () => {
            if (!profile?.userId) return;

            setIsLoading(true);
            try {
                // Construct URL with params
                const params = new URLSearchParams();
                if (dateRange.from) params.set('from', dateRange.from.toISOString());
                if (dateRange.to) params.set('to', dateRange.to.toISOString());

                // Add Grade Param
                if (gradeFilter !== 'ALL') params.set('grade', gradeFilter);

                const res = await fetch(`/api/dashboard/stats?${params.toString()}`, {
                    headers: {
                        'x-line-user-id': profile.userId
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                setStats(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        if (canViewDashboard && profile?.userId) {
            fetchStats();
        }
    }, [canViewDashboard, profile, dateRange, gradeFilter]);

    const handleRangeChange = (option: DateRangeOption, from: Date, to: Date) => {
        setRangeOption(option);
        setDateRange({ from, to });
    };

    if (isRoleLoading) return <LoadingOverlay />;
    if (!canViewDashboard) return null;

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <KPICard
                    label="総学習時間 (指定期間)"
                    value={stats ? Math.floor(stats.totalDuration.value / 60) : 0}
                    unit="時間"
                    subValue={stats ? `${stats.totalDuration.value % 60}分` : ''}
                    trend={stats?.totalDuration.trend && stats.totalDuration.trend > 0 ? 'up' : stats?.totalDuration.trend && stats.totalDuration.trend < 0 ? 'down' : 'neutral'}
                    trendValue={stats ? `${Math.abs(stats.totalDuration.trend)}%` : ''}
                    icon={<Clock size={24} />}
                    loading={isLoading}
                />
                <KPICard
                    label="延べ通塾人数"
                    value={stats ? stats.totalVisits.value : 0}
                    unit="人"
                    trend={stats?.totalVisits.trend && stats.totalVisits.trend > 0 ? 'up' : stats?.totalVisits.trend && stats.totalVisits.trend < 0 ? 'down' : 'neutral'}
                    trendValue={stats ? `${Math.abs(stats.totalVisits.trend)}%` : ''}
                    icon={<Users size={24} />}
                    loading={isLoading}
                />
                <KPICard
                    label="トップ学習者"
                    value={stats?.topStudent?.name || '-'}
                    subValue={stats?.topStudent ? `${Math.floor((stats.topStudent.totalDurationMinutes || 0) / 60)}時間${(stats.topStudent.totalDurationMinutes || 0) % 60}分` : ''}
                    icon={<Trophy size={24} />}
                    loading={isLoading}
                />
            </div>

            {/* Chart & Ranking Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Cumulative Growth Chart */}
                <GlassCard style={{ padding: '32px' }}>
                    <CumulativeGrowthChart data={stats?.history || []} loading={isLoading} />
                </GlassCard>

                {/* Ranking */}
                <GlassCard style={{ padding: '32px' }}>
                    <RankingWidget ranking={stats?.ranking || []} periodDays={stats?.periodDays || 0} loading={isLoading} />
                </GlassCard>
            </div>
        </div>
    );
}
