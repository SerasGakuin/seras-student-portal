// src/repositories/mock/MockPastExamMasterRepository.ts

import {
  IPastExamMasterRepository,
  University, // インターフェースで定義されている型
  ExamSummary,
} from "../interfaces/IPastExamMasterRepository";

/**
 * IPastExamMasterRepository の大規模モック実装です。
 */
export class MockPastExamMasterRepository implements IPastExamMasterRepository {
  /**
   * 1,000校の架空の大学一覧を生成します。
   * プロパティ名をインターフェースの規定（name）に合わせます。
   */
  async getUniversities(): Promise<University[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const regions = [
      "北海道",
      "東北",
      "関東",
      "中部",
      "近畿",
      "中国",
      "四国",
      "九州",
      "東京",
      "京都",
      "大阪",
      "名古屋",
    ];
    const types = [
      "国立",
      "公立",
      "私立",
      "立",
      "国際",
      "産業",
      "教育",
      "文理",
    ];
    const suffixes = ["大学", "学院大学", "工科大学", "女子大学", "総合大学"];

    return Array.from({ length: 1000 }, (_, i) => {
      const id = i + 1;
      const region = regions[i % regions.length];
      const type = types[(i + (i % 3)) % types.length];
      const suffix = suffixes[i % suffixes.length];

      return {
        id: id,
        fullName: `${region}${type}${suffix} 第${Math.floor(id / 10) + 1}キャンパス`,
      };
    });
  }

  /**
   * 指定された大学に対し、ExamSummary（科目・年度・回の一括データ）を生成します。
   */
  async getExamsByUniversityId(univId: number): Promise<ExamSummary[]> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const subjects = [
      { id: 1, name: "数学" },
      { id: 2, name: "英語" },
      { id: 3, name: "国語" },
      { id: 4, name: "物理" },
      { id: 5, name: "化学" },
      { id: 6, name: "生物" },
    ];
    const terms = ["前期日程", "後期日程", "第1回模試", "第2回模試"];

    const results: ExamSummary[] = [];
    for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
      const subject = subjects[sIdx];
      for (let yOffset = 0; yOffset < 10; yOffset++) {
        results.push({
          examId: univId * 10000 + sIdx * 10 + yOffset,
          subjectId: subject.id,
          subjectName: subject.name,
          utcYear: 2026 - yOffset,
          termName: terms[(univId + sIdx + yOffset) % terms.length],
        });
      }
    }
    return results;
  }
}
