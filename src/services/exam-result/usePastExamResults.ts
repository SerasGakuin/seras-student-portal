// src/app/exam-result-form/hooks/usePastExamResults.ts

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  IStudentPastExamResultRepository,
  PastExamResult,
} from "@/repositories/interfaces/IStudentPastExamResultRepository";

/** 削除可能とみなす登録からの経過時間（24時間） */
const DELETABLE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * 過去問成績の一覧取得・削除を管理するカスタムフックです。
 */
export function usePastExamResults(
  resultRepo: IStudentPastExamResultRepository,
  studentId: string | number,
) {
  // 生データ
  const [rawResults, setRawResults] = useState<PastExamResult[]>([]);

  // 1. UIの入力欄と同期するState（即時反映）
  const [searchQuery, setSearchQuery] = useState("");
  // 2. 実際の計算に使用するState（遅延反映）
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null); // API通信中のID
  const [confirmId, setConfirmId] = useState<number | null>(null); // モーダル表示用ID

  // --- デバウンス処理の実装 ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * データの初期読み込み
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resultRepo.findByStudentId(studentId);
      setRawResults(data);
    } catch (e) {
      console.error("Failed to fetch results:", e);
    } finally {
      setIsLoading(false);
    }
  }, [resultRepo, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * 10万件規模のフィルタリングとソート。
   * debouncedQuery に依存させることでタイピング中の負荷を劇的に下げます。
   */
  const filteredResults = useMemo(() => {
    let data = rawResults;

    if (debouncedQuery.trim() !== "") {
      const query = debouncedQuery.toLowerCase();
      data = data.filter((r) => {
        return (
          r.universityName.toLowerCase().includes(query) ||
          r.subjectName.toLowerCase().includes(query) ||
          (r.memo?.toLowerCase().includes(query) ?? false) ||
          r.totalScore?.toString().includes(query) ||
          r.examYear.toString().includes(query)
        );
      });
    }

    // 10万件の非破壊ソート
    return [...data].sort((a, b) => b.regUtcMs - a.regUtcMs);
  }, [rawResults, debouncedQuery]);

  /** 削除可能かどうかの判定関数 */
  const checkIsDeletable = useCallback((regUtcMs: number) => {
    return Date.now() - regUtcMs < DELETABLE_DURATION_MS;
  }, []);

  /**
   * 削除可否のキャッシュ。
   * filteredResults（表示対象）のみを対象に計算します。
   */
  const deletableMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (const res of filteredResults) {
      map[res.recordId] = checkIsDeletable(res.regUtcMs);
    }
    return map;
  }, [filteredResults, checkIsDeletable]);

  /**
   * 削除実行処理
   */
  const handleDeleteConfirm = async () => {
    if (confirmId === null) return;

    const targetId = confirmId;
    setDeletingId(targetId);
    setConfirmId(null);

    try {
      await resultRepo.delete(studentId, targetId);
      setRawResults((prev) => prev.filter((r) => r.recordId !== targetId));
    } catch (e) {
      alert("削除に失敗しました: " + (e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  /** 削除ボタン押下時 */
  const handleDeleteClick = useCallback((recordId: number) => {
    setConfirmId(recordId);
  }, []);

  /** 削除確認のキャンセル */
  const handleDeleteCancel = useCallback(() => {
    setConfirmId(null);
  }, []);

  return {
    // データと検索
    filteredResults,
    searchQuery,
    setSearchQuery,
    isLoading,

    // 削除状態管理
    deletingId,
    confirmId,
    deletableMap,

    // ハンドラー
    handleDeleteClick,
    handleDeleteCancel,
    handleDeleteConfirm,

    // 予備の再読み込み
    refresh: loadData,
  };
}
