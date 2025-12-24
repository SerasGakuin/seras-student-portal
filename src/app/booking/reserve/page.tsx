'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/lib/liff';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { FormGroup } from '@/components/ui/FormGroup';
import { ButtonGroup } from '@/features/booking/components/ButtonGroup';
import { BackLink } from '@/components/ui/BackLink';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { DateButtonSelect } from '@/features/booking/components/DateButtonSelect';
import { TimeRangeSlider } from '@/features/booking/components/TimeRangeSlider';
import { CONFIG } from '@/lib/config';
import { getDisplayName } from '@/lib/utils';
import { api } from '@/lib/api';
import { LoginRequired } from '@/components/ui/LoginRequired';
import { Unregistered } from '@/components/ui/Unregistered';
import { ApiResponse, BookingRequest } from '@/types';

import { PageHeader } from '@/components/ui/PageHeader';

export default function BookingPage() {
    const router = useRouter();
    const { profile, student, isLoggedIn, isLoading: isLiffLoading } = useLiff();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form State
    const [formData, setFormData] = useState<Omit<BookingRequest, 'userId'>>({
        meetingType: '面談',
        date: getTomorrowDateString(),
        arrivalTime: 'T18:00:00',
        leaveTime: 'T22:00:00',
    });

    const handleFieldChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user changes value
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.userId) return;

        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.date) {
            newErrors.date = '日付を選択してください。';
        }
        if (formData.arrivalTime >= formData.leaveTime) {
            newErrors.arrivalTime = '退塾時間は来塾時間より後に設定してください。';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            // Use api.booking.reserveMeeting()
            const response = await api.booking.reserveMeeting({
                userId: profile.userId,
                meetingType: formData.meetingType,
                date: formData.date,
                arrivalTime: formData.arrivalTime,
                leaveTime: formData.leaveTime,
            });

            // api client throws on error, so if we are here, success.
            // The `response` from `api.booking.reserveMeeting` is the data itself (e.g., event details).
            // The original code checked `data.status === 'ok'`.
            // With the api client, if no error is thrown, it's a success.

            const name = getDisplayName(student, profile);
            const start = formData.arrivalTime.replace('T', '').slice(0, 5);
            const end = formData.leaveTime.replace('T', '').slice(0, 5);
            alert(`${name}さんの${formData.meetingType}は、${formData.date} ${start}-${end}で予約完了しました！`);
            router.push('/booking');

        } catch (error: unknown) {
            console.error('Booking failed:', error);
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
        return <LoginRequired />;
    }

    if (!student && !isLiffLoading) {
        return <Unregistered />;
    }

    return (
        <div className="container">
            <PageHeader
                title={<><span className="brand">Seras学院</span> 面談予約</>}
                subtitle="ご希望の日時を選択してください"
            />

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

                    <FormGroup label="日付" error={errors.date}>
                        <DateButtonSelect
                            name="date"
                            value={formData.date}
                            onChange={(value) => handleFieldChange('date', value)}
                        />
                    </FormGroup>

                    <FormGroup label="時間" error={errors.arrivalTime}>
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
