// src/repositories/interfaces/IPastExamMasterRepository.ts

export interface University {
  id: number;
  name: string;
}

export interface Exam {
  id: number;
  universityId: number;
  name: string;
  year?: number; // 年度などが必要な場合
}

/**
 * 過去問に関連するマスターデータ（大学・試験定義）を取得するためのリポジトリです。
 */
export interface IPastExamMasterRepository {
  /** すべての大学一覧を取得します */
  getUniversities(): Promise<University[]>;

  /** 指定した大学に紐づく試験一覧を取得します */
  getExamsByUniversityId(universityId: number): Promise<Exam[]>;
}
