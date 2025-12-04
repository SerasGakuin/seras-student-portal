'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/lib/liff';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { FormGroup } from '@/components/FormGroup';
import { ButtonGroup } from '@/components/ButtonGroup';
import { BackLink } from '@/components/BackLink';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { DateButtonSelect } from '@/components/DateButtonSelect';
import { TimeRangeSlider } from '@/components/TimeRangeSlider';
import { CONFIG } from '@/lib/config';
import { ApiResponse, BookingRequest } from '@/types';

export default function BookingPage() {
    const router = useRouter();
    const { profile, isLoggedIn, isLoading: isLiffLoading } = useLiff();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Omit<BookingRequest, 'userId'>>({
        meetingType: '面談',
        date: getTomorrowDateString(),
        arrivalTime: 'T18:00:00',
        leaveTime: 'T22:00:00',
    });

    const handleFieldChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.userId) return;

        // Validation
        if (!formData.date) {
            alert('日付を選択してください。');
            return;
        }
        if (formData.arrivalTime >= formData.leaveTime) {
            alert('退塾時間は来塾時間より後に設定してください。');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(CONFIG.API.RESERVE_MEETING, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.userId,
                    ...formData,
                } as BookingRequest),
            });

            const data: ApiResponse = await res.json();

            if (data.status === 'ok') {
                alert('予約が完了しました！');
                router.push('/booking');
            } else {
                throw new Error(data.message || '予約に失敗しました');
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
            <header>
                <h1><span className="brand">Seras学院</span> 面談予約</h1>
            </header>

            <GlassCard className="animate-slide-up" style={{ textAlign: 'left' }}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="面談タイプ">
                        <ButtonGroup
                            name="meetingType"
                            options={CONFIG.MEETING_TYPES}
                            value={formData.meetingType}
                            onChange={(value) => handleFieldChange('meetingType', value)}
                        />
                    </FormGroup>

                    <FormGroup label="日付">
                        <DateButtonSelect
                            name="date"
                            value={formData.date}
                            onChange={(value) => handleFieldChange('date', value)}
                        />
                    </FormGroup>

                    <FormGroup label="時間">
                        <TimeRangeSlider
                            startTime={formData.arrivalTime}
                            endTime={formData.leaveTime}
                            onChange={(start, end) => {
                                setFormData(prev => ({ ...prev, arrivalTime: start, leaveTime: end }));
                            }}
                        />
                    </FormGroup>

                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? '送信中...' : '予約する'}
                    </Button>
                </form>

                <BackLink href="/booking">
                    メニューに戻る
                </BackLink>
            </GlassCard>
        </div>
    );
}

// Helper function to get tomorrow's date string (YYYY-MM-DD)
function getTomorrowDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
