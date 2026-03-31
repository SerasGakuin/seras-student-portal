// src/repositories/local/LocalStudentPastExamResultRepository.ts

import {
  IStudentPastExamResultRepository,
  PastExamResult,
  PastExamResultInput,
} from '../interfaces/IStudentPastExamResultRepository';

export class LocalStudentPastExamResultRepository implements IStudentPastExamResultRepository {

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.LOCAL_PORTAL_URL ?? '';
    this.apiKey = process.env.LOCAL_PORTAL_API_KEY ?? '';
  }

  private async request(path: string, options?: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`[StudentPastExamResultRepository] ${res.status} ${path}`);
    return res.json();
  }

  async findByStudentId(studentId: number): Promise<PastExamResult[]> {
    const data = await this.request(
      `/past-exam-result-db/student/results?student_id=${studentId}&student_id_type=student_master_id`
    ) as { results: PastExamResult[] };
    return data.results;
  }

  async add(studentId: number, data: PastExamResultInput): Promise<void> {
    await this.request('/past-exam-result-db/student/result', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        student_id_type: 'student_master_id',
        exam_id: data.examId,
        total_score: data.totalScore ?? null,
      }),
    });
  }

  async delete(_studentId: number, _recordId: number): Promise<void> {
    throw new Error('未実装です。サーバー側のエンドポイントが実装され次第、対応します。');
  }
}