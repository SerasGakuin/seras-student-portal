'use client';

import { PortalCard } from '@/components/ui/PortalCard';
import styles from './page.module.css';

import { PageHeader } from '@/components/ui/PageHeader';
import { useRole } from '@/hooks/useRole';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { GlassCard } from '@/components/ui/GlassCard';

export default function PortalHome() {
  const { canViewDashboard, isLoading } = useRole();
  const { isAuthenticated: isGoogleAuthenticated, signInWithGoogle, signOutFromGoogle } = useGoogleAuth();

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

        {/* Google Login Section for PC Users (Teachers) */}
        {!isLoading && !canViewDashboard && (
          <GlassCard style={{ marginTop: '40px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-sub)', marginBottom: '16px' }}>
              講師・教室長の方は、Googleアカウントでログインしてください
            </div>
            <button
              onClick={() => signInWithGoogle()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#fff',
                background: 'var(--brand-color)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-badge)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Googleでログイン
            </button>
          </GlassCard>
        )}

        {/* Logout button for Google authenticated users */}
        {isGoogleAuthenticated && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={() => signOutFromGoogle()}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-sub)',
                background: 'transparent',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Googleからログアウト
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
