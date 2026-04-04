// src/repositories/interfaces/IStudentPastExamResultRepository.ts

/**
 * 生徒の過去問成績を管理するリポジトリのインターフェースです。
 * 実装は /local/ に置き、ローカルサーバーのDB（Express経由）と通信します。
 */

/**
 * 過去問結果の閲覧用データ。
 * DB側の ExamResultView (v_results_details ビュー) に対応します。
 */
export interface PastExamResult {
  /** results.id : 成績実績レコードの固有ID */
  recordId: number;
  /** exams.id : 試験定義のID */
  examId: number;

  // --- 表示用付随情報 ---
  /** students.name : 生徒名 */
  studentName: string;
  /** universities.full_name : 大学名 */
  universityName: string;
  /** subjects.name : 科目名 */
  subjectName: string;
  /** exams.utc_year : 試験年度 */
  examYear: number;
  /** exams.term_name : 試験区分（前期・後期など） */
  examTerm: string;

  // --- 実績データ ---
  /** results.attempt_number : 同一試験に対する受験回数 */
  attemptNumber: number;
  /** results.score : 得点（totalScoreとして統一） */
  totalScore: number | null;
  /** 評価用満点（実施満点 or 公称満点） */
  maxScore: number;
  /** results.memo : メモ */
  memo: string | null;
  /** results.reg_utc_ms : レコード登録日時（UTCミリ秒） */
  regUtcMs: number;
}

/**
 * 過去問結果を新規追加する際に必要なデータです。
 */
export interface PastExamResultInput {
  /** 対象となる試験定義のID */
  examId: number;
  /** 受験回数。省略した場合はサーバー側で自動インクリメントされます */
  attemptNumber?: number;
  /** 得点。未入力の場合は省略可能です */
  totalScore?: number;
  /** 実施満点。一部の大問のみ解いた場合などに指定します */
  maxScore?: number;
  /** メモ。不要な場合は省略可能 */
  memo?: string | null;
}

export interface IStudentPastExamResultRepository {
  /**
   * 指定した生徒の過去問結果をすべて取得します。
   * @param studentId 生徒を識別するためのID（例: master_idの値）
   */
  findByStudentId(studentId: string | number): Promise<PastExamResult[]>;

  /**
   * 指定した生徒の過去問結果を新規追加します。
   * @param studentId 生徒を識別するためのID
   * @param data 追加する成績データ
   */
  add(studentId: string | number, data: PastExamResultInput): Promise<void>;

  /**
   * 指定した生徒の特定の過去問結果を削除します。
   * @param studentId 生徒を識別するためのID
   * @param recordId 削除対象のレコードID
   */
  delete(studentId: string | number, recordId: number): Promise<void>;
}
