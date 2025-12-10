import { OccupancyMember } from '@/types';
import styles from './OccupancyCard.module.css';

interface TeacherSectionProps {
    members: OccupancyMember[];
}

export const TeacherSection = ({ members }: TeacherSectionProps) => {
    if (members.length === 0) return null;

    return (
        <div className={`${styles.memberListArea} ${styles.animateEntry}`}>
            <div className={styles.listTitle}>
                <span>👨‍🎓</span> 在室中の生徒 ({members.length}名)
            </div>
            <div className={styles.memberList}>
                {members.map((m, i) => (
                    <div key={i} className={styles.memberItem}>
                        <span className={styles.gradeBadge}>{m.grade}</span>
                        <span className={styles.memberName}>{m.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
