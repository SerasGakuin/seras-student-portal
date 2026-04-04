// src/repositories/mock/MockPastExamMasterRepository.ts

import {
  IPastExamMasterRepository,
  University,
  Exam,
} from "../interfaces/IPastExamMasterRepository";

/**
 * IPastExamMasterRepository の大規模モック実装です。
 * 大学数 1,000件、各大学に数十〜百件の試験データを動的に生成します。
 */
export class MockPastExamMasterRepository implements IPastExamMasterRepository {
  /**
   * 1,000校の架空の大学一覧を生成します。
   */
  async getUniversities(): Promise<University[]> {
    // ネットワーク遅延のシミュレート
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

    // 1,000件のデータを生成
    return Array.from({ length: 1000 }, (_, i) => {
      const id = i + 1;
      const region = regions[i % regions.length];
      const type = types[(i + (i % 3)) % types.length];
      const suffix = suffixes[i % suffixes.length];

      return {
        id: id,
        name: `${region}${type}${suffix} 第${Math.floor(id / 10) + 1}キャンパス`,
      };
    });
  }

  /**
   * 指定された大学に対し、約100件の試験定義を生成します。
   * (大学ID 1000件 × 各100件 = 合計10万件規模のデータ空間を想定)
   */
  async getExamsByUniversityId(universityId: number): Promise<Exam[]> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const faculties = [
      "文学部",
      "教育学部",
      "法学部",
      "経済学部",
      "理学部",
      "医学部",
      "歯学部",
      "薬学部",
      "工学部",
      "農学部",
    ];
    const departments = ["第一学科", "第二学科", "広域専攻", "先端コース"];
    const categories = [
      "前期日程",
      "後期日程",
      "全学統一入試",
      "共通テスト利用A方式",
      "共通テスト利用B方式",
      "特別選抜",
    ];

    // 各大学ごとに100件の試験を生成
    return Array.from({ length: 100 }, (_, i) => {
      const examId = universityId * 10000 + i; // 重複しないID生成
      const faculty = faculties[i % faculties.length];
      const dept =
        departments[Math.floor(i / faculties.length) % departments.length];
      const category = categories[i % categories.length];

      return {
        id: examId,
        universityId: universityId,
        name: `${faculty} ${dept} (${category})`,
        year: 2026 - (i % 10), // 直近10年分の過去問を想定
      };
    });
  }
}
