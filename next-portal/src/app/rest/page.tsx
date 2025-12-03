'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/lib/liff';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { FormGroup } from '@/components/FormGroup';

export default function RestPage() {
    const router = useRouter();
    const { profile, isLoggedIn, isLoading: isLiffLoading } = useLiff();
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
                alert('休み登録が完了しました！');
                router.push('/');
            } else {
                throw new Error(data.message || '登録に失敗しました');
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
                <h1><span className="brand">Seras学院</span> 休み登録</h1>
            </header>

            <GlassCard className="animate-slide-up" style={{ textAlign: 'left' }}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="休む日">
                        <input
                            type="date"
                            className="form-input"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </FormGroup>

                    <Button type="submit" variant="gradient-teal" disabled={isSubmitting}>
                        {isSubmitting ? '送信中...' : '登録する'}
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
