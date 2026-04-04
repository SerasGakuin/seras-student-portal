// src/repositories/local/LocalStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from "../interfaces/IStudentPastExamResultRepository";

/**
 * VercelのAPI Routes (/api/exam-result-form) を介して
 * ローカルサーバーのDBと通信するリポジトリの実装です。
 * * フロントエンドからはこのクラスを介することで、
 * 直接外部APIキーを扱うことなく安全にデータ操作を行います。
 */
export class LocalStudentPastExamResultRepository implements IStudentPastExamResultRepository {
  private readonly apiPath = "/api/exam-result-form";

  /**
   * 指定した生徒の過去問結果をすべて取得します。
   * API Route側で type=results として処理されるリクエストを送ります。
   */
  async findByStudentId(studentId: number): Promise<PastExamResult[]> {
    // クエリパラメータを構築
    const params = new URLSearchParams({
      type: "results",
      studentId: studentId.toString(),
      studentIdType: "id",
    });

    const response = await fetch(`${this.apiPath}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`過去問結果の取得に失敗しました: ${response.statusText}`);
    }

    // API Route (route.ts) から返されるJSONをキャストして返却
    return (await response.json()) as PastExamResult[];
  }

  /**
   * 指定した生徒の過去問結果を新規追加します。
   * POSTメソッドで body にデータを込めて送信します。
   */
  async add(studentId: number, data: PastExamResultInput): Promise<void> {
    // サーバー側の期待する形式に合わせ、student_idをマージしたリクエストボディを作成
    const body = {
      studentId: studentId,
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
   * DELETEメソッドを使用し、クエリパラメータでレコードIDを指定します。
   */
  async delete(studentId: number, recordId: number): Promise<void> {
    // 削除対象のレコードIDを指定（API Routeの仕様に合わせる）
    const params = new URLSearchParams({
      id: recordId.toString(),
    });

    const response = await fetch(`${this.apiPath}?${params.toString()}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`成績データの削除に失敗しました: ${response.statusText}`);
    }
  }
}
