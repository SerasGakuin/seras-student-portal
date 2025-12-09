'use client';

import { useLiff } from '@/lib/liff';
import { getDisplayName } from '@/lib/utils';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle: string;
}

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
    const { student, profile } = useLiff();
    const displayName = getDisplayName(student, profile);

    return (
        <header>
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
            {student && (
                <div className={styles.greetingBadge}>
                    <span className={styles.icon}>👋</span>
                    <span>こんにちは、{displayName}さん</span>
                </div>
            )}
        </header>
    );
};
