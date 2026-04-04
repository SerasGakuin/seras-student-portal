// src/app/api/exam-result-form/route.ts

/**
 * 過去問成績管理システムのバックエンド・プロキシ（薄いラッパー）。
 * * フロントエンド（ブラウザ）から秘匿すべきAPIキー（EXAM_RESULT_DB_API_KEY）や
 * 通信先URL（EXAM_RESULT_DB_URL）をサーバーサイドに隠蔽し、
 * ローカルサーバーとの安全な通信を中継します。
 */

const DB_BASE_URL = process.env.EXAM_RESULT_DB_URL;
const API_KEY = process.env.EXAM_RESULT_DB_API_KEY;

/**
 * ローカルサーバー（DB側）への共通フェッチ関数。
 * 全てのリクエストに共通の認証ヘッダーを自動付与します。
 * * @param path エンドポイントのパス
 * @param options 標準のRequestInitオプション
 */
function _dbFetch(path: string, options?: RequestInit) {
  return fetch(`${DB_BASE_URL}${path}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY!, // 環境変数から取得したAPIキーを秘匿送信
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * 各種データの取得リクエスト（GET）を処理します。
 * `type` パラメータによって、大学一覧、試験一覧、または生徒の成績一覧を切り替えます。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // 大学マスターデータの取得
  if (type === 'universities') {
    const res = await _dbFetch('/master/universities');
    return Response.json(await res.json(), { status: res.status });
  }

  // 特定大学に紐づく試験定義の取得
  if (type === 'exams') {
    const universityId = searchParams.get('universityId'); // キャメルケースで受け取り
    const res = await _dbFetch(`/master/exams?universityId=${universityId}`); // DB側もキャメルケースへ
    return Response.json(await res.json(), { status: res.status });
  }

  // 指定された生徒の成績実績の一覧取得
  if (type === 'results') {
    const studentId = searchParams.get('studentId'); // キャメルケース
    const studentIdType = searchParams.get('studentIdType'); // キャメルケース
    const res = await _dbFetch(`/student/results?studentId=${studentId}&studentIdType=${studentIdType}`);
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: '不正なリクエストです（typeパラメータが正しくありません）。' }, { status: 400 });
}

/**
 * 新しい成績データの登録リクエスト（POST）を処理します。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json(); // フロントから送られてくるBodyもキャメルケース想定
    const res = await _dbFetch('/student/result', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return Response.json(await res.json(), { status: res.status });
  } catch (error) {
    return Response.json({ error: 'リクエストボディの解析に失敗しました。' }, { status: 400 });
  }
}

/**
 * 成績データの削除リクエスト（DELETE）を処理します。
 * クエリパラメータ `recordId` で削除対象のレコードを一意に特定します。
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId'); // キャメルケース

  if (!recordId) {
    return Response.json({ error: '削除対象のrecordIdが指定されていません。' }, { status: 400 });
  }

  // DB側のパスも /student/result/{recordId} とキャメルケースで指定される想定
  const res = await _dbFetch(`/student/result/${recordId}`, {
    method: 'DELETE',
  });
  
  return Response.json(await res.json(), { status: res.status });
}