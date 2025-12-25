
import { StudentStats } from '@/services/dashboardService';
import { User, TrendingUp, TrendingDown, Ghost } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface RankerListCardProps {
    title: string;
    icon: 'user' | 'trend-up' | 'trend-down' | 'ghost'; // Icon type
    data: StudentStats[];
    type: 'duration' | 'growth' | 'drop' | 'vanished'; // For formatting value
    loading?: boolean;
}

export const RankerListCard = ({ title, icon, data, type, loading }: RankerListCardProps) => {

    const getIcon = () => {
        switch (icon) {
            case 'user': return <User size={18} />;
            case 'trend-up': return <TrendingUp size={18} />;
            case 'trend-down': return <TrendingDown size={18} />;
            case 'ghost': return <Ghost size={18} />;
        }
    };

    const formatValue = (student: StudentStats) => {
        if (type === 'duration') {
            return `${Math.floor(student.totalDurationMinutes / 60)}h`;
        }
        if (type === 'growth') {
            const h = Math.floor((student.growth || 0) / 60);
            return `+${h}h`;
        }
        if (type === 'drop' || type === 'vanished') {
            const h = Math.floor((student.growth || 0) / 60); // growth is negative
            return `${h}h`; // Display as "-10h" naturally
        }
        return '';
    };

    return (
        <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-sub)' }}>
                {getIcon()}
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</span>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} style={{ height: '32px', background: '#f1f5f9', borderRadius: '6px' }} />
                    ))
                ) : data.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', textAlign: 'center', padding: '20px' }}>
                        該当データなし
                    </div>
                ) : (
                    data.slice(0, 3).map((student, i) => (
                        <div key={student.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Rank Badge */}
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: i === 0 ? '#fff7ed' : '#f8fafc',
                                    color: i === 0 ? '#ea580c' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: i === 0 ? '1px solid #fdba74' : 'none'
                                }}>
                                    {i + 1}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: i === 0 ? 700 : 500, color: 'var(--text-main)' }}>
                                        {student.name}
                                    </span>
                                    {i === 0 && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>
                                            {student.grade || ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                fontWeight: 700,
                                fontSize: i === 0 ? '1.1rem' : '0.9rem',
                                color: type === 'drop' || type === 'vanished' ? '#ef4444' : type === 'growth' ? '#10b981' : 'var(--text-main)'
                            }}>
                                {formatValue(student)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </GlassCard>
    );
};
