import styles from './PrincipalControlPanel.module.css';
import { OccupancyData } from '@/types';

interface PrincipalControlPanelProps {
    data: OccupancyData | null;
    updatingBuildingId: '1' | '2' | null;
    onToggle: (buildingId: '1' | '2', currentStatus: boolean) => void;
}

export const PrincipalControlPanel = ({ data, updatingBuildingId, onToggle }: PrincipalControlPanelProps) => {
    // If no data, show skeleton
    if (!data) {
        return (
            <div className={`${styles.panel} ${styles.skeleton} animate-pulse`}>
                <div className={styles.skeletonButton}></div>
                <div className={styles.skeletonButton}></div>
            </div>
        );
    }

    const b1 = data.building1;
    const b2 = data.building2;

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <span className={styles.icon}>🗝️</span>
                <span className={styles.title}>教室管理</span>
            </div>

            {/* Building 2 (Primary) */}
            <button
                className={`${styles.button} ${styles.primary} ${b2.isOpen ? styles.btnClose : styles.btnOpen}`}
                onClick={() => onToggle('2', b2.isOpen)}
                disabled={!!updatingBuildingId}
            >
                <div className={styles.btnContent}>
                    <span className={styles.buildingName}>2号館</span>
                    <div className={styles.statusGroup}>
                        <span className={styles.statusText}>{b2.isOpen ? '開館中' : '閉館中'}</span>
                    </div>
                </div>
                <div className={styles.actionArea}>
                    <span className={styles.actionIcon}>{b2.isOpen ? '🔒' : '🔓'}</span>
                    <span className={styles.actionText}>{b2.isOpen ? '閉める' : '開ける'}</span>
                </div>
            </button>

            {/* Building 1 (Secondary) */}
            <button
                className={`${styles.button} ${styles.secondary} ${b1.isOpen ? styles.btnClose : styles.btnOpen}`}
                onClick={() => onToggle('1', b1.isOpen)}
                disabled={!!updatingBuildingId}
            >
                <div className={styles.btnContent}>
                    <span className={styles.buildingName}>本館</span>
                    <span className={styles.statusTextMini}>{b1.isOpen ? '開館中' : '閉館中'}</span>
                </div>
                <div className={styles.actionAreaSmall}>
                    <span className={styles.actionIconMini}>{b1.isOpen ? '🔒' : '🔓'}</span>
                    <span className={styles.actionTextMini}>{b1.isOpen ? '閉める' : '開ける'}</span>
                </div>
            </button>
        </div>
    );
};
