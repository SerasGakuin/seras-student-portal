'use client';

import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { BackLink } from './BackLink';
import styles from './LoginRequired.module.css';

export const LoginRequired = () => {
    const handleReload = () => {
        window.location.reload();
    };

    return (
        <div className={styles.container}>
            <GlassCard className={`animate-fade-in ${styles.card}`}>
                <div className={styles.iconWrapper}>
                    <span className={styles.icon}>🔒</span>
                </div>
                <h2 className={styles.title}>ログインが必要です</h2>
                <p className={styles.description}>
                    この機能を利用するには、LINEアプリからアクセスするか、
                    ログイン情報を確認してください。
                </p>
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
