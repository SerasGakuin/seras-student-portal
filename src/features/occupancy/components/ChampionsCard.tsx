'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLiff } from '@/lib/liff';
import { useRole } from '@/hooks/useRole';
import { Trophy, Sunrise, Moon, CalendarDays, Timer, Zap, Crown } from 'lucide-react';
import type { UnifiedWeeklyBadges, BadgeType } from '@/services/badgeService';

const BADGE_CONFIG: Record<BadgeType, { label: string; icon: React.ReactNode; desc: string }> = {
    'HEAVY_USER': {
        label: 'トップランカー',
        icon: <Crown size={18} />,
        desc: '勉強時間の合計がトップクラス'
    },
    'EARLY_BIRD': {
        label: '早起きマスター',
        icon: <Sunrise size={18} />,
        desc: '朝イチから来て勉強している'
    },
    'NIGHT_OWL': {
        label: '深夜マスター',
        icon: <Moon size={18} />,
        desc: '閉館ギリギリまで残って勉強している'
    },
    'CONSISTENT': {
        label: '皆勤賞候補',
        icon: <CalendarDays size={18} />,
        desc: 'ほぼ毎日、塾に来ている'
    },
    'MARATHON': {
        label: '長時間マスター',
        icon: <Timer size={18} />,
        desc: '1回の滞在時間が長い'
    },
    'RISING_STAR': {
        label: '急上昇',
        icon: <Zap size={18} />,
        desc: '前の週より勉強時間が大幅にアップ'
    },
};

export const ChampionsCard = () => {
    const [ranking, setRanking] = useState<UnifiedWeeklyBadges | null>(null);
    const [activeTab, setActiveTab] = useState<'exam' | 'general'>('exam');
    const { student, isLoading: isLiffLoading } = useLiff();
    const { isLoading: isRoleLoading } = useRole();

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const data = await api.ranking.get(student?.lineId);
                setRanking(data);

                // Set initial tab based on user's group
                if (student) {
                    if (student.grade === '高3' || student.grade === '既卒') {
                        setActiveTab('exam');
                    } else {
                        setActiveTab('general');
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        if (!isLiffLoading && !isRoleLoading) {
            fetchRanking();
        }
    }, [student?.lineId, student?.grade, isLiffLoading, isRoleLoading]);

    if (!ranking || isLiffLoading || isRoleLoading) return null;

    const currentMap = ranking[activeTab] || {};

    // Group by type
    const groups: Partial<Record<BadgeType, { name: string; rank: number }[]>> = {};
    Object.entries(currentMap).forEach(([name, badges]) => {
        badges.forEach(b => {
            if (!groups[b.type]) groups[b.type] = [];
            groups[b.type]!.push({ name, rank: b.rank });
        });
    });

    const order: BadgeType[] = ['HEAVY_USER', 'RISING_STAR', 'EARLY_BIRD', 'NIGHT_OWL', 'MARATHON', 'CONSISTENT'];
    const hasAnyWinners = order.some(type => groups[type]?.length);

    // Check if each tab has data
    const hasExamData = ranking.exam && Object.keys(ranking.exam).length > 0;
    const hasGeneralData = ranking.general && Object.keys(ranking.general).length > 0;

    if (!hasExamData && !hasGeneralData) return null;

    return (
        <GlassCard style={{
            padding: '9px',
            marginTop: '0px',
            marginBottom: '70px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px'
                }}>
                    <Trophy size={20} style={{ color: 'var(--brand-color)' }} />
                    <h2 style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        color: 'var(--text-main)',
                        margin: 0
                    }}>
                        Weekly Rankings
                    </h2>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-sub)',
                        fontWeight: 500,
                        marginLeft: 'auto'
                    }}>
                        毎朝8時更新
                    </span>
                </div>
                <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-sub)',
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.5
                }}>
                    直近7日間の頑張りをランキング！<br />各部門3位以内に入ると、バッジがもらえます✨
                </p>
            </div>

            {/* Tab Switcher */}
            <div style={{
                display: 'flex',
                gap: '0',
                background: 'rgba(0,0,0,0.03)',
                margin: '16px 20px',
                borderRadius: '12px',
                padding: '4px',
                position: 'relative'
            }}>
                <button
                    onClick={() => setActiveTab('exam')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'exam' ? '#fff' : 'transparent',
                        color: activeTab === 'exam' ? 'var(--brand-color)' : 'var(--text-sub)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: activeTab === 'exam' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        opacity: hasExamData ? 1 : 0.4
                    }}
                    disabled={!hasExamData}
                >
                    🎓 受験生の部
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'general' ? '#fff' : 'transparent',
                        color: activeTab === 'general' ? 'var(--brand-color)' : 'var(--text-sub)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: activeTab === 'general' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        opacity: hasGeneralData ? 1 : 0.4
                    }}
                    disabled={!hasGeneralData}
                >
                    📚 一般の部
                </button>
            </div>

            {/* Badge Categories */}
            <div style={{ padding: '0 20px 20px' }}>
                {order.map((type, idx) => {
                    const winners = groups[type];
                    if (!winners || winners.length === 0) return null;
                    winners.sort((a, b) => a.rank - b.rank);
                    const config = BADGE_CONFIG[type];

                    return (
                        <div key={type} style={{
                            marginBottom: idx < order.length - 1 ? '16px' : '0'
                        }}>
                            {/* Category Card */}
                            <div style={{
                                padding: '14px 16px',
                                background: 'rgba(255,255,255,0.7)',
                                borderRadius: '16px',
                                border: '1px solid rgba(0,0,0,0.04)'
                            }}>
                                {/* Header row: Icon + Title/Subtitle */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }}>
                                    {/* Icon */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #fff5eb 0%, #ffede0 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--brand-color)',
                                        flexShrink: 0
                                    }}>
                                        {config.icon}
                                    </div>

                                    {/* Title + Subtitle */}
                                    <div>
                                        <div style={{
                                            fontWeight: 800,
                                            fontSize: '1rem',
                                            color: 'var(--text-main)',
                                            marginBottom: '2px'
                                        }}>
                                            {config.label}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-sub)',
                                            fontWeight: 500
                                        }}>
                                            {config.desc}
                                        </div>
                                    </div>
                                </div>

                                {/* Winners - full width, shifted left */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    paddingLeft: '52px'
                                }}>
                                    {winners.slice(0, 3).map((w) => (
                                        <div key={w.name} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ fontSize: '1rem' }}>
                                                {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}
                                            </span>
                                            <span style={{
                                                fontWeight: 700,
                                                fontSize: '1rem',
                                                color: w.rank === 1 ? 'var(--brand-color)' : 'var(--text-main)'
                                            }}>
                                                {w.name} さん
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
};
