// src/repositories/local/LocalStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from "../interfaces/IStudentPastExamResultRepository";

/**
 * VercelのAPI Routes (/api/exam-result-form) を介して
 * ローカルサーバーのDB（Express）と通信するリポジトリの実装です。
 */
export class LocalStudentPastExamResultRepository implements IStudentPastExamResultRepository {
  private readonly apiPath = "/api/exam-result-form";

  /**
   * 生徒を識別するためのキーのタイプ。
   * システム全体で "master_id" をデフォルトとして使用。
   */
  private readonly studentIdType = "master_id";

  /**
   * 指定した生徒の過去問結果をすべて取得します。
   */
  async findByStudentId(studentId: string | number): Promise<PastExamResult[]> {
    const params = new URLSearchParams({
      type: "results",
      studentId: studentId.toString(),
      studentIdType: this.studentIdType,
    });

    const response = await fetch(`${this.apiPath}?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `過去問結果の取得に失敗しました: ${response.statusText}`,
      );
    }

    // DB側の ExamResultView 構造がそのまま PastExamResult として返ってくる
    return (await response.json()) as PastExamResult[];
  }

  /**
   * 指定した生徒の過去問結果を新規追加します。
   */
  async add(
    studentId: string | number,
    data: PastExamResultInput,
  ): Promise<void> {
    // サーバー側の ExamResultInput (DB層) が期待するキャメルケースで構築
    const body = {
      studentId: studentId.toString(),
      studentIdType: this.studentIdType,
      examId: data.examId,
      attemptNumber: data.attemptNumber, // undefinedならサーバー側で自動採番される
      totalScore: data.totalScore, // score ではなく totalScore で統一
      maxScore: data.maxScore, // ★追加：実施満点を送信
      memo: data.memo,
    };

    const response = await fetch(this.apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `成績データの追加に失敗しました: ${response.statusText}`,
      );
    }
  }

  /**
   * 指定した生徒の特定の過去問結果を削除します。
   */
  async delete(studentId: string | number, recordId: number): Promise<void> {
    // サーバー側のバリデーションに必要な情報をクエリパラメータに乗せる
    const params = new URLSearchParams({
      recordId: recordId.toString(),
      studentId: studentId.toString(),
      studentIdType: this.studentIdType,
    });

    const response = await fetch(`${this.apiPath}?${params.toString()}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `成績データの削除に失敗しました: ${response.statusText}`,
      );
    }
  }
}
