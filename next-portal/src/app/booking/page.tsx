'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/lib/liff';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { FormGroup } from '@/components/FormGroup';

export default function BookingPage() {
    const router = useRouter();
    const { profile, isLoggedIn, isLoading: isLiffLoading } = useLiff();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dateOptions, setDateOptions] = useState<{ value: string; label: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        meetingType: '面談',
        date: '',
        arrivalTime: 'T14:00:00',
        leaveTime: 'T15:00:00',
    });

    // Initialize Date Options
    useEffect(() => {
        const options = [];
        const today = new Date();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

        for (let i = 0; i < 14; i++) { // Show 2 weeks
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
            const dayOfWeek = d.getDay();

            // Optional: Skip Sundays if needed (based on original logic, it showed all 7 days)
            // if (dayOfWeek === 0) continue; 

            const yyyy = d.getFullYear();
            const mm = ('0' + (d.getMonth() + 1)).slice(-2);
            const dd = ('0' + d.getDate()).slice(-2);
            const w = weekdays[dayOfWeek];

            options.push({
                value: `${yyyy}-${mm}-${dd}`,
                label: `${mm}/${dd}(${w})`,
            });
        }
        setDateOptions(options);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
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
            const res = await fetch('/api/reserveMeeting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.userId,
                    ...formData,
                }),
            });

            const data = await res.json();

            if (data.status === 'ok') {
                alert('予約が完了しました！');
                router.push('/');
            } else {
                throw new Error(data.message || '予約に失敗しました');
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLiffLoading) {
        return <div className="loading-overlay visible"><div className="loading-spinner"></div></div>;
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
                        <select
                            name="meetingType"
                            className="form-input"
                            value={formData.meetingType}
                            onChange={handleChange}
                            required
                        >
                            <option value="面談">面談</option>
                            <option value="特訓">特訓</option>
                            <option value="強制通塾">強制通塾</option>
                        </select>
                    </FormGroup>

                    <FormGroup label="日付">
                        <select
                            name="date"
                            className="form-input"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        >
                            <option value="">日付を選択...</option>
                            {dateOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </FormGroup>

                    <FormGroup label="来塾時間">
                        <select
                            name="arrivalTime"
                            className="form-input"
                            value={formData.arrivalTime}
                            onChange={handleChange}
                            required
                        >
                            <option value="T14:00:00">午前~15:00</option>
                            <option value="T15:00:00">15:00~16:00</option>
                            <option value="T16:00:00">16:00~17:00</option>
                            <option value="T17:00:00">17:00~18:00</option>
                            <option value="T18:00:00">18:00~19:00</option>
                            <option value="T19:00:00">18:00~19:00</option>
                            <option value="T20:00:00">19:00~20:00</option>
                            <option value="T21:00:00">20:00~21:00</option>
                            <option value="T22:00:00">21:00~22:00</option>
                        </select>
                    </FormGroup>

                    <FormGroup label="退塾時間">
                        <select
                            name="leaveTime"
                            className="form-input"
                            value={formData.leaveTime}
                            onChange={handleChange}
                            required
                        >
                            <option value="T15:00:00">午前~15:00</option>
                            <option value="T16:00:00">15:00~16:00</option>
                            <option value="T17:00:00">16:00~17:00</option>
                            <option value="T18:00:00">17:00~18:00</option>
                            <option value="T19:00:00">18:00~19:00</option>
                            <option value="T20:00:00">19:00~20:00</option>
                            <option value="T21:00:00">20:00~21:00</option>
                            <option value="T22:00:00">21:00~22:00</option>
                        </select>
                    </FormGroup>

                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? '送信中...' : '予約する'}
                    </Button>
                </form>

                <Link href="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    メニューに戻る
                </Link>
            </GlassCard>
        </div>
    );
}
