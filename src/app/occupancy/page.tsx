'use client';

import { useState, useEffect } from 'react';
import { OccupancyCard } from '@/features/occupancy/components/OccupancyCard';
import { GuideCard } from '@/features/occupancy/components/GuideCard';
import styles from './page.module.css';
import { BackLink } from '@/components/ui/BackLink';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

// Configuration
const API_URL = "/api/occupancy";
const CAPACITIES = {
    building1: 25,
    building2: 12
};
const UPDATE_INTERVAL = 5000;

interface OccupancyData {
    building1: number;
    building2: number;
    timestamp: string;
}



import { PageHeader } from '@/components/ui/PageHeader';

export default function OccupancyPage() {
    const [data, setData] = useState<OccupancyData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchOccupancy = async () => {
        try {
            const response = await fetch(API_URL, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`Network Error: ${response.status}`);
            }
            const jsonData = await response.json();
            setData(jsonData);
            setError(null);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('データの取得に失敗しました');
        }
    };

    useEffect(() => {
        fetchOccupancy();
        const interval = setInterval(fetchOccupancy, UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container">
            <PageHeader
                title={<><span className="brand">Seras学院</span> 自習室の在室人数</>}
                subtitle="リアルタイム更新中"
            />

            <main>
                {error && (
                    <div style={{ color: 'var(--status-high)', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
                        データの更新に失敗しました: {error}
                    </div>
                )}

                <OccupancyCard
                    title="本館"
                    count={data?.building1}
                    max={CAPACITIES.building1}
                    moleImage="/images/mogura_insert.png"
                />

                <OccupancyCard
                    title="2号館"
                    count={data?.building2}
                    max={CAPACITIES.building2}
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
