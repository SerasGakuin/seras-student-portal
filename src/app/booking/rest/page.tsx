'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/lib/liff';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { FormGroup } from '@/components/ui/FormGroup';
import { FormInput } from '@/components/ui/FormInput';
import { BackLink } from '@/components/ui/BackLink';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { getDisplayName } from '@/lib/utils';

import { PageHeader } from '@/components/ui/PageHeader';

export default function RestPage() {
    const router = useRouter();
    const { profile, student, isLoggedIn, isLoading: isLiffLoading } = useLiff();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [date, setDate] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.userId) return;

        if (!date) {
            alert('日付を選択してください。');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/registerRestDay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.userId,
                    date: date,
                }),
            });

            const data = await res.json();

            if (data.status === 'ok') {
                const name = getDisplayName(student, profile);
                alert(`${name}さんの休む日は、${date}で予約完了しました！`);
                router.push('/booking');
            } else {
                throw new Error(data.message || '登録に失敗しました');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLiffLoading) {
        return <LoadingOverlay />;
    }

    if (!isLoggedIn) {
        return <div className="container"><p>ログインが必要です。</p></div>;
    }

    return (
        <div className="container">
            <PageHeader
                title={<><span className="brand">Seras学院</span> 休み登録</>}
                subtitle="欠席する日を登録してください"
            />

            <GlassCard className="animate-slide-up" style={{ textAlign: 'left' }}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="休む日">
                        <FormInput
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </FormGroup>

                    <Button type="submit" variant="gradient-teal" disabled={isSubmitting}>
                        {isSubmitting ? '送信中...' : '登録する'}
                    </Button>
                </form>

                <BackLink href="/booking">
                    メニューに戻る
                </BackLink>
            </GlassCard>
        </div>
    );
}
