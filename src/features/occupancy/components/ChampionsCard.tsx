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
        <GlassCard style={{ padding: '20px', marginTop: '0px', marginBottom: '70px' }}>
            {/* Header */}
            <div style={{
                padding: '10px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                    <Trophy size={20} style={{ color: 'var(--brand-color)' }} />
                    <h2 style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        color: 'var(--brand-color)',
                        letterSpacing: '0.02em'
                    }}>
                        WEEKLY RANKINGS
                    </h2>
                </div>

                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                    <button
                        onClick={() => setActiveTab('exam')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            background: activeTab === 'exam' ? 'var(--brand-color)' : 'rgba(0,0,0,0.05)',
                            color: activeTab === 'exam' ? '#fff' : 'var(--text-sub)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: hasExamData ? 1 : 0.5
                        }}
                        disabled={!hasExamData}
                    >
                        受験生部門
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            background: activeTab === 'general' ? 'var(--brand-color)' : 'rgba(0,0,0,0.05)',
                            color: activeTab === 'general' ? '#fff' : 'var(--text-sub)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: hasGeneralData ? 1 : 0.5
                        }}
                        disabled={!hasGeneralData}
                    >
                        非受験生部門
                    </button>
                </div>

                <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-sub)',
                    fontWeight: 500
                }}>
                    毎朝8時更新！直近7日間のランキング
                </div>
            </div>

            {/* List */}
            <div style={{ padding: '0' }}>
                {order.map(type => {
                    const winners = groups[type];
                    if (!winners || winners.length === 0) return null;
                    winners.sort((a, b) => a.rank - b.rank);
                    const config = BADGE_CONFIG[type];

                    return (
                        <div key={type} style={{
                            padding: '20px',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
                        }}>
                            {/* Category Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                                <div style={{
                                    minWidth: '48px',
                                    height: '48px',
                                    borderRadius: '16px',
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--brand-color)',
                                    boxShadow: 'var(--shadow-badge)'
                                }}>
                                    {config.icon}
                                </div>
                                <div style={{ paddingTop: '2px' }}>
                                    <div style={{
                                        fontWeight: 900,
                                        fontSize: '1rem',
                                        color: 'var(--text-main)',
                                        marginBottom: '4px',
                                        lineHeight: 1.4
                                    }}>
                                        {config.label}
                                    </div>
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-sub)',
                                        fontWeight: 500,
                                        lineHeight: 1.6
                                    }}>
                                        {config.desc}
                                    </div>
                                </div>
                            </div>

                            {/* Winners */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '64px' }}>
                                {winners.slice(0, 3).map((w) => (
                                    <div key={w.name} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        {/* Rank Badge */}
                                        <div style={{
                                            minWidth: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: w.rank === 1 ? 'var(--brand-color)' :
                                                w.rank === 2 ? 'rgba(0, 0, 0, 0.08)' :
                                                    'rgba(0, 0, 0, 0.05)',
                                            color: w.rank === 1 ? '#fff' : 'var(--text-main)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 700
                                        }}>
                                            {w.rank}
                                        </div>
                                        <span style={{
                                            fontWeight: 700,
                                            fontSize: '1.2rem',
                                            color: w.rank === 1 ? 'var(--brand-color)' : 'var(--text-main)'
                                        }}>
                                            {w.name} さん
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
};
