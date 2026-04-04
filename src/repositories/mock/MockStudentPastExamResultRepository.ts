// src/repositories/mock/MockStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from "../interfaces/IStudentPastExamResultRepository";

/**
 * 10万件規模のデータをシミュレートする試験成績リポジトリのモックです。
 * `usePastExamResults.ts` のロジックを参考に、型定義と整合性を取っています。
 */
export class MockStudentPastExamResultRepository implements IStudentPastExamResultRepository {
  /**
   * 10万件 + 1件（Serasデータ）の成績データを生成して返却します。
   * フロントエンドのフィルタリングやソートの負荷テストに最適です。
   */
  async findByStudentId(studentId: number): Promise<PastExamResult[]> {
    // 大量データのため、生成時間を考慮して少し長めの待機
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const results: PastExamResult[] = [];

    // 1. Seras大学のジョークデータ (recordId: 0)
    results.push({
      recordId: 0,
      examId: 999999,
      studentId: studentId,
      attemptNumber: 1,
      totalScore: 1234567890, // 型定義上は number なので受け入れ可能
      descJson: JSON.stringify({
        memo: "他のデータはランダム生成なので現実に存在する大学とは限りません",
        special: "Serasのトリビア",
      }),
      regUtcMs: Number.MAX_SAFE_INTEGER, // 常に一番上にくる
    });

    // 2. 10万件のランダム生成
    const memos = [
      "計算ミスに注意",
      "大問2の証明が不完全",
      "時間配分は良かった",
      "英単語の語彙力不足",
      "次は9割目指す",
      "過去問10年分完了",
      "難化していた",
      "ケアレスミスで10点失点",
    ];

    const batchSize = 100000;
    const now = Date.now();
    const oneMonthMs = 1000 * 60 * 60 * 24 * 30;

    for (let i = 1; i <= batchSize; i++) {
      const hasScore = Math.random() > 0.1;
      const hasMemo = Math.random() > 0.7;

      results.push({
        recordId: i,
        examId: Math.floor(Math.random() * 1000), // MockMaster側のID範囲
        studentId: studentId,
        attemptNumber: (i % 3) + 1,
        totalScore: hasScore ? Math.floor(Math.random() * 61) + 40 : null,
        descJson: hasMemo
          ? JSON.stringify({
              memo: memos[Math.floor(Math.random() * memos.length)],
            })
          : null,
        regUtcMs: now - Math.floor(Math.random() * oneMonthMs),
      });
    }

    return results;
  }

  /** 削除のモック（成功したフリ） */
  async delete(studentId: number, recordId: number): Promise<void> {
    console.log(
      `[Large Mock] Deleting record ${recordId} for student ${studentId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /** 追加のモック */
  async add(studentId: number, data: PastExamResultInput): Promise<void> {
    console.log(`[Large Mock] Adding record:`, data);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
