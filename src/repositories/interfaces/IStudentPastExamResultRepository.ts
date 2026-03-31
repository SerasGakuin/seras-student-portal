// src/repositories/interfaces/IStudentPastExamResultRepository.ts

/**
 * 過去問結果の閲覧用データ。
 * results テーブルを基に関連情報を結合したものです。
 */
export interface PastExamResult {
  /** results.id : 成績実績レコードのID */
  recordId: number;
  /** results.exam_id : 試験定義のID */
  examId: number;
  /** results.student_id : 生徒のID（studentsテーブルの内部ID） */
  studentId: number;
  /** results.attempt_number : 同一試験に対する受験回数 */
  attemptNumber: number;
  /** results.total_score : 得点。未入力の場合はnull */
  totalScore: number | null;
  /** results.desc_json : 補足情報（JSON文字列）。不要な場合はnull */
  descJson: string | null;
  /** results.reg_utc_ms : レコード登録日時（UTCミリ秒） */
  regUtcMs: number;
}

/**
 * 過去問結果を新規追加する際に必要なデータです。
 */
export interface PastExamResultInput {
  /** results.exam_id : 対象となる試験定義のID */
  examId: number;
  /** results.attempt_number : 受験回数。省略した場合は1として扱われます */
  attemptNumber?: number;
  /** results.total_score : 得点。未入力の場合は省略可能です */
  totalScore?: number;
  /** results.desc_json : 補足情報（JSON文字列）。不要な場合は省略可能です */
  descJson?: string;
}

export interface IStudentPastExamResultRepository {
  /**
   * 指定した生徒の過去問結果をすべて取得します。
   * @param studentId 対象生徒の内部ID（studentsテーブルのid）
   */
  findByStudentId(studentId: number): Promise<PastExamResult[]>;

  /**
   * 指定した生徒の過去問結果を新規追加します。
   * @param studentId 対象生徒の内部ID（studentsテーブルのid）
   * @param data 追加する成績データ
   */
  add(studentId: number, data: PastExamResultInput): Promise<void>;

  /**
   * 指定した生徒の特定の過去問結果を削除します。
   * @param studentId 対象生徒の内部ID（studentsテーブルのid）
   * @param recordId 削除対象のレコードID（resultsテーブルのid）
   */
  delete(studentId: number, recordId: number): Promise<void>;
}