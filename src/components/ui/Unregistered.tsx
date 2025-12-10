'use client';

import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { BackLink } from './BackLink';
import styles from './LoginRequired.module.css'; // Reusing the same styles for consistency

export const Unregistered = () => {
    const handleReload = () => {
        window.location.reload();
    };

    return (
        <div className={styles.container}>
            <GlassCard className={`animate-fade-in ${styles.card}`}>
                <div className={styles.iconWrapper} style={{ color: 'var(--status-high)' }}>
                    <span className={styles.icon}>⚠️</span>
                </div>
                <h2 className={styles.title}>生徒登録が見つかりません</h2>
                <p className={styles.description}>
                    このLINEアカウントは生徒登録されていません。<br />
                    教室管理者(綿引)にお問い合わせください。
                </p>

                <div style={{
                    marginTop: '-1rem',
                    marginBottom: '1rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    background: 'rgba(0,0,0,0.03)',
                    padding: '1rem',
                    borderRadius: '12px',
                    textAlign: 'left'
                }}>
                    <strong>保護者の方へ：</strong><br />
                    こちらは生徒用の面談予約ページになります。
                </div>

                <Button variant="primary" onClick={handleReload}>
                    再読み込み
                </Button>

                <BackLink href="/">
                    ホームに戻る
                </BackLink>
            </GlassCard>
        </div>
    );
};
