// src/repositories/interfaces/IStudentInfoRepository.ts

import { StudentInfoRecord } from '@/lib/types/StudentInfoRecord';

/**
 * 生徒の情報を取得するリポジトリの2026-03-31での最新版です。
 * IStudentRepositoryとは取得されるオブジェクトの型が違います。
 */
export interface IStudentInfoRepository {
  /**
   * LINEのユーザーIDから生徒情報を取得します。
   * @param lineId LINEのユーザーID
   */
  findByLineId(lineId: string): Promise<StudentInfoRecord | null>;
}