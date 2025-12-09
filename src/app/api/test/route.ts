import { NextResponse } from 'next/server';
import { getStudentFromLineId } from '@/lib/studentMaster';
import { ApiResponse } from '@/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const student = await getStudentFromLineId(userId);
        const name = student?.name;

        if (name) {
            return NextResponse.json<ApiResponse>({ status: 'ok', data: { name } });
        } else {
            return NextResponse.json<ApiResponse>({ status: 'error', message: 'Student not found' }, { status: 404 });
        }
    } catch (error: unknown) {
        console.error('Error in test API:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json<ApiResponse>({ status: 'error', message }, { status: 500 });
    }
}
