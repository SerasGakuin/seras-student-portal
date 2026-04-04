// src/repositories/local/LocalPastExamMasterRepository.ts

import {
  IPastExamMasterRepository,
  University,
  ExamSummary,
} from "../interfaces/IPastExamMasterRepository";

/**
 * 過去問に関連するマスターデータを取得するリポジトリのローカル実装です。
 * * 本クラスは Vercel API Routes (`/api/exam-result-form`) をプロキシとして利用し、
 * 実際にはローカルサーバー内に存在するマスターデータ（大学情報・試験定義）を取得します。
 * * 直接外部DBやAPIキーをフロントエンドで扱わず、サーバーサイドの route.ts を介することで、
 * セキュリティを担保しながらマスターデータの提供を行います。
 */
export class LocalPastExamMasterRepository implements IPastExamMasterRepository {
  /**
   * 共通のAPIエンドポイント。
   * クエリパラメータ `type` によって、取得するマスターデータの種類を分岐させます。
   */
  private readonly apiPath = "/api/exam-result-form";

  /**
   * システムに登録されている全ての大学一覧を取得します。
   * * @returns 大学情報の配列。取得に失敗した場合は Error をスローします。
   */
  async getUniversities(): Promise<University[]> {
    // API Route 側で `type === 'universities'` の分岐を呼び出すためのパラメータ設定
    const params = new URLSearchParams({ type: "universities" });

    const res = await fetch(`${this.apiPath}?${params.toString()}`);

    if (!res.ok) {
      // ネットワークエラーや 4xx/5xx ステータスの場合の例外処理
      throw new Error(`大学一覧の取得に失敗しました (Status: ${res.status})`);
    }

    // JSONデシリアライズ。University 型の配列として返却します。
    return (await res.json()) as University[];
  }

  /**
   * 指定された大学IDに紐づく、具体的な試験（入試）の一覧を取得します。
   * * @param universityId 大学を識別する内部ID（univ_id）
   * @returns 該当する大学の試験定義の配列。
   */
  async getExamsByUniversityId(universityId: number): Promise<ExamSummary[]> {
    /**
     * API Route 側が期待するパラメータ:
     * - type: リクエストの種類 ('exams')
     * - univ_id: フィルタリング対象の大学ID
     */
    const params = new URLSearchParams({
      type: "exams",
      univId: universityId.toString(),
    });

    const res = await fetch(`${this.apiPath}?${params.toString()}`);

    if (!res.ok) {
      throw new Error(
        `大学ID ${universityId} に紐づく試験一覧の取得に失敗しました (Status: ${res.status})`,
      );
    }

    // 取得したJSONを Exam 型の配列としてキャストして返却
    return (await res.json()) as ExamSummary[];
  }
}
