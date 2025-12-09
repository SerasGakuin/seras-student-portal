'use client';

import { PortalCard } from '@/components/ui/PortalCard';
import { useLiff } from '@/lib/liff';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { BackLink } from '@/components/ui/BackLink';
import styles from '../page.module.css';

import { PageHeader } from '@/components/ui/PageHeader';

export default function BookingMenu() {
    const { isLoading } = useLiff();

    if (isLoading) {
        return <LoadingOverlay />;
    }

    return (
        <div className="container">
            <PageHeader
                title={<><span className="brand">Seras学院</span> 予約システム</>}
                subtitle="ご希望の手続きを選択してください"
            />

            <main>
                <div className={styles.grid}>
                    <PortalCard
                        href="/booking/reserve"
                        title="面談を予約する"
                        description="面談の日時を選択して予約します"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        }
                    />

                    <PortalCard
                        href="/booking/rest"
                        title="休む日を登録する"
                        description="欠席する日を登録します"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4 4V8z"></path>
                                <line x1="6" y1="1" x2="6" y2="4"></line>
                                <line x1="10" y1="1" x2="10" y2="4"></line>
                                <line x1="14" y1="1" x2="14" y2="4"></line>
                            </svg>
                        }
                    />
                </div>

                <BackLink href="/">
                    ポータルに戻る
                </BackLink>
            </main>
        </div>
    );
}
