// src/app/exam-result-form/hooks/usePastExamForm.ts

import { useState, useEffect, useMemo } from "react";
import {
  IPastExamMasterRepository,
  ExamSummary,
} from "@/repositories/interfaces/IPastExamMasterRepository";
import { IStudentPastExamResultRepository } from "@/repositories/interfaces/IStudentPastExamResultRepository";

// --- 型定義は既存のものを維持 ---
export interface UniversityOption {
  id: number;
  fullName: string;
}
export interface SubjectOption {
  id: number;
  name: string;
}
export interface YearOption {
  year: number;
}
export interface TermOption {
  examId: number;
  termName: string;
}

const MEMO_MAX_BYTES = 256;
const textEncoder = new TextEncoder();
function getByteLength(str: string): number {
  return textEncoder.encode(str).byteLength;
}

export function usePastExamForm(
  masterRepo: IPastExamMasterRepository,
  resultRepo: IStudentPastExamResultRepository,
  studentId: string | number,
) {
  const [selectedUniversity, setSelectedUniversity] =
    useState<UniversityOption | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState<YearOption | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermOption | null>(null);

  const [totalScore, setTotalScore] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [universityQuery, setUniversityQuery] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  // ここが重要：段階的なリストではなく、選択された大学の全試験データを一括保持する
  const [examSummaries, setExamSummaries] = useState<ExamSummary[]>([]);

  // 大学一覧ロード
  useEffect(() => {
    masterRepo.getUniversities().then(setUniversities);
  }, [masterRepo]);

  // 大学が選択されたら、その大学の全試験情報を一気に取得する
  useEffect(() => {
    if (!selectedUniversity) {
      setExamSummaries([]);
      return;
    }
    masterRepo
      .getExamsByUniversityId(selectedUniversity.id)
      .then(setExamSummaries);
  }, [selectedUniversity, masterRepo]);

  // --- ExamSummary から各選択肢を導出する (DI化以外の変更禁止ルールを遵守しつつロジックを統合) ---

  /** 科目一覧：examSummaries から一意な科目を抽出 */
  const subjects = useMemo(() => {
    const map = new Map<number, string>();
    examSummaries.forEach((s) => map.set(s.subjectId, s.subjectName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [examSummaries]);

  /** 年度一覧：選択された科目に対応する年度を抽出 */
  const years = useMemo(() => {
    if (!selectedSubject) return [];
    const set = new Set<number>();
    examSummaries
      .filter((s) => s.subjectId === selectedSubject.id)
      .forEach((s) => set.add(s.utcYear));
    return Array.from(set)
      .sort((a, b) => b - a)
      .map((year) => ({ year }));
  }, [examSummaries, selectedSubject]);

  /** 試験回一覧：選択された科目・年度に対応する試験回を抽出 */
  const terms = useMemo(() => {
    if (!selectedSubject || !selectedYear) return [];
    return examSummaries
      .filter(
        (s) =>
          s.subjectId === selectedSubject.id && s.utcYear === selectedYear.year,
      )
      .map((s) => ({ examId: s.examId, termName: s.termName }));
  }, [examSummaries, selectedSubject, selectedYear]);

  // --- 以下、ハンドラーやバリデーションロジックは一切変更なし ---

  const universitySuggestions =
    universityQuery.length > 0
      ? universities.filter((u) => u.fullName.includes(universityQuery))
      : [];

  const memoByteLength = getByteLength(memo);
  const isMemoOverLimit = memoByteLength > MEMO_MAX_BYTES;
  const isFormReady =
    selectedUniversity !== null &&
    selectedSubject !== null &&
    selectedYear !== null &&
    selectedTerm !== null &&
    !isMemoOverLimit;

  const resetForm = () => {
    setSelectedUniversity(null);
    setSelectedSubject(null);
    setSelectedYear(null);
    setSelectedTerm(null);
    setTotalScore("");
    setMemo("");
    setUniversityQuery("");
    setSubmitMessage(null);
  };

  const handleSelectUniversity = (university: UniversityOption) => {
    setSelectedUniversity(university);
    setUniversityQuery("");
    setSelectedSubject(null);
    setSelectedYear(null);
    setSelectedTerm(null);
  };

  const handleUniversityQueryChange = (query: string) => {
    setUniversityQuery(query);
    setSelectedUniversity(null);
    setSelectedSubject(null);
    setSelectedYear(null);
    setSelectedTerm(null);
  };

  const handleSelectSubject = (subjectId: number) => {
    const found = subjects.find((s) => s.id === subjectId);
    setSelectedSubject(found ?? null);
    setSelectedYear(null);
    setSelectedTerm(null);
  };

  const handleSelectYear = (year: number) => {
    const found = years.find((y) => y.year === year);
    setSelectedYear(found ?? null);
    setSelectedTerm(null);
  };

  const handleSelectTerm = (examId: number) => {
    const found = terms.find((t) => t.examId === examId);
    setSelectedTerm(found ?? null);
  };

  const handleSubmit = async () => {
    if (!isFormReady || !selectedTerm) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      await resultRepo.add(studentId, {
        examId: selectedTerm.examId,
        totalScore: totalScore ? Number(totalScore) : undefined,
        memo: String(memo).trim() || null,
      });
      setSubmitMessage("登録しました！");
      resetForm();
    } catch {
      setSubmitMessage("登録に失敗しました。");
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
