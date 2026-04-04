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
  studentId: string | number, // number固定から string | number に修正
) {
  // 生データ
  const [rawResults, setRawResults] = useState<PastExamResult[]>([]);
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState("");
  // 各種ステータス
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null); // API通信中のID
  const [confirmId, setConfirmId] = useState<number | null>(null); // モーダル表示用ID

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
      // 実運用ではトースト通知などへの差し替えを検討
    } finally {
      setIsLoading(false);
    }
  }, [resultRepo, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * 10万件規模のフィルタリング。
   * universityName や subjectName も検索対象に含め、
   * パフォーマンスのために sort は必要な時だけに抑制します。
   */
  const filteredResults = useMemo(() => {
    let data = rawResults;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
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

    // 10万件の非破壊ソート（regUtcMs 降順）
    // すでにDB側で ORDER BY されているはずですが、UI側での整合性のため維持
    return [...data].sort((a, b) => b.regUtcMs - a.regUtcMs);
  }, [rawResults, searchQuery]);

  /** 削除可能かどうかの判定関数 */
  const checkIsDeletable = useCallback((regUtcMs: number) => {
    return Date.now() - regUtcMs < DELETABLE_DURATION_MS;
  }, []);

  /**
   * 10万件のデータに対して、削除可否をキャッシュする。
   * 計算量を抑えるため、表示対象（filteredResults）のみ回す。
   */
  const deletableMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (const res of filteredResults) {
      map[res.recordId] = checkIsDeletable(res.regUtcMs);
    }
    return map;
  }, [filteredResults, checkIsDeletable]);

  /**
   * 削除実行処理（モーダルで「確定」を押した時）
   */
  const handleDeleteConfirm = async () => {
    if (confirmId === null) return;

    const targetId = confirmId;
    setDeletingId(targetId);
    setConfirmId(null); // モーダルは即座に閉じる

    try {
      await resultRepo.delete(studentId, targetId);
      // 成功したらリストから物理削除（楽観的更新に近い挙動）
      setRawResults((prev) => prev.filter((r) => r.recordId !== targetId));
    } catch (e) {
      alert("削除に失敗しました: " + (e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  /** 削除ボタン押下時（確認モーダルを開く） */
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
