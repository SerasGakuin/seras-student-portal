// src/repositories/interfaces/IPastExamMasterRepository.ts

export interface University {
  id: number;
  fullName: string;
}

/**
 * 大学に紐づく試験情報の要約。
 * 科目・年度・回を一気に取得し、フロントエンドで絞り込むための構造です。
 */
export interface ExamSummary {
  /** 試験を一意に特定するID */
  examId: number;
  /** 科目ID */
  subjectId: number;
  /** 科目名 (例: "数学", "英語") */
  subjectName: string;
  /** 実施年度 (西暦) */
  utcYear: number;
  /** 試験回名 (例: "前期", "後期", "第1回") */
  termName: string;
}

/**
 * 過去問に関連するマスターデータ（大学・試験定義）を取得するためのリポジトリです。
 */
export interface IPastExamMasterRepository {
  /** すべての大学一覧を取得します */
  getUniversities(): Promise<University[]>;

  /** 指定した大学に紐づく試験一覧を取得します */
  getExamsByUniversityId(univId: number): Promise<ExamSummary[]>;
}
