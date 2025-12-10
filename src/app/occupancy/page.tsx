'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { OccupancyCard } from '@/features/occupancy/components/OccupancyCard';
import { PrincipalControlPanel } from '@/features/occupancy/components/PrincipalControlPanel';
import { GuideCard } from '@/features/occupancy/components/GuideCard';
import styles from './page.module.css';
import { BackLink } from '@/components/ui/BackLink';
import { OccupancyData } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLiff } from '@/lib/liff';

// Configuration
const CAPACITIES = {
    building1: 25,
    building2: 12
};
const UPDATE_INTERVAL = 5000;

// Stable header title to prevent re-renders
const PAGE_TITLE = (
    <>
        <span className="brand">Seras学院</span> 自習室の在室人数
    </>
);

export default function OccupancyPage() {
    const [data, setData] = useState<OccupancyData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [updatingBuildingId, setUpdatingBuildingId] = useState<'1' | '2' | null>(null);

    // Get user details to pass to API for role-based data fetching
    const { student, profile, isLoading: isAuthLoading } = useLiff();
    const isPrincipal = student?.status === '教室長';

    useEffect(() => {
        const fetchOccupancy = async () => {
            try {
                // Pass lineId to API to enable role-based data fetching (e.g. Member List)
                const data = await api.occupancy.get(student?.lineId);
                setData(data);
                setError(null);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('データの取得に失敗しました');
            }
        };

        if (!isAuthLoading) {
            fetchOccupancy();
            const interval = setInterval(fetchOccupancy, UPDATE_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [student?.lineId, isAuthLoading]);

    const handleToggle = async (buildingId: '1' | '2', currentIsOpen: boolean) => {
        if (!isPrincipal || !profile?.displayName) return;

        const buildingName = buildingId === '1' ? '本館' : '2号館';
        if (!confirm(`${buildingName}を${currentIsOpen ? '閉めます' : '開けます'}か？`)) return;

        setUpdatingBuildingId(buildingId);

        // Granular Loading:
        // We do NOT set data to null. We keep existing data visible for other cards.
        // We rely on updatingBuildingId to force skeleton state ONLY on the target card.
        // The ControlPanel will also disable interactions.

        try {
            await api.occupancy.setStatus(buildingId, !currentIsOpen, profile.displayName);
            // Re-fetch
            const newData = await api.occupancy.get(student?.lineId);
            setData(newData);
        } catch (e) {
            console.error('Failed to update status', e);
            alert('ステータスの更新に失敗しました');
            // Re-fetch to be safe
            const fallbackData = await api.occupancy.get(student?.lineId);
            setData(fallbackData);
        } finally {
            setUpdatingBuildingId(null);
        }
    };

    return (
        <div className="container">
            <PageHeader
                title={PAGE_TITLE}
                subtitle="リアルタイム更新中"
            />

            <main>
                {/* Principal Controls (Top Position) */}
                {isPrincipal && (
                    <PrincipalControlPanel
                        data={data}
                        updatingBuildingId={updatingBuildingId}
                        onToggle={handleToggle}
                    />
                )}

                {error && (
                    <div style={{ color: 'var(--status-high)', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
                        データの更新に失敗しました: {error}
                    </div>
                )}

                {/* Building 1 */}
                <OccupancyCard
                    title="本館"
                    data={data?.building1}
                    max={CAPACITIES.building1}
                    moleImage="/images/mogura_insert.png"
                    isLoading={updatingBuildingId === '1'}
                />

                {/* Building 2 */}
                <OccupancyCard
                    title="2号館"
                    data={data?.building2}
                    max={CAPACITIES.building2}
                    isLoading={updatingBuildingId === '2'}
                />

                <div className={styles.timestamp}>
                    {data ? `最終更新: ${new Date(data.timestamp).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit' })}` : 'データ読み込み中...'}
                </div>

                <div className={styles.sectionTitle}>GUIDE & RULES</div>

                <GuideCard moleImage="/images/mogura_insert_2.png" />

                <BackLink href="/">
                    ポータルに戻る
                </BackLink>
            </main>
        </div>
    );
}
