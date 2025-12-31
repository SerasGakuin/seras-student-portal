import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './KPICard.module.css';

interface KPICardProps {
    label: string;
    value: string | number;
    unit?: string;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: React.ReactNode;
    loading?: boolean;
}

export const KPICard = ({ label, value, unit, subValue, trend, trendValue, icon, loading = false }: KPICardProps) => {
    return (
        <GlassCard className={styles.card}>
            <div className={styles.header}>
                <span className={styles.label}>{label}</span>
                {icon && <div style={{ color: 'var(--brand-color)', opacity: 0.8 }}>{icon}</div>}
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Skeleton width="120px" height="40px" />
                    <Skeleton width="80px" height="20px" />
                </div>
            ) : (
                <>
                    <div className={styles.valueContainer}>
                        <span className={styles.value}>{value}</span>
                        {unit && <span className={styles.unit}>{unit}</span>}
                    </div>

                    <div style={{ minHeight: '24px' }}>
                        {(trend || subValue) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                {trend && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '2px',
                                        color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : 'var(--text-sub)',
                                        fontWeight: 600,
                                        backgroundColor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        padding: '2px 6px',
                                        borderRadius: '12px'
                                    }}>
                                        {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
                                    </div>
                                )}
                                {subValue && <span style={{ color: 'var(--text-sub)' }}>{subValue}</span>}
                            </div>
                        )}
                    </div>
                </>
            )}
        </GlassCard>
    );
};

