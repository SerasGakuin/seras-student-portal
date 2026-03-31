// src/app/exam-result-form/components/PastExamResultList.tsx

"use client";

import { usePastExamResults } from "@/hooks/usePastExamResults";
import styles from "./PastExamResultList.module.css";

export function PastExamResultList() {
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
  } = usePastExamResults();

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

      {/* 一覧 */}
      {filteredResults.length === 0 ? (
        <p className={styles.emptyMessage}>データがありません。</p>
      ) : (
        <ul className={styles.list}>
          {filteredResults.map((result) => (
            <li key={result.recordId} className={styles.listItem}>
              <div className={styles.itemMain}>
                <span className={styles.university}>
                  {result.universityName}
                </span>
                <span className={styles.subject}>{result.subjectName}</span>
              </div>
              <div className={styles.itemSub}>
                <span>{result.year}年度</span>
                <span>{result.termName}</span>
                <span className={styles.score}>
                  {result.totalScore ?? "-"}点
                </span>
              </div>
              {result.memo && <p className={styles.memo}>{result.memo}</p>}

              {deletableMap.get(result.recordId) && (
                <button
                  className={styles.deleteIconButton}
                  onClick={() => handleDeleteClick(result.recordId)}
                  disabled={deletingId === result.recordId}
                  aria-label="削除"
                >
                  🗑
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 削除確認ポップアップ */}
      {confirmId !== null && (
        <div className={styles.overlay}>
          <div className={styles.dialog} role="dialog" aria-modal="true">
            <p className={styles.dialogText}>本当に削除しますか？</p>
            <div className={styles.dialogActions}>
              <button
                className={styles.confirmButton}
                onClick={handleDeleteConfirm}
              >
                削除する
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleDeleteCancel}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
