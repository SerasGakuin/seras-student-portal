'use client';

import { useState } from 'react';

/** 大学の選択肢 */
interface UniversityOption {
    id: number;
    fullName: string;
}

/** 科目の選択肢 */
interface SubjectOption {
    id: number;
    name: string;
}

/** 年度の選択肢 */
interface YearOption {
    year: number;
}

/** 試験回の選択肢 */
interface TermOption {
    examId: number;
    termName: string;
}

/** モックデータ */
const MOCK_UNIVERSITIES: UniversityOption[] = [
    { id: 1, fullName: '大阪大学 理学部 数学科' },
    { id: 2, fullName: '京都大学 工学部 情報学科' },
    { id: 3, fullName: '大阪公立大学 理学部 物理学科' },
];

const MOCK_SUBJECTS: SubjectOption[] = [
    { id: 1, name: '数学' },
    { id: 2, name: '英語' },
    { id: 3, name: '物理' },
];

const MOCK_YEARS: YearOption[] = [
    { year: 2024 },
    { year: 2023 },
    { year: 2022 },
];

const MOCK_TERMS: TermOption[] = [
    { examId: 1, termName: '前期' },
    { examId: 2, termName: '後期' },
];

/** メモのバイト数を計算する */
function getByteLength(str: string): number {
    return new TextEncoder().encode(str).byteLength;
}

const MEMO_MAX_BYTES = 256;

export function PastExamResultForm() {
    const [selectedUniversity, setSelectedUniversity] = useState<UniversityOption | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null);
    const [selectedYear, setSelectedYear] = useState<YearOption | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<TermOption | null>(null);
    const [totalScore, setTotalScore] = useState<string>('');
    const [memo, setMemo] = useState<string>('');
    const [universityQuery, setUniversityQuery] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);

    /** 大学のサジェスト候補 */
    const universitySuggestions = universityQuery.length > 0
        ? MOCK_UNIVERSITIES.filter(u => u.fullName.includes(universityQuery))
        : [];

    /** メモのバイト数 */
    const memoByteLength = getByteLength(memo);
    const isMemoOverLimit = memoByteLength > MEMO_MAX_BYTES;

    /** フォームがすべて入力済みかどうか */
    const isFormReady =
        selectedUniversity !== null &&
        selectedSubject !== null &&
        selectedYear !== null &&
        selectedTerm !== null &&
        !isMemoOverLimit;

    /** フォームをリセットする */
    const resetForm = () => {
        setSelectedUniversity(null);
        setSelectedSubject(null);
        setSelectedYear(null);
        setSelectedTerm(null);
        setTotalScore('');
        setMemo('');
        setUniversityQuery('');
    };

    /** 登録ボタン押下 */
    const handleSubmit = async () => {
        if (!isFormReady) return;
        setIsSubmitting(true);
        setSubmitMessage(null);
        try {
            // TODO: APIリクエスト
            await new Promise(resolve => setTimeout(resolve, 500)); // モック
            setSubmitMessage('登録しました！');
            resetForm();
        } catch {
            setSubmitMessage('登録に失敗しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    onChange={e => {
                        setUniversityQuery(e.target.value);
                        setSelectedUniversity(null);
                        // 大学が変わったら以降をリセット
                        setSelectedSubject(null);
                        setSelectedYear(null);
                        setSelectedTerm(null);
                    }}
                />
                {/* サジェスト候補 */}
                {universitySuggestions.length > 0 && !selectedUniversity && (
                    <ul>
                        {universitySuggestions.map(u => (
                            <li
                                key={u.id}
                                onClick={() => {
                                    setSelectedUniversity(u);
                                    setUniversityQuery('');
                                }}
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
                    onChange={e => {
                        const found = MOCK_SUBJECTS.find(s => s.id === Number(e.target.value));
                        setSelectedSubject(found ?? null);
                        // 科目が変わったら以降をリセット
                        setSelectedYear(null);
                        setSelectedTerm(null);
                    }}
                >
                    <option value="">選択してください</option>
                    {MOCK_SUBJECTS.map(s => (
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
                    onChange={e => {
                        const found = MOCK_YEARS.find(y => y.year === Number(e.target.value));
                        setSelectedYear(found ?? null);
                        // 年度が変わったら以降をリセット
                        setSelectedTerm(null);
                    }}
                >
                    <option value="">選択してください</option>
                    {MOCK_YEARS.map(y => (
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
                    onChange={e => {
                        const found = MOCK_TERMS.find(t => t.examId === Number(e.target.value));
                        setSelectedTerm(found ?? null);
                    }}
                >
                    <option value="">選択してください</option>
                    {MOCK_TERMS.map(t => (
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

            {/* 6. メモ入力 */}
            <div>
                <label>メモ</label>
                <textarea
                    placeholder="メモを入力（省略可・256バイトまで）"
                    disabled={selectedTerm === null}
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                />
                <span>
                    {memoByteLength} / {MEMO_MAX_BYTES} バイト
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