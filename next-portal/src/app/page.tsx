'use client';

import Link from 'next/link';
import { useLiff } from '@/lib/liff';

export default function Home() {
  const { profile, isLoading, isLoggedIn } = useLiff();

  if (isLoading) {
    return (
      <div className="loading-overlay visible">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container">
        <header>
          <h1><span className="brand">Seras学院</span> 予約メニュー</h1>
        </header>
        <div className="glass-card">
          <p>LINEログインが必要です。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1><span className="brand">Seras学院</span> 予約メニュー</h1>
        <div className="user-badge">
          {profile?.displayName || 'ゲスト'}
        </div>
      </header>

      <main>
        <div className="glass-card animate-slide-up" style={{ gap: '16px' }}>
          <p style={{ marginBottom: '4px', fontWeight: 700 }}>ご希望の手続きを選択してください</p>

          <Link href="/booking" className="btn-base btn-meeting">
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </span>
            面談を予約する
          </Link>

          <Link href="/rest" className="btn-base btn-rest" style={{ marginTop: 0 }}>
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4 4V8z"></path>
                <line x1="6" y1="1" x2="6" y2="4"></line>
                <line x1="10" y1="1" x2="10" y2="4"></line>
                <line x1="14" y1="1" x2="14" y2="4"></line>
              </svg>
            </span>
            休む日を登録する
          </Link>
        </div>
      </main>
    </div>
  );
}
