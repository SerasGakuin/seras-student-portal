// src/app/exam-result-form/components/PastExamResultForm.tsx

"use client";

import { GrassCard } from "@/components/ui/GlassCard";

import { usePastExamForm } from "@/hooks/exam-result/usePastExamForm"; // ビジネスロジックをインポート
import styles from "./PastExamResultForm.module.css"; // スタイルをインポート

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
  const isUniversityQueryActive =
    universityQuery.length > 0 && !selectedUniversity;

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>成績を登録する</h3>
      <p className={styles.description}>
        登録後、24h以内なら一覧から削除できます。
      </p>
      <hr className={styles.hr}></hr>

      {/* ===================== */}
      {/* 1. 大学・学部・学科の選択 */}
      {/* テキスト入力によるIMEサジェスト方式。 */}
      {/* 入力内容に前方一致する候補を一覧表示し、クリックで選択する。 */}
      {/* ===================== */}
      <div className={styles.field}>
        <label className={styles.label}>大学・学部・学科</label>
        <input
          className={styles.input}
          type="text"
          placeholder="大学名を入力してください"
          value={
            selectedUniversity ? selectedUniversity.fullName : universityQuery
          }
          onChange={(e) => handleUniversityQueryChange(e.target.value)}
        />

        {/* サジェスト候補エリア */}
        {isUniversityQueryActive && (
          <ul className={styles.suggestionList}>
            {universitySuggestions.length > 0 ? (
              universitySuggestions.map((u) => (
                <li
                  className={styles.suggestionItem}
                  key={u.id}
                  onClick={() => handleSelectUniversity(u)}
                >
                  {u.fullName}
                </li>
              ))
            ) : (
              <li className={styles.suggestionEmpty}>
                部分一致する候補がありません
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ===================== */}
      {/* 2. 科目の選択 */}
      {/* 大学を選択するまで操作できない。 */}
      {/* ===================== */}
      <div className={styles.field}>
        <label className={styles.label}>科目</label>
        <select
          className={styles.select}
          disabled={selectedUniversity === null}
          value={selectedSubject?.id ?? ""}
          onChange={(e) => handleSelectSubject(Number(e.target.value))}
        >
          <option value="">選択してください</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* ===================== */}
      {/* 3. 年度の選択 */}
      {/* 科目を選択するまで操作できない。 */}
      {/* ===================== */}
      <div className={styles.field}>
        <label className={styles.label}>年度</label>
        <select
          className={styles.select}
          disabled={selectedSubject === null}
          value={selectedYear?.year ?? ""}
          onChange={(e) => handleSelectYear(Number(e.target.value))}
        >
          <option value="">選択してください</option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}年度
            </option>
          ))}
        </select>
      </div>

      {/* ===================== */}
      {/* 4. 試験回の選択 */}
      {/* 年度を選択するまで操作できない。 */}
      {/* ===================== */}
      <div className={styles.field}>
        <label className={styles.label}>試験回</label>
        <select
          className={styles.select}
          disabled={selectedYear === null}
          value={selectedTerm?.examId ?? ""}
          onChange={(e) => handleSelectTerm(Number(e.target.value))}
        >
          <option value="">選択してください</option>
          {terms.map((t) => (
            <option key={t.examId} value={t.examId}>
              {t.termName}
            </option>
          ))}
        </select>
      </div>

      {/* ===================== */}
      {/* 5. 得点の入力 */}
      {/* 省略可能。試験回を選択するまで操作できない。 */}
      {/* ===================== */}
      <div className={styles.field}>
        <label className={styles.label}>得点</label>
        <input
          className={styles.input}
          type="number"
          placeholder="得点を入力（省略可）"
          disabled={selectedTerm === null}
          value={totalScore}
          onChange={(e) => setTotalScore(e.target.value)}
        />
      </div>

      {/* ===================== */}
      {/* 6. メモの入力 */}
      {/* 省略可能。256バイトまで入力できる。試験回を選択するまで操作できない。 */}
      {/* ===================== */}
      <div className={styles.field}>
        <label className={styles.label}>メモ</label>
        <textarea
          className={styles.textarea}
          placeholder={`メモを入力（省略可・${memoMaxBytes}バイトまで）`}
          disabled={selectedTerm === null}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        {/* バイト数カウンター。上限を超えた場合は警告を表示する。 */}
        <span className={styles.counter}>
          {memoByteLength} / {memoMaxBytes} バイト
          {isMemoOverLimit && (
            <span className={styles.errorText}> ※上限を超えています</span>
          )}
        </span>
      </div>

      {/* ===================== */}
      {/* 登録ボタン */}
      {/* フォームが入力済みでない場合、または登録処理中は操作できない。 */}
      {/* ===================== */}
      <button
        className={styles.submitButton}
        onClick={handleSubmit}
        disabled={!isFormReady || isSubmitting}
      >
        {isSubmitting ? "登録中..." : "追加する"}
      </button>

      {/* 登録結果メッセージ。成功・失敗に応じたメッセージを表示する。 */}
      {submitMessage && <p className={styles.submitMessage}>{submitMessage}</p>}
    </section>
  );
}
