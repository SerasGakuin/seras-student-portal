// src/app/exam-result-form/components/PastExamResultList.tsx

'use client';

import { usePastExamResults } from '@/hooks/usePastExamResults';

export function PastExamResultList() {
    const {
        filteredResults,
        deletableMap,
        searchQuery,
        setSearchQuery,
        deletingId,
        confirmId,
        handleDeleteClick,
        handleDeleteCancel,
        handleDeleteConfirm,
    } = usePastExamResults();

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
            {filteredResults.length === 0 ? (
                <p>データがありません。</p>
            ) : (
                <ul>
                    {filteredResults.map(result => (
                        <li key={result.recordId}>
                            <span>{result.universityName}</span>
                            <span>{result.subjectName}</span>
                            <span>{result.year}年度</span>
                            <span>{result.termName}</span>
                            <span>{result.totalScore ?? '-'}点</span>
                            <span>{result.memo ?? ''}</span>
                            {deletableMap.get(result.recordId) && (
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
                    <button onClick={handleDeleteCancel}>キャンセル</button>
                </div>
            )}
        </section>
    );
}