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

    /**
     * 大学名の入力欄にテキストが入力されているかどうかを返します。
     * サジェスト候補エリアの表示制御に使用します。
     */
    const isUniversityQueryActive = universityQuery.length > 0 && !selectedUniversity;

    return (
        <section>
            <h2>成績を追加する</h2>

            {/* ===================== */}
            {/* 1. 大学・学部・学科の選択 */}
            {/* テキスト入力によるIMEサジェスト方式。 */}
            {/* 入力内容に前方一致する候補を一覧表示し、クリックで選択する。 */}
            {/* ===================== */}
            <div>
                <label>大学・学部・学科</label>
                <input
                    type="text"
                    placeholder="大学名を入力してください"
                    value={selectedUniversity ? selectedUniversity.fullName : universityQuery}
                    onChange={e => handleUniversityQueryChange(e.target.value)}
                />

                {/* サジェスト候補エリア。入力中かつ大学未選択の場合に表示する。 */}
                {isUniversityQueryActive && (
                    <ul>
                        {universitySuggestions.length > 0 ? (
                            // 前方一致する候補がある場合：候補を一覧表示する
                            universitySuggestions.map(u => (
                                <li
                                    key={u.id}
                                    onClick={() => handleSelectUniversity(u)}
                                >
                                    {u.fullName}
                                </li>
                            ))
                        ) : (
                            // 前方一致する候補がない場合：押せない灰色の案内を表示する
                            <li
                                style={{ color: 'gray', cursor: 'default', pointerEvents: 'none' }}
                                aria-disabled="true"
                            >
                                前方一致する候補がありません
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* ===================== */}
            {/* 2. 科目の選択 */}
            {/* 大学を選択するまで操作できない。 */}
            {/* ===================== */}
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

            {/* ===================== */}
            {/* 3. 年度の選択 */}
            {/* 科目を選択するまで操作できない。 */}
            {/* ===================== */}
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

            {/* ===================== */}
            {/* 4. 試験回の選択 */}
            {/* 年度を選択するまで操作できない。 */}
            {/* ===================== */}
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

            {/* ===================== */}
            {/* 5. 得点の入力 */}
            {/* 省略可能。試験回を選択するまで操作できない。 */}
            {/* ===================== */}
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

            {/* ===================== */}
            {/* 6. メモの入力 */}
            {/* 省略可能。256バイトまで入力できる。試験回を選択するまで操作できない。 */}
            {/* ===================== */}
            <div>
                <label>メモ</label>
                <textarea
                    placeholder={`メモを入力（省略可・${memoMaxBytes}バイトまで）`}
                    disabled={selectedTerm === null}
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                />
                {/* バイト数カウンター。上限を超えた場合は警告を表示する。 */}
                <span>
                    {memoByteLength} / {memoMaxBytes} バイト
                    {isMemoOverLimit && ' ※上限を超えています'}
                </span>
            </div>

            {/* ===================== */}
            {/* 登録ボタン */}
            {/* フォームが入力済みでない場合、または登録処理中は操作できない。 */}
            {/* ===================== */}
            <button
                onClick={handleSubmit}
                disabled={!isFormReady || isSubmitting}
            >
                {isSubmitting ? '登録中...' : '追加する'}
            </button>

            {/* 登録結果メッセージ。成功・失敗に応じたメッセージを表示する。 */}
            {submitMessage && <p>{submitMessage}</p>}
        </section>
    );
}