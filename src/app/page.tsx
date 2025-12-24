'use client';

import { PortalCard } from '@/components/ui/PortalCard';
import styles from './page.module.css';

import { PageHeader } from '@/components/ui/PageHeader';
import { useRole } from '@/hooks/useRole';

export default function PortalHome() {
  const { canViewDashboard } = useRole();

  return (
    <div className="container">
      <PageHeader
        title={<><span className="brand">Seras学院</span> 生徒ポータル</>}
        subtitle="各種サービスにアクセスできます"
      />

      <main>
        <div className={styles.grid}>
          <PortalCard
            href="/occupancy"
            title="在室人数"
            description="自習室の混雑状況をリアルタイムで確認"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            }
          />

          <PortalCard
            href="/booking"
            title="予約システム"
            description="面談予約・休み登録"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            }
          />

          {/* Dashboard Link for Teachers/Principals */}
          {canViewDashboard && (
            <PortalCard
              href="/dashboard"
              title="講師ダッシュボード"
              description="学習状況・ランキング分析"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
