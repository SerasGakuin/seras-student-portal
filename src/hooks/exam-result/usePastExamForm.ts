// src/app/exam-result-form/hooks/usePastExamForm.ts

import { useState, useEffect } from 'react';

/** 大学の選択肢 */
export interface UniversityOption {
    id: number;
    fullName: string;
}

/** 科目の選択肢 */
export interface SubjectOption {
    id: number;
    name: string;
}

/** 年度の選択肢 */
export interface YearOption {
    year: number;
}

/** 試験回の選択肢 */
export interface TermOption {
    examId: number;
    termName: string;
}

/** メモの最大バイト数 */
const MEMO_MAX_BYTES = 256;

/**
 * メモのバイト数を計算します。
 * 日本語などのマルチバイト文字も正確にカウントします。
 * @param str 対象の文字列
 */
function getByteLength(str: string): number {
    return new TextEncoder().encode(str).byteLength;
}

// ============================================================
// データ取得関数群
// APIが実装され次第、ここをfetchに差し替えてください。
// ============================================================

/**
 * 大学一覧を取得します。
 * TODO: 実APIに差し替えてください。
 */
async function fetchUniversities(): Promise<UniversityOption[]> {
    // モックデータ
    return [
        { id: 1, fullName: '大阪大学 理学部 数学科' },
        { id: 2, fullName: '京都大学 工学部 情報学科' },
        { id: 3, fullName: '大阪公立大学 理学部 物理学科' },
    ];
}

/**
 * 指定した大学の科目一覧を取得します。
 * TODO: 実APIに差し替えてください。
 * @param univId 大学ID
 */
async function fetchSubjects(univId: number): Promise<SubjectOption[]> {
    // モックデータ（univIdは将来的にAPIに渡す）
    void univId;
    return [
        { id: 1, name: '数学' },
        { id: 2, name: '英語' },
        { id: 3, name: '物理' },
    ];
}

/**
 * 指定した大学・科目の年度一覧を取得します。
 * TODO: 実APIに差し替えてください。
 * @param univId 大学ID
 * @param subjectId 科目ID
 */
async function fetchYears(univId: number, subjectId: number): Promise<YearOption[]> {
    // モックデータ
    void univId; void subjectId;
    return [
        { year: 2024 },
        { year: 2023 },
        { year: 2022 },
    ];
}

/**
 * 指定した大学・科目・年度の試験回一覧を取得します。
 * TODO: 実APIに差し替えてください。
 * @param univId 大学ID
 * @param subjectId 科目ID
 * @param year 年度
 */
async function fetchTerms(univId: number, subjectId: number, year: number): Promise<TermOption[]> {
    // モックデータ
    void univId; void subjectId; void year;
    return [
        { examId: 1, termName: '前期' },
        { examId: 2, termName: '後期' },
    ];
}

/**
 * 成績を登録します。
 * TODO: 実APIに差し替えてください。
 */
async function submitResult(params: {
    examId: number;
    totalScore: number | null;
    memo: string | null;
}): Promise<void> {
    // モック：500ms待機して成功とする
    void params;
    await new Promise(resolve => setTimeout(resolve, 500));
}

// ============================================================
// フック本体
// ============================================================

/**
 * 過去問成績の追加フォームを管理するカスタムフックです。
 * 大学→科目→年度→試験回の順に選択を進める縛りを実装しています。
 */
