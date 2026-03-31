// src/app/exam-result-form/hooks/usePastExamResults.ts

import { useState } from "react";

/** 成績一覧の1件分のデータ */
export interface PastExamResultItem {
  recordId: number;
  universityName: string;
  subjectName: string;
  year: number;
  termName: string;
  totalScore: number | null;
  memo: string | null;
  regUtcMs: number;
}

/** モックデータ（実APIが繋がるまでの仮データ） */
const MOCK_RESULTS: PastExamResultItem[] = (() => {
  const universities = [
    "大阪大学",
    "京都大学",
    "東京大学",
    "名古屋大学",
    "東北大学",
    "九州大学",
    "北海道大学",
  ];
  const faculties = [
    "理学部",
    "工学部",
    "基礎工学部",
    "医学部",
    "文学部",
    "経済学部",
  ];
  const subjects = [
    "数学",
    "英語",
    "物理",
    "化学",
    "生物",
    "国語",
    "世界史",
    "日本史",
  ];
  const terms = ["前期", "後期", "第1回模試", "第2回模試"];
  const memos = [
    "計算ミスに注意",
    "大問2の証明が不完全",
    "時間配分は良かった",
    "英単語の語彙力不足",
    "次は9割目指す",
    "過去問10年分完了",
    "難化していた",
    "ケアレスミスで10点失点",
  ];

  const result = [
    {
      recordId: 0,
      universityName: `Seras大学 Seras学部`,
      subjectName: "Serasのトリビア",
      year: 2999,
      termName: "前期",
      totalScore: "1234567890",
      memo: "簡単だった",
      regUtcMs: 0,
    },
  ];

  result.push(
    ...Array.from({ length: 100000 }).map((_, i) => {
      const id = i + 1;
      // 完全にランダムな要素を選択
      const uni = universities[Math.floor(Math.random() * universities.length)];
      const fac = faculties[Math.floor(Math.random() * faculties.length)];
      const sub = subjects[Math.floor(Math.random() * subjects.length)];
      const term = terms[Math.floor(Math.random() * terms.length)];
      const year = 2020 + Math.floor(Math.random() * 7); // 2020〜2026年

      // 得点のランダム生成（40〜100点）
      const score = Math.floor(Math.random() * 61) + 40;

      // メモを30%の確率で付与
      const memo =
        Math.random() > 0.7
          ? memos[Math.floor(Math.random() * memos.length)]
          : null;

      // 登録時間を直近1ヶ月の間でランダムに設定
      const regUtcMs =
        Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30);

      return {
        recordId: id,
        universityName: `${uni} ${fac}`,
        subjectName: sub,
        year: year,
        termName: term,
        totalScore: score,
        memo: memo,
        regUtcMs: regUtcMs,
      };
    }),
  );
  return result;
})();

/** 削除可能とみなす登録からの経過時間（ミリ秒） */
const DELETABLE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * 登録から24時間以内かどうかを判定します。
 * UIでの削除ボタン表示制御に使用します。
 * @param regUtcMs 登録日時（UTCミリ秒）
 */
function isDeletable(regUtcMs: number): boolean {
  return Date.now() - regUtcMs < DELETABLE_DURATION_MS;
}

/**
 * 過去問成績の一覧取得・削除を管理するカスタムフックです。
 * 現在はモックデータを使用しています。
 * APIが実装され次第、fetchに差し替えてください。
 */
export function usePastExamResults() {
  // 成績一覧データ
  const [results, setResults] = useState<PastExamResultItem[]>(MOCK_RESULTS);
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState("");
  // 削除処理中のレコードID（ローディング制御に使用）
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // 削除確認ポップアップの対象レコードID（nullなら非表示）
  const [confirmId, setConfirmId] = useState<number | null>(null);

  /**
   * 検索クエリで絞り込んだ成績一覧を返します。
   * 大学名・科目名・試験回・メモのいずれかに検索クエリが含まれるものを返します。
   */
  const filteredResults = results.filter((r) =>
    [r.universityName, r.subjectName, r.termName, r.memo].some((v) =>
      v?.includes(searchQuery),
    ),
  );

  /**
   * 各レコードが削除可能かどうかを判定したMapを返します。
   * コンポーネント側でisDeletableを直接呼ばなくて済むようにします。
   */
  const deletableMap = new Map(
    results.map((r) => [r.recordId, isDeletable(r.regUtcMs)]),
  );

  /**
   * 削除確認ポップアップを表示します。
   * @param recordId 削除対象のレコードID
   */
  const handleDeleteClick = (recordId: number) => {
    setConfirmId(recordId);
  };

  /**
   * 削除確認ポップアップをキャンセルします。
   */
  const handleDeleteCancel = () => {
    setConfirmId(null);
  };

  /**
   * 削除を実行します。
   * 削除成功後は一覧からそのレコードを除去します。
   * 削除失敗時はアラートを表示します。
   * TODO: 実APIのエンドポイントに差し替えてください。
   */
  const handleDeleteConfirm = async () => {
    if (confirmId === null) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      // TODO: APIリクエストに差し替え
      await new Promise((resolve) => setTimeout(resolve, 500));
      setResults((prev) => prev.filter((r) => r.recordId !== confirmId));
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    /** 検索後の成績一覧 */
    filteredResults,
    /** レコードIDをキーとした削除可否Map */
    deletableMap,
    /** 検索クエリ */
    searchQuery,
    /** 検索クエリを更新する関数 */
    setSearchQuery,
    /** 削除処理中のレコードID */
    deletingId,
    /** 削除確認ポップアップの対象レコードID */
    confirmId,
    /** 削除ボタン押下時の処理 */
    handleDeleteClick,
    /** 削除確認ポップアップのキャンセル処理 */
    handleDeleteCancel,
    /** 削除確認後の実行処理 */
    handleDeleteConfirm,
  };
}
