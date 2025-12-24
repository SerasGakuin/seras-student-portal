'use client';

import { useLiff } from '@/lib/liff';
import { useRole } from '@/hooks/useRole';
import { getDisplayName } from '@/lib/utils';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle: string;
}

import { memo } from 'react';

export const PageHeader = memo(({ title, subtitle }: PageHeaderProps) => {
    const { student, profile, isLoading: isLiffLoading } = useLiff();
    const { displayName: roleDisplayName, isLoading: isRoleLoading } = useRole();

    // Prefer roleDisplayName (handles both LINE and Google auth)
    // Fallback to LINE profile/student name if roleDisplayName is null
    const displayName = roleDisplayName || getDisplayName(student, profile);
    const isLoading = isLiffLoading || isRoleLoading;

    return (
        <header>
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
            {isLoading ? (
                <div className={`${styles.skeletonBadge} ${styles.animatePulse}`}>
                    <div className={styles.skeletonText}></div>
                </div>
            ) : (
                <div className={styles.greetingBadge}>
                    <span className={styles.icon}>👋</span>
                    <span>こんにちは、{displayName}さん</span>
                </div>
            )}
        </header>
    );
});
PageHeader.displayName = 'PageHeader';
