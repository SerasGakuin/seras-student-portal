'use client';

import { useState } from 'react';

/** モックデータの型 */
interface PastExamResultItem {
    recordId: number;
    universityName: string;
    subjectName: string;
    year: number;
    termName: string;
    totalScore: number | null;
    memo: string | null;
    regUtcMs: number;
}

/** モックデータ */
const MOCK_RESULTS: PastExamResultItem[] = [
    {
        recordId: 1,
        universityName: '大阪大学',
        subjectName: '数学',
        year: 2024,
        termName: '前期',
        totalScore: 85,
        memo: '大問3が難しかった',
        regUtcMs: Date.now() - 1000 * 60 * 60 * 12, // 12時間前
    },
    {
        recordId: 2,
        universityName: '京都大学',
        subjectName: '英語',
        year: 2023,
        termName: '前期',
        totalScore: 72,
        memo: null,
        regUtcMs: Date.now() - 1000 * 60 * 60 * 48, // 48時間前
    },
];

/** 登録から24時間以内かどうかを判定 */
function isDeletable(regUtcMs: number): boolean {
    return Date.now() - regUtcMs < 24 * 60 * 60 * 1000;
}

export function PastExamResultList() {
    const [results, setResults] = useState<PastExamResultItem[]>(MOCK_RESULTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    // 検索フィルタ
    const filtered = results.filter(r =>
        [r.universityName, r.subjectName, r.termName, r.memo]
            .some(v => v?.includes(searchQuery))
    );

    // 削除確認ポップアップを表示
    const handleDeleteClick = (recordId: number) => {
        setConfirmId(recordId);
    };

    // 削除実行
    const handleDeleteConfirm = async () => {
        if (confirmId === null) return;
        setDeletingId(confirmId);
        setConfirmId(null);
        try {
            // TODO: APIリクエスト
            await new Promise(resolve => setTimeout(resolve, 500)); // モック
            setResults(prev => prev.filter(r => r.recordId !== confirmId));
        } catch {
            alert('削除に失敗しました。');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section>
            {/* 検索バー */}
            <input
                type="text"
                placeholder="大学名・科目などで検索"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />

            {/* 一覧 */}
            {filtered.length === 0 ? (
                <p>データがありません。</p>
            ) : (
                <ul>
                    {filtered.map(result => (
                        <li key={result.recordId}>
                            <span>{result.universityName}</span>
                            <span>{result.subjectName}</span>
                            <span>{result.year}年度</span>
                            <span>{result.termName}</span>
                            <span>{result.totalScore ?? '-'}点</span>
                            <span>{result.memo ?? ''}</span>
                            {isDeletable(result.regUtcMs) && (
                                <button
                                    onClick={() => handleDeleteClick(result.recordId)}
                                    disabled={deletingId === result.recordId}
                                    aria-label="削除"
                                >
                                    🗑
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* 削除確認ポップアップ */}
            {confirmId !== null && (
                <div role="dialog" aria-modal="true">
                    <p>本当に削除しますか？</p>
                    <button onClick={handleDeleteConfirm}>削除する</button>
                    <button onClick={() => setConfirmId(null)}>キャンセル</button>
                </div>
            )}
        </section>
    );
}