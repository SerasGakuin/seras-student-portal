// src/app/api/exam-result-form/route.ts

/**
 * ローカルサーバーと通信するための薄いラッパー。
 */

const DB_BASE_URL = process.env.EXAM_RESULT_DB_URL;
const API_KEY = process.env.EXAM_RESULT_DB_API_KEY;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'universities') {
    const res = await _dbFetch('/master/universities');
    return Response.json(await res.json(), { status: res.status });
  }

  if (type === 'exams') {
    const univ_id = searchParams.get('univ_id');
    const res = await _dbFetch(`/master/exams?univ_id=${univ_id}`);
    return Response.json(await res.json(), { status: res.status });
  }

  if (type === 'results') {
    const student_id = searchParams.get('student_id');
    const student_id_type = searchParams.get('student_id_type');
    const res = await _dbFetch(`/student/results?student_id=${student_id}&student_id_type=${student_id_type}`);
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: '不正なリクエストです。' }, { status: 400 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const res = await _dbFetch('/student/result', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Response.json(await res.json(), { status: res.status });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const res = await _dbFetch(`/student/result/${id}`, {
    method: 'DELETE',
  });
  return Response.json(await res.json(), { status: res.status });
}