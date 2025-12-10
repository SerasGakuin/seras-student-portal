'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import Image from 'next/image';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import styles from './OccupancyCard.module.css';
import { BuildingStatus } from '@/types';
import { useLiff } from '@/lib/liff';
import { TeacherSection } from './TeacherSection';

// StatusConfig removed as it was unused

interface OccupancyCardProps {
    title: string;
    // buildingId removed as it is no longer used for internal toggle logic
    data?: BuildingStatus | null;
    max: number;
    moleImage?: string;
    comingSoon?: boolean;
    isLoading?: boolean;
}

export const OccupancyCard = ({ title, data, max, moleImage, comingSoon, isLoading }: OccupancyCardProps) => {
    const { student, isLoading: isAuthLoading } = useLiff();

    // Determines if we are ready to render the final state
    // We wait for BOTH data and auth to prevent layout popping. Also check explicit isLoading prop.
    const isReady = !!(data && !isAuthLoading && !isLoading);

    // Determine Roles
    // Principal (教室長): Can open/close
    // Teacher (講師): Can view members
    const isPrincipal = student?.status === '教室長';
    const isTeacher = student?.status === '在塾(講師)' || isPrincipal;

    if (moleImage) {
        return (
            <div className={styles.wrapper}>
                <Image
                    src={moleImage}
                    alt="Character"
                    className={styles.mole}
                    width={75}
                    height={75}
                    style={{ height: 'auto' }}
                />
                <CardContent
                    title={title}
                    max={max}
                    data={data}
                    comingSoon={comingSoon}
                    isReady={isReady}
                    // isReady already includes isLoading logic
                    isTeacher={isTeacher}
                />
            </div>
        );
    }

    return (
        <CardContent
            title={title}
            max={max}
            data={data}
            comingSoon={comingSoon}
            isReady={isReady}
            isTeacher={isTeacher}
        />
    );
};

interface CardContentProps {
    title: string;
    max: number;
    data?: BuildingStatus | null;
    comingSoon?: boolean;
    isReady: boolean | undefined;
    isTeacher: boolean;
}

// Extracted for cleaner render logic and reuse
const CardContent = ({ title, max, data, comingSoon, isReady, isTeacher }: CardContentProps) => {
    // If not ready, show Skeleton (Maintains correct height)
    if (!isReady || !data) {
        return (
            <GlassCard className={styles.card}>
                <div className={styles.top}>
                    <div className={styles.roomName}>{title}</div>
                    <div className={`${styles.badge}`} style={{ background: '#e2e8f0', color: 'transparent' }}>Loading</div>
                </div>
                <div className={styles.statusContent}>
                    <div className={`${styles.skeleton} animate-pulse`}>
                        <div className={styles.skeletonText}></div>
                        <div className={styles.skeletonBar}></div>
                    </div>
                </div>
            </GlassCard>
        );
    }

    // Ready State
    const status = getStatus(data.count, max, data.isOpen);
    const percent = data.isOpen ? Math.min((data.count / max) * 100, 100) : 0;

    return (
        <GlassCard className={styles.card}>
            {/* Top Bar */}
            <div className={styles.top}>
                <div className={styles.roomName}>{title}</div>
                <div className={`${styles.badge} animate-pulse-badge`} style={{ background: status.color }}>
                    {status.text}
                </div>
            </div>

            {/* Main Content: Open vs Closed */}
            <div className={styles.statusContent}>
                {data.isOpen ? (
                    <div className={styles.animateEntry}>
                        <div className={styles.numberArea}>
                            <span className={styles.number}>
                                <AnimatedNumber value={data.count} />
                            </span>
                            <span className={styles.unit}>人</span>
                            <span className={styles.capacity}>/ {max}人</span>
                        </div>

                        <div className={styles.barBg}>
                            <div className={styles.barFill} style={{ width: `${percent}%`, backgroundColor: status.color }}></div>
                        </div>
                    </div>
                ) : (
                    <div className={`${styles.closedState} ${styles.animateEntry}`}>
                        {new Date().getHours() < 19 ? (
                            <>
                                <div className={styles.closedIcon}>🌅</div>
                                <div className={styles.closedText}>本日はまだ開館していません</div>
                            </>
                        ) : (
                            <>
                                <div className={styles.closedIcon}>🌙</div>
                                <div className={styles.closedText}>本日は終了しました</div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Teacher View: Member List */}
            {isTeacher && data.isOpen && (
                <TeacherSection members={data.members} />
            )}

            {/* Coming Soon Overlay */}
            {comingSoon && (
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <div className={`${styles.overlayIcon} animate-pulse-icon`}>🚧</div>
                        <div className={styles.overlayTitle}>準備中</div>
                        <div className={styles.overlayMessage}>
                            この機能は順次公開予定です
                        </div>
                    </div>
                </div>
            )}
        </GlassCard>
    );
};

// Helper
const getStatus = (count: number, max: number, isOpen: boolean) => {
    if (!isOpen) return { text: "閉館", color: "#64748b" }; // Slate-500
    const ratio = count / max;
    if (ratio <= 0.33) return { text: "空いています", color: "var(--status-low)" };
    if (ratio <= 0.66) return { text: "やや混雑", color: "var(--status-mid)" };
    return { text: "混雑", color: "var(--status-high)" };
};

