// src/app/exam-result-form/components/PastExamResultList.tsx

"use client";

import { useState, useMemo } from "react";
import { usePastExamResults } from "@/services/exam-result/usePastExamResults";
import styles from "./PastExamResultList.module.css";

// ここでリポジトリのインスタンスを生成
// 将来的にはコンテキストやDIコンテナから取得する形にリファクタリング予定
import { MockStudentPastExamResultRepository } from "@/repositories/mock/MockStudentPastExamResultRepository";

export function PastExamResultList() {
  const resultRepo = new MockStudentPastExamResultRepository();
  const studentId = 123; // TODO: ログインユーザーのIDを動的に取得するように修正

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
  } = usePastExamResults(resultRepo, studentId);

  // --- ページネーション状態 ---
  const ITEMS_PER_PAGE = 30; // 1ページあたりの最大アイテム数
  const [currentPage, setCurrentPage] = useState(1);

  // 検索ワード変更検知用のステート
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);

  /**
   * 【重要】useEffectを使わないステート調整
   * レンダリング中に前回のクエリと比較し、変更があればその場でページを1に戻します。
   * これによりカスケードレンダリング（描画後の再描画）を防ぎます。
   */
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setCurrentPage(1);
  }

  // 全ページ数の計算
  const totalPages = Math.max(
    1,
    Math.ceil(filteredResults.length / ITEMS_PER_PAGE),
  );

  /**
   * 現在のページに表示するデータのみを抽出
   * 非表示のページのデータはDOMから破棄されます。
   */
  const currentItems = useMemo(() => {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResults.slice(offset, offset + ITEMS_PER_PAGE);
  }, [filteredResults, currentPage]);

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>記録されている成績一覧</h3>
      <hr className={styles.hr}></hr>

      {/* 検索バー */}
      <div className={styles.searchWrapper}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="大学名・科目などで検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ページネーション UI */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>

          <span className={styles.pageInfo}>
            {currentPage} / {totalPages}
          </span>

          <button
            className={styles.pageButton}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}

      {/* 一覧表示 */}
      {currentItems.map((result) => (
        <li key={result.recordId} className={styles.listItem}>
          <div className={styles.itemMain}>
            <span className={styles.university}>{result.universityName}</span>
            <span className={styles.subject}>{result.subjectName}</span>
          </div>
          <div className={styles.itemSub}>
            <span>{result.examYear}年度</span>
            <span>{result.examTerm}</span>
            <span className={styles.score}>{result.totalScore ?? "-"}点</span>
          </div>
          {result.memo && <p className={styles.memo}>{result.memo}</p>}

          {/* 削除ボタン：deletingIdがある間（＝誰かを削除中）は全て無効化 */}
          {deletableMap[result.recordId] && (
            <button
              className={styles.deleteIconButton}
              onClick={() => handleDeleteClick(result.recordId)}
              disabled={deletingId !== null}
            >
              🗑
            </button>
          )}

          {/* インライン確認ダイアログ */}
          {confirmId === result.recordId && (
            <div className={styles.inlineOverlay}>
              <div className={styles.inlineDialog}>
                <span className={styles.inlineText}>削除しますか？</span>
                <div className={styles.inlineActions}>
                  <button
                    className={styles.confirmButtonSmall}
                    onClick={handleDeleteConfirm}
                    /* ここでdeletingIdを使用して連打を防止 */
                    disabled={deletingId !== null}
                  >
                    {deletingId === result.recordId ? "削除中..." : "削除"}
                  </button>
                  <button
                    className={styles.cancelButtonSmall}
                    onClick={handleDeleteCancel}
                    /* 削除処理中はキャンセルも不可にするのが安全 */
                    disabled={deletingId !== null}
                  >
                    中止
                  </button>
                </div>
              </div>
            </div>
          )}
        </li>
      ))}
    </section>
  );
}
