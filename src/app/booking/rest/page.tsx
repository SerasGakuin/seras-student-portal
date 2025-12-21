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
import { api } from '@/lib/api';
import { LoginRequired } from '@/components/ui/LoginRequired';
import { Unregistered } from '@/components/ui/Unregistered';

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
            // The instruction uses student.lineId and selectedDate.
            // Assuming 'date' state variable from original code is now 'selectedDate' for the API call.
            // And student.lineId is preferred over profile.userId if student data is available.
            await api.booking.registerRestDay({
                userId: student?.lineId || profile.userId, // Use student.lineId if available, else profile.userId
                date: date, // Using the existing 'date' state variable
            });

            // Success handling (original behavior with alert)
            const name = getDisplayName(student, profile);
            alert(`${name}さんの休む日は、${date}で予約完了しました！\n ひとこと、お休みする理由をLINEのチャットで教えてください：`);
            router.push('/booking');

            // Clear form
            // Assuming date is state variable, but if it was passed as arg, we might need to find the setter.
            // If date comes from 'const [date, setDate] = useState(...)', I need to find the setter name.
            // Looking at file content will confirm.

            // For now, just the alert and redirect is what was there.
        } catch (error) {
            console.error('Registration failed:', error);
            alert('登録に失敗しました。もう一度お試しください。');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLiffLoading) {
        return <LoadingOverlay />;
    }

    if (!isLoggedIn) {
        return <LoginRequired />;
    }

    if (!student && !isLiffLoading) {
        return <Unregistered />;
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
