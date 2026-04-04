// src/repositories/local/LocalStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from "../interfaces/IStudentPastExamResultRepository";

/**
 * VercelのAPI Routes (/api/exam-result-form) を介して
 * ローカルサーバーのDBと通信するリポジトリの実装です。
 */
export class LocalStudentPastExamResultRepository implements IStudentPastExamResultRepository {
  private readonly apiPath = "/api/exam-result-form";

  /**
   * 生徒を識別するためのキーのタイプ。
   * ここでは一貫して "master_id" を使用するように定義します。
   */
  private readonly studentIdType = "master_id";

  /**
   * 指定した生徒の過去問結果をすべて取得します。
   */
  async findByStudentId(studentId: number): Promise<PastExamResult[]> {
    const params = new URLSearchParams({
      type: "results",
      studentId: studentId.toString(),
      studentIdType: this.studentIdType, // キータイプを付与
    });

    const response = await fetch(`${this.apiPath}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`過去問結果の取得に失敗しました: ${response.statusText}`);
    }

    return (await response.json()) as PastExamResult[];
  }

  /**
   * 指定した生徒の過去問結果を新規追加します。
   */
  async add(studentId: number, data: PastExamResultInput): Promise<void> {
    // リクエストボディにも生徒識別情報を一貫して含める
    const body = {
      studentId: studentId,
      studentIdType: this.studentIdType,
      examId: data.examId,
      attemptNumber: data.attemptNumber ?? 1,
      totalScore: data.totalScore,
      memo: data.memo,
    };

    const response = await fetch(this.apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
   * セキュリティと一貫性のため、recordId に加えて生徒識別情報を送信します。
   */
  async delete(studentId: number, recordId: number): Promise<void> {
    const params = new URLSearchParams({
      recordId: recordId.toString(), // route.tsの引数名に合わせる
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
