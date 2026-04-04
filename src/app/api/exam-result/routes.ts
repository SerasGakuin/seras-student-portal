// src/app/api/exam-result-form/route.ts

/**
 * 過去問成績管理システムのバックエンド・プロキシ。
 * * 全てのリクエストにおいて、生徒の特定を「studentId」と「studentIdType」のペアで行う
 * 統一的なインターフェースを提供します。
 */

const DB_BASE_URL = process.env.EXAM_RESULT_DB_URL;
const API_KEY = process.env.EXAM_RESULT_DB_API_KEY;

/**
 * DBサーバーへの通信用ラッパー。
 */
function _dbFetch(path: string, options?: RequestInit) {
  return fetch(`${DB_BASE_URL}${path}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY!,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * データ取得（GET）
 * 大学・試験一覧のほか、特定の生徒（ID+Type指定）の成績一覧を取得します。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // 大学一覧
  if (type === 'universities') {
    const res = await _dbFetch('/master/universities');
    return Response.json(await res.json(), { status: res.status });
  }

  // 試験定義
  if (type === 'exams') {
    const universityId = searchParams.get('universityId');
    const res = await _dbFetch(`/master/exams?universityId=${universityId}`);
    return Response.json(await res.json(), { status: res.status });
  }

  // 生徒の成績一覧
  if (type === 'results') {
    const studentId = searchParams.get('studentId');
    const studentIdType = searchParams.get('studentIdType');
    
    // studentIdTypeを含めてDB側に問い合わせ
    const res = await _dbFetch(`/student/results?studentId=${studentId}&studentIdType=${studentIdType}`);
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: '不正なリクエストです。' }, { status: 400 });
}

/**
 * データ登録（POST）
 * ボディ内に studentId と studentIdType を含めて送信します。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // body内に { studentId, studentIdType, ... } が含まれていることを期待
    const res = await _dbFetch('/student/result', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return Response.json(await res.json(), { status: res.status });
  } catch (error) {
    return Response.json({ error: 'リクエスト処理中にエラーが発生しました:' + (error as Error).message }, { status: 400 });
  }
}

/**
 * データ削除（DELETE）
 * 削除対象のレコードIDに加え、操作主体の生徒を特定するための情報を付加します。
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');
  const studentId = searchParams.get('studentId');
  const studentIdType = searchParams.get('studentIdType');

  if (!recordId || !studentId || !studentIdType) {
    return Response.json({ error: '必要なパラメータ（recordId, studentId, studentIdType）が不足しています。' }, { status: 400 });
  }

  // 削除リクエストにも生徒特定情報を付与（権限チェックなどのため）
  const res = await _dbFetch(`/student/result/${recordId}?studentId=${studentId}&studentIdType=${studentIdType}`, {
    method: 'DELETE',
  });
  
  return Response.json(await res.json(), { status: res.status });
}