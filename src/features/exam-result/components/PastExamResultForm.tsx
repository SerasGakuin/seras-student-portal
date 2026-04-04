"use client";

import { Button } from "@/components/ui/Button";
import { FormGroup } from "@/components/ui/FormGroup"; // インポート
import { FormInput } from "@/components/ui/FormInput"; // インポート

import { usePastExamForm } from "@/services/exam-result/usePastExamForm";
import styles from "./PastExamResultForm.module.css";

/**
 * 過去の試験結果を登録するフォームコンポーネント
 *  - 大学・学部・学科の選択（オートコンプリート）
 *  - 科目の選択（大学に紐づく科目のみ）
 * ...
 */
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

  const isUniversityQueryActive =
    universityQuery.length > 0 && !selectedUniversity;

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>成績を登録する</h3>
      <hr className={styles.hr} />

      {/* 1. 大学・学部・学科の選択 */}
      <FormGroup label="大学・学部・学科">
        <FormInput
          type="text"
          placeholder="大学・学部・学科名を入力してください"
          value={
            selectedUniversity ? selectedUniversity.fullName : universityQuery
          }
          onChange={(e) => handleUniversityQueryChange(e.target.value)}
        />
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
      </FormGroup>

      {/* 2. 科目の選択 */}
      <FormGroup label="科目">
        <select
          className={styles.select}
          disabled={selectedUniversity === null}
          value={selectedSubject?.id ?? ""}
          onChange={(e) => handleSelectSubject(Number(e.target.value))}
        >
          <option value="">
            {selectedUniversity === null
              ? "大学・学部・学科を先に入力してください"
              : "科目を選択してください"}
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FormGroup>

      {/* 3. 年度の選択 */}
      <FormGroup label="年度">
        <select
          className={styles.select}
          disabled={selectedSubject === null}
          value={selectedYear?.year ?? ""}
          onChange={(e) => handleSelectYear(Number(e.target.value))}
        >
          <option value="">
            {selectedSubject === null
              ? "科目を先に選択してください"
              : "年度を選択してください"}
          </option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}年度
            </option>
          ))}
        </select>
      </FormGroup>

      {/* 4. 試験回の選択 */}
      <FormGroup label="試験回">
        <select
          className={styles.select}
          disabled={selectedYear === null}
          value={selectedTerm?.examId ?? ""}
          onChange={(e) => handleSelectTerm(Number(e.target.value))}
        >
          <option value="">
            {selectedYear === null
              ? "年度を先に選択してください"
              : "試験回を選択してください"}
          </option>
          {terms.map((t) => (
            <option key={t.examId} value={t.examId}>
              {t.termName}
            </option>
          ))}
        </select>
      </FormGroup>

      {/* 5. 得点の入力 */}
      <FormGroup label="得点">
        <FormInput
          type="number"
          min="0"
          placeholder={
            selectedTerm === null
              ? "試験回を先に選択してください"
              : "得点を入力（省略可）"
          }
          disabled={selectedTerm === null}
          value={totalScore}
          onChange={(e) => {
            const val = e.target.value;
            if (val !== "" && Number(val) < 0) return;
            setTotalScore(val);
          }}
        />
      </FormGroup>

      {/* 6. メモの入力 */}
      <FormGroup
        label="メモ"
        error={isMemoOverLimit ? "※上限を超えています" : undefined}
      >
        <textarea
          className={styles.textarea}
          placeholder={
            selectedTerm === null
              ? "試験回を先に選択してください"
              : `メモを入力（省略可・${memoMaxBytes}バイトまで）`
          }
          disabled={selectedTerm === null}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <span className={styles.counter}>
          {memoByteLength} / {memoMaxBytes} バイト
        </span>
      </FormGroup>

      <Button onClick={handleSubmit} disabled={!isFormReady || isSubmitting}>
        {isSubmitting ? "登録中..." : "追加する"}
      </Button>

      {submitMessage && <p className={styles.submitMessage}>{submitMessage}</p>}
    </section>
  );
}
