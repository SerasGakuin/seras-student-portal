// src/app/api/exam-result-form/route.ts

const DB_BASE_URL = process.env.EXAM_RESULT_DB_URL;
const API_KEY = process.env.EXAM_RESULT_DB_API_KEY;

/**
 * DBサーバーへの通信用ラッパー。
 */
async function _dbFetch(path: string, options?: RequestInit) {
  // 環境変数の末尾スラッシュの有無を考慮
  const baseUrl = DB_BASE_URL?.endsWith("/")
    ? DB_BASE_URL.slice(0, -1)
    : DB_BASE_URL;

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "x-api-key": API_KEY!,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

/**
 * データ取得（GET）
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  // 大学一覧
  if (type === "universities") {
    const res = await _dbFetch("/master/universities");
    return Response.json(await res.json(), { status: res.status });
  }

  // 試験定義（univId への同期を確認）
  if (type === "exams") {
    const univId =
      searchParams.get("univId") || searchParams.get("universityId");
    const res = await _dbFetch(`/master/exams?universityId=${univId}`);
    return Response.json(await res.json(), { status: res.status });
  }

  // 生徒の成績一覧（ExamResultView 構造が返る）
  if (type === "results") {
    const studentId = searchParams.get("studentId");
    const studentIdType = searchParams.get("studentIdType");

    const query = new URLSearchParams({
      studentId: studentId || "",
      studentIdType: studentIdType || "",
    });
    const res = await _dbFetch(`/student/results?${query.toString()}`);
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: "不正なリクエストです。" }, { status: 400 });
}

/**
 * データ登録（POST）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Express側の /student/result は totalScore や maxScore を期待している
    const res = await _dbFetch("/student/result", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(await res.json(), { status: res.status });
  } catch (error) {
    return Response.json(
      {
        error:"リクエスト処理中にエラーが発生しました" +(error as Error).message,
      },
      { status: 400 }
    );
  }
}

/**
 * データ削除（DELETE）
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get("recordId");
  const studentId = searchParams.get("studentId");
  const studentIdType = searchParams.get("studentIdType");

  if (!recordId) {
    return Response.json(
      { error: "recordIdが不足しています。" },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({
    studentId: studentId || "",
    studentIdType: studentIdType || "",
  });

  // Express側の DELETE /student/result/:recordId?studentId=... に対応
  const res = await _dbFetch(
    `/student/result/${recordId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );

  return Response.json(await res.json(), { status: res.status });
}