export function usePastExamForm() {
    // 選択された大学
    const [selectedUniversity, setSelectedUniversity] = useState<UniversityOption | null>(null);
    // 選択された科目
    const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null);
    // 選択された年度
    const [selectedYear, setSelectedYear] = useState<YearOption | null>(null);
    // 選択された試験回
    const [selectedTerm, setSelectedTerm] = useState<TermOption | null>(null);
    // 得点入力値
    const [totalScore, setTotalScore] = useState<string>('');
    // メモ入力値
    const [memo, setMemo] = useState<string>('');
    // 大学検索クエリ
    const [universityQuery, setUniversityQuery] = useState<string>('');
    // 登録処理中フラグ
    const [isSubmitting, setIsSubmitting] = useState(false);
    // 登録結果メッセージ
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);

    // 各選択肢のデータ
    const [universities, setUniversities] = useState<UniversityOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [years, setYears] = useState<YearOption[]>([]);
    const [terms, setTerms] = useState<TermOption[]>([]);

    // 大学一覧を初回ロード時に取得する
    useEffect(() => {
        fetchUniversities().then(setUniversities);
    }, []);

    // 大学が選択されたら科目一覧を取得する
    useEffect(() => {
        if (!selectedUniversity) {
            setSubjects([]);
            return;
        }
        fetchSubjects(selectedUniversity.id).then(setSubjects);
    }, [selectedUniversity]);

    // 科目が選択されたら年度一覧を取得する
    useEffect(() => {
        if (!selectedUniversity || !selectedSubject) {
            setYears([]);
            return;
        }
        fetchYears(selectedUniversity.id, selectedSubject.id).then(setYears);
    }, [selectedUniversity, selectedSubject]);

    // 年度が選択されたら試験回一覧を取得する
    useEffect(() => {
        if (!selectedUniversity || !selectedSubject || !selectedYear) {
            setTerms([]);
            return;
        }
        fetchTerms(selectedUniversity.id, selectedSubject.id, selectedYear.year).then(setTerms);
    }, [selectedUniversity, selectedSubject, selectedYear]);

    /**
     * 大学のサジェスト候補を返します。
     * 検索クエリが空の場合は候補を表示しません。
     */
    const universitySuggestions = universityQuery.length > 0
        ? universities.filter(u => u.fullName.includes(universityQuery))
        : [];

    /** メモの現在のバイト数 */
    const memoByteLength = getByteLength(memo);

    /** メモが上限を超えているかどうか */
    const isMemoOverLimit = memoByteLength > MEMO_MAX_BYTES;

    /**
     * フォームがすべて入力済みかどうかを返します。
     * 得点・メモは省略可能です。
     */
    const isFormReady =
        selectedUniversity !== null &&
        selectedSubject !== null &&
        selectedYear !== null &&
        selectedTerm !== null &&
        !isMemoOverLimit;

    /**
     * フォームをリセットします。
     * 登録成功後に呼び出します。
     */
    const resetForm = () => {
        setSelectedUniversity(null);
        setSelectedSubject(null);
        setSelectedYear(null);
        setSelectedTerm(null);
        setTotalScore('');
        setMemo('');
        setUniversityQuery('');
        setSubmitMessage(null);
    };

    /**
     * 大学を選択します。
     * 大学が変わった場合は以降の選択をリセットします。
     */
    const handleSelectUniversity = (university: UniversityOption) => {
        setSelectedUniversity(university);
        setUniversityQuery('');
        setSelectedSubject(null);
        setSelectedYear(null);
        setSelectedTerm(null);
    };

    /**
     * 大学検索クエリを更新します。
     * クエリが変わった場合は大学の選択をリセットします。
     */
    const handleUniversityQueryChange = (query: string) => {
        setUniversityQuery(query);
        setSelectedUniversity(null);
        setSelectedSubject(null);
        setSelectedYear(null);
        setSelectedTerm(null);
    };

    /**
     * 科目を選択します。
     * 科目が変わった場合は以降の選択をリセットします。
     */
    const handleSelectSubject = (subjectId: number) => {
        const found = subjects.find(s => s.id === subjectId);
        setSelectedSubject(found ?? null);
        setSelectedYear(null);
        setSelectedTerm(null);
    };

    /**
     * 年度を選択します。
     * 年度が変わった場合は試験回の選択をリセットします。
     */
    const handleSelectYear = (year: number) => {
        const found = years.find(y => y.year === year);
        setSelectedYear(found ?? null);
        setSelectedTerm(null);
    };

    /**
     * 試験回を選択します。
     */
    const handleSelectTerm = (examId: number) => {
        const found = terms.find(t => t.examId === examId);
        setSelectedTerm(found ?? null);
    };

    /**
     * 登録ボタン押下時の処理です。
     * フォームが入力済みでない場合は何もしません。
     */
    const handleSubmit = async () => {
        if (!isFormReady || !selectedTerm) return;
        setIsSubmitting(true);
        setSubmitMessage(null);
        try {
            await submitResult({
                examId: selectedTerm.examId,
                totalScore: totalScore ? Number(totalScore) : null,
                memo: memo || null,
            });
            setSubmitMessage('登録しました！');
            resetForm();
        } catch {
            setSubmitMessage('登録に失敗しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
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
        memoMaxBytes: MEMO_MAX_BYTES,
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
    };
}