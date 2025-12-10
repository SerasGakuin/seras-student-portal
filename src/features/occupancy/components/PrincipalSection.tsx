import styles from './OccupancyCard.module.css';

interface PrincipalSectionProps {
    isOpen: boolean;
    isToggling: boolean;
    onToggle: () => void;
}

export const PrincipalSection = ({ isOpen, isToggling, onToggle }: PrincipalSectionProps) => {
    return (
        <div className={`${styles.controlArea} ${styles.animateEntry}`}>
            <button
                className={`${styles.toggleButton} ${isOpen ? styles.btnClose : styles.btnOpen}`}
                onClick={onToggle}
                disabled={isToggling}
            >
                {isToggling ? '更新中...' : (isOpen ? '🔒 閉める' : '🔓 開ける')}
            </button>
            <span className={styles.lastUpdated}>
                ※ 操作はログに記録されます
            </span>
        </div>
    );
};
