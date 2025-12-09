'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import Image from 'next/image';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import styles from './OccupancyCard.module.css';

interface StatusConfig {
    text: string;
    color: string;
}

interface OccupancyCardProps {
    title: string;
    count: number | undefined;
    max: number;
    moleImage?: string;
    comingSoon?: boolean;
}


export const OccupancyCard = ({ title, count, max, moleImage, comingSoon }: OccupancyCardProps) => {

    const getStatus = (count: number | undefined, max: number): StatusConfig => {
        if (count === undefined) return { text: "--", color: "#dfe6e9" };
        const ratio = count / max;
        if (ratio <= 0.33) return { text: "空いています", color: "var(--status-low)" };
        if (ratio <= 0.66) return { text: "やや混雑しています", color: "var(--status-mid)" };
        return { text: "混雑しています", color: "var(--status-high)" };
    };

    const status = getStatus(count, max);
    const percent = count !== undefined ? Math.min((count / max) * 100, 100) : 0;

    const cardContent = (
        <GlassCard className={styles.card}>
            <div className={styles.top}>
                <div className={styles.roomName}>{title}</div>
                <div className={`${styles.badge} animate-pulse-badge`} style={{ background: status.color }}>{status.text}</div>
            </div>

            <div className={styles.numberArea}>
                <span className={styles.number}>
                    <AnimatedNumber value={count} />
                </span>
                <span className={styles.unit}>人</span>
                <span className={styles.capacity}>/ {max !== undefined ? max : '--'}人</span>
            </div>

            <div className={styles.barBg}>
                <div className={styles.barFill} style={{ width: `${percent}%`, backgroundColor: status.color }}></div>
            </div>

            {comingSoon && (
                <div className={styles.overlay} style={{
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)'
                }}>
                    <div className={styles.overlayContent}>
                        <div className={`${styles.overlayIcon} animate-pulse-icon`}>🚧</div>
                        <div className={styles.overlayTitle}>準備中</div>
                        <div className={styles.overlayMessage}>
                            本館の在室人数表示は<br />
                            <strong>12/9(火)</strong>から開始します
                        </div>
                    </div>
                </div>
            )}
        </GlassCard>
    );

    if (moleImage) {
        return (
            <div className={styles.wrapper}>
                <Image
                    src={moleImage}
                    alt="モグラ"
                    className={styles.mole}
                    width={75}
                    height={75}
                    style={{ height: 'auto' }}
                />
                {cardContent}
            </div>
        );
    }

    return cardContent;
};
