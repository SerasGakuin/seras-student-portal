// src/repositories/interfaces/IStudentPastExamResultRepository.ts

/**
 * 生徒の過去問成績を管理するリポジトリのインターフェースです。
 * 実装は2026-03-31現在は/local/に置きます。ローカルサーバーにデータを保存するという意味です。
 */

/**
 * 過去問結果の閲覧用データ。
 * results テーブルを基に関連情報を結合したものです。
 */
export interface PastExamResult {
  /** results.id : 成績実績レコードのID */
  recordId: number;
  /** results.examId : 試験定義のID */
  examId: number;
  /** results.studentId : 生徒のID */
  studentId: number;
  /** results.studentIdType : 生徒を識別するためのタイプ */
  studentIdType: string;
  /** results.attemptNumber : 同一試験に対する受験回数 */
  attemptNumber: number;
  /** results.totalScore : 得点。未入力の場合はnull */
  totalScore: number | null;
  /** results.memo : メモ。不要な場合はnull */
  memo: string | null;
  /** results.regUtcMs : レコード登録日時（UTCミリ秒） */
  regUtcMs: number;
}

/**
 * 過去問結果を新規追加する際に必要なデータです。
 */
export interface PastExamResultInput {
  /** results.examId : 対象となる試験定義のID */
  examId: number;
  /** results.attemptNumber    : 受験回数。省略した場合は1として扱われます */
  attemptNumber?: number;
  /** results.totalScore : 得点。未入力の場合は省略可能です */
  totalScore?: number;
  /** results.memo : メモ。不要な場合は省略可能 */
  memo?: string | null;
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
