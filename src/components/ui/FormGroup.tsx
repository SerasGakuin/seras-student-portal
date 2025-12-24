import React from 'react';

import styles from './FormGroup.module.css';

interface FormGroupProps {
    label: string;
    children: React.ReactNode;
    error?: string;
}

export const FormGroup = ({ label, children, error }: FormGroupProps) => {
    return (
        <div className={styles.group}>
            <label className={styles.label}>{label}</label>
            {children}
            {error && (
                <span className={styles.error} role="alert" aria-live="polite">
                    {error}
                </span>
            )}
        </div>
    );
};
