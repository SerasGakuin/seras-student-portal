// src/repositories/local/LocalStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from '../interfaces/IStudentPastExamResultRepository';

/** 生徒IDの種別。生徒マスタースプレッドシートで管理している一意なIDを示します。 */
const STUDENT_ID_TYPE = 'student_master_id';

/**
 * ローカルサーバー（seras-local-server-portal）経由で
 * 過去問データベースにアクセスするリポジトリの実装です。
 */
export class LocalStudentPastExamResultRepository implements IStudentPastExamResultRepository {

  /** ローカルサーバーのベースURL */
  private readonly baseUrl: string;
  /** APIキー */
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.LOCAL_PORTAL_URL ?? '';
    this.apiKey = process.env.LOCAL_PORTAL_API_KEY ?? '';
  }

  /**
   * ローカルサーバーへのHTTPリクエストを共通処理します。
   * 認証ヘッダーの付与と、エラーレスポンスの検出を行います。
   * @param path リクエスト先のパス
   * @param options fetchのオプション
   */
  private async request(path: string, options?: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`[LocalStudentPastExamResultRepository] ${res.status} ${path}`);
    return res.json();
  }

  /**
   * 指定した生徒の過去問結果をすべて取得します。
   * @param studentId 対象生徒の内部ID（studentsテーブルのid）
   */
  async findByStudentId(studentId: number): Promise<PastExamResult[]> {
    const data = await this.request(
      `/past-exam-result-db/student/results?student_id=${studentId}&student_id_type=${STUDENT_ID_TYPE}`
    ) as { results: PastExamResult[] };
    return data.results;
  }

  /**
   * 指定した生徒の過去問結果を新規追加します。
   * @param studentId 対象生徒の内部ID（studentsテーブルのid）
   * @param data 追加する成績データ
   */
  async add(studentId: number, data: PastExamResultInput): Promise<void> {
    await this.request('/past-exam-result-db/student/result', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        student_id_type: STUDENT_ID_TYPE,
        exam_id: data.examId,
        total_score: data.totalScore ?? null,
      }),
    });
  }

  /**
   * 指定した生徒の特定の過去問結果を削除します。
   * サーバー側のエンドポイントが実装され次第、対応予定です。
   * @param _studentId 対象生徒の内部ID（studentsテーブルのid）
   * @param _recordId 削除対象のレコードID（resultsテーブルのid）
   */
  async delete(_studentId: number, _recordId: number): Promise<void> {
    throw new Error('未実装です。サーバー側のエンドポイントが実装され次第、対応します。');
  }
}