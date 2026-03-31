'use client';

import { useLiff } from '@/lib/liff';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { BackLink } from '@/components/ui/BackLink';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoginRequired } from '@/components/ui/LoginRequired';
import { PastExamResultList } from '@/components/ui/PastExamResultList';
import { PastExamResultForm } from '@/components/ui/PastExamResultForm';

export default function PastExamResultsPage() {
    const { isLoading, student } = useLiff();

    if (isLoading) {
        return <LoadingOverlay />;
    }

    if (!student) {
        return <LoginRequired />;
    }

    return (
        <div className="container">
            <PageHeader
                title={<><span className="brand">Seras学院</span> 過去問成績</>}
                subtitle="自分の過去問の成績を記録・管理できます"
            />
            <main>
                <PastExamResultList />
                <PastExamResultForm />
                <BackLink href="/">
                    ポータルに戻る
                </BackLink>
            </main>
        </div>
    );
}