// src/repositories/mock/MockStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from "../interfaces/IStudentPastExamResultRepository";

/**
 * 10万件規模のデータをシミュレートする試験成績リポジトリのモックです。
 * 新しい PastExamResult インターフェース（表示用カラム込み）に対応。
 */
export class MockStudentPastExamResultRepository implements IStudentPastExamResultRepository {
  /**
   * 10万件の成績データを生成して返却します。
   */
  async findByStudentId(studentId: string | number): Promise<PastExamResult[]> {
    // 通信待機シミュレーション
    await new Promise((resolve) => setTimeout(resolve, 800));

    const results: PastExamResult[] = [];
    const now = Date.now();
    const oneYearMs = 1000 * 60 * 60 * 24 * 365;

    // サンプルのための固定値リスト
    const univs = [
      "京都大学",
      "大阪大学",
      "東京大学",
      "東北大学",
      "名古屋大学",
    ];
    const subjects = ["数学IA", "数学IIB", "英語", "物理", "化学", "国語"];
    const terms = ["前期", "後期", "共通テスト", "秋季"];
    const memos = [
      "計算ミスに注意",
      "時間配分は良かった",
      "英単語の語彙力不足",
      "次は9割目指す",
      "過去問10年分完了",
      "難化していた",
      "ケアレスミス",
    ];

    const batchSize = 100000;

    for (let i = 1; i <= batchSize; i++) {
      const hasScore = Math.random() > 0.05;
      const hasMemo = Math.random() > 0.8;

      results.push({
        recordId: i,
        examId: Math.floor(Math.random() * 1000),

        // --- 新規追加された表示項目 ---
        studentName: "bœm (Mock)",
        universityName: univs[i % univs.length],
        subjectName: subjects[i % subjects.length],
        examYear: 2020 + (i % 6),
        examTerm: terms[i % terms.length],

        // --- 実績データ ---
        attemptNumber: (i % 3) + 1,
        totalScore: hasScore ? Math.floor(Math.random() * 101) : null,
        maxScore: 100, // デフォルト満点
        memo: hasMemo ? memos[i % memos.length] : null,
        regUtcMs: now - Math.floor(Math.random() * oneYearMs),
      });
    }

    // Serasジョークデータも型を合わせて維持
    results.push({
      recordId: 0,
      examId: 999999,
      studentName: "bœm",
      universityName: "Seras University",
      subjectName: "禁忌魔術概論",
      examYear: 2026,
      examTerm: "終末期",
      attemptNumber: 1,
      totalScore: 1234567890,
      maxScore: 100,
      memo: "これはモックデータです",
      regUtcMs: Number.MAX_SAFE_INTEGER,
    });

    return results;
  }

  /** 削除のモック */
  async delete(studentId: string | number, recordId: number): Promise<void> {
    console.log(
      `[Large Mock] Deleting record ${recordId} for student ${studentId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  /** 追加のモック */
  async add(
    studentId: string | number,
    data: PastExamResultInput,
  ): Promise<void> {
    console.log(`[Large Mock] Adding record for student ${studentId}:`, data);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
