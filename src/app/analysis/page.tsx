'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { BackLink } from '@/components/ui/BackLink';
import { GlassCard } from '@/components/ui/GlassCard';
import { useRole } from '@/hooks/useRole';
import { useLiff } from '@/lib/liff';
import { api } from '@/lib/api';
import { OccupancyAnalysisData } from '@/types/analysis';

import { AnalysisSelector } from '@/features/analysis/components/AnalysisSelector';
import { AnalysisDateRange } from '@/features/analysis/components/AnalysisDateRange';
import { ChartContainer } from '@/features/analysis/components/ChartContainer';
import { OccupancyHeatmap } from '@/features/analysis/components/OccupancyHeatmap';
import { DailyTrendsChart } from '@/features/analysis/components/DailyTrendsChart';
import { DailyBreakdownChart } from '@/features/analysis/components/DailyBreakdownChart';

import styles from './analysis.module.css';

function getDefaultDates() {
  const now = new Date();
  const to = new Date(now);
  to.setDate(now.getDate() - 1); // 昨日まで
  const from = new Date(to);
  from.setDate(to.getDate() - 29); // 30日間

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function AnalysisPage() {
  const [analysisType, setAnalysisType] = useState('occupancy');
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [data, setData] = useState<OccupancyAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { canViewDashboard, isLoading: isRoleLoading } = useRole();
  const { profile } = useLiff();
  const router = useRouter();

  // 権限チェック
  useEffect(() => {
    if (!isRoleLoading && !canViewDashboard) {
      router.replace('/');
    }
  }, [isRoleLoading, canViewDashboard, router]);

  const lineUserId = profile?.userId ?? null;

  const handleRun = async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await api.analysis.getOccupancyData(lineUserId, dateFrom, dateTo);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isRoleLoading) {
    return (
      <div className="container">
        <PageHeader title="データ分析" subtitle="読み込み中..." />
      </div>
    );
  }

  if (!canViewDashboard) return null;

  return (
    <div className={styles.container}>
      <PageHeader
        title={<><span className="brand">データ</span>分析</>}
        subtitle="在室状況の分析・可視化"
      />

      <main>
        {/* 分析タイプ選択 */}
        <AnalysisSelector selected={analysisType} onSelect={setAnalysisType} />

        {/* パラメータ設定 */}
        <GlassCard style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ padding: '4px 0' }}>
            <AnalysisDateRange
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
            <button
              className={styles.runButton}
              onClick={handleRun}
              disabled={isLoading || !dateFrom || !dateTo}
            >
              {isLoading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>&#9696;</span>
                  分析中...
                </>
              ) : (
                '分析を実行'
              )}
            </button>
          </div>
        </GlassCard>

        {/* エラー表示 */}
        {error && (
          <GlassCard className={styles.errorCard}>
            {error}
          </GlassCard>
        )}

        {/* ローディングスケルトン */}
        {isLoading && (
          <div className={styles.results}>
            <div className={styles.skeletonChart} />
            <div className={styles.skeletonChart} />
            <div className={styles.skeletonChart} />
          </div>
        )}

        {/* 結果表示 */}
        {data && !isLoading && (
          <>
            <div className={styles.periodBadge}>
              {data.period.from} 〜 {data.period.to}（{data.totalDays}日間）
            </div>

            <div className={styles.results}>
              <ChartContainer title="曜日・時間帯別 平均混雑度">
                <OccupancyHeatmap data={data.heatmap} />
              </ChartContainer>

              <ChartContainer title="日次在室トレンド">
                <DailyTrendsChart data={data.trends} />
              </ChartContainer>

              <ChartContainer title="日次内訳（館別）">
                <DailyBreakdownChart data={data.breakdown} />
              </ChartContainer>
            </div>
          </>
        )}

        <BackLink href="/" style={{ marginTop: 'var(--spacing-xl)' }}>
          ポータルに戻る
        </BackLink>
      </main>
    </div>
  );
}
