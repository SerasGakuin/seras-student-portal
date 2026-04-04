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
  studentId: number,
) {
  // 生データ（リポジトリから取得した最新の成績リスト）
  const [rawResults, setRawResults] = useState<PastExamResult[]>([]);
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState("");
  // 各種ステータス
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

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
      alert("成績データの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [resultRepo, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * 10万件規模のフィルタリングとソート。
   * memoカラム（string | null）を直接参照するように修正しました。
   */
  const filteredResults = useMemo(() => {
    let data = [...rawResults];

    // 検索語がある場合のみフィルタリングを実行
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      data = data.filter((r) => {
        // memoカラムを直接チェック（JSON.parseは不要）
        const memoMatch = r.memo?.toLowerCase().includes(query);
        const idMatch = r.recordId.toString().includes(query);
        const scoreMatch = r.totalScore?.toString().includes(query);

        return memoMatch || idMatch || scoreMatch;
      });
    }

    // 登録日時（regUtcMs）の降順でソート（新しい順）
    // 10万件のソートは重いため、サーバー側でソート済みで返せるならそれがベストです
    return data.sort((a, b) => b.regUtcMs - a.regUtcMs);
  }, [rawResults, searchQuery]);

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
      // 成功したらローカルステートから取り除く（再フェッチせずにUIを更新）
      setRawResults((prev) => prev.filter((r) => r.recordId !== targetId));
    } catch (e) {
      alert("削除に失敗しました:" + (e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  /** 削除ボタン押下時のイベントハンドラ */
  const handleDeleteClick = (recordId: number) => setConfirmId(recordId);
  /** 削除確認のキャンセル */
  const handleDeleteCancel = () => setConfirmId(null);

  /** 24時間以内かどうかの判定用ヘルパー */
  const checkIsDeletable = useCallback((regUtcMs: number) => {
    return Date.now() - regUtcMs < DELETABLE_DURATION_MS;
  }, []);

  return {
    filteredResults,
    searchQuery,
    setSearchQuery,
    isLoading,
    deletingId,
    confirmId,
    handleDeleteClick,
    handleDeleteCancel,
    handleDeleteConfirm,
    checkIsDeletable,
  };
}
