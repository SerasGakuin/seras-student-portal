// src/app/exam-result-form/components/PastExamResultForm.tsx

'use client';

import { usePastExamForm } from '@/hooks/usePastExamForm';

export function PastExamResultForm() {
    const {
        selectedUniversity,
        selectedSubject,
        selectedYear,
        selectedTerm,
        totalScore,
        setTotalScore,
        memo,
        setMemo,
        universityQuery,
        universitySuggestions,
        memoByteLength,
        isMemoOverLimit,
        memoMaxBytes,
        isFormReady,
        isSubmitting,
        submitMessage,
        subjects,
        years,
        terms,
        handleSelectUniversity,
        handleUniversityQueryChange,
        handleSelectSubject,
        handleSelectYear,
        handleSelectTerm,
        handleSubmit,
    } = usePastExamForm();

    return (
        <section>
            <h2>成績を追加する</h2>

            {/* 1. 大学選択（IMEサジェスト） */}
            <div>
                <label>大学・学部・学科</label>
                <input
                    type="text"
                    placeholder="大学名を入力してください"
                    value={selectedUniversity ? selectedUniversity.fullName : universityQuery}
                    onChange={e => handleUniversityQueryChange(e.target.value)}
                />
                {/* サジェスト候補 */}
                {universitySuggestions.length > 0 && !selectedUniversity && (
                    <ul>
                        {universitySuggestions.map(u => (
                            <li
                                key={u.id}
                                onClick={() => handleSelectUniversity(u)}
                            >
                                {u.fullName}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 2. 科目選択（大学選択後に解放） */}
            <div>
                <label>科目</label>
                <select
                    disabled={selectedUniversity === null}
                    value={selectedSubject?.id ?? ''}
                    onChange={e => handleSelectSubject(Number(e.target.value))}
                >
                    <option value="">選択してください</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            {/* 3. 年度選択（科目選択後に解放） */}
            <div>
                <label>年度</label>
                <select
                    disabled={selectedSubject === null}
                    value={selectedYear?.year ?? ''}
                    onChange={e => handleSelectYear(Number(e.target.value))}
                >
                    <option value="">選択してください</option>
                    {years.map(y => (
                        <option key={y.year} value={y.year}>{y.year}年度</option>
                    ))}
                </select>
            </div>

            {/* 4. 試験回選択（年度選択後に解放） */}
            <div>
                <label>試験回</label>
                <select
                    disabled={selectedYear === null}
                    value={selectedTerm?.examId ?? ''}
                    onChange={e => handleSelectTerm(Number(e.target.value))}
                >
                    <option value="">選択してください</option>
                    {terms.map(t => (
                        <option key={t.examId} value={t.examId}>{t.termName}</option>
                    ))}
                </select>
            </div>

            {/* 5. 得点入力（試験回選択後に解放） */}
            <div>
                <label>得点</label>
                <input
                    type="number"
                    placeholder="得点を入力（省略可）"
                    disabled={selectedTerm === null}
                    value={totalScore}
                    onChange={e => setTotalScore(e.target.value)}
                />
            </div>

            {/* 6. メモ入力（試験回選択後に解放） */}
            <div>
                <label>メモ</label>
                <textarea
                    placeholder={`メモを入力（省略可・${memoMaxBytes}バイトまで）`}
                    disabled={selectedTerm === null}
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                />
                <span>
                    {memoByteLength} / {memoMaxBytes} バイト
                    {isMemoOverLimit && ' ※上限を超えています'}
                </span>
            </div>

            {/* 登録ボタン */}
            <button
                onClick={handleSubmit}
                disabled={!isFormReady || isSubmitting}
            >
                {isSubmitting ? '登録中...' : '追加する'}
            </button>

            {/* 完了・エラーメッセージ */}
            {submitMessage && <p>{submitMessage}</p>}
        </section>
    );
}