import { NextResponse } from 'next/server';
import { getStudentNameFromLineId } from '@/lib/studentMaster';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ status: 'error', message: 'userId is required' }, { status: 400 });
        }

        const name = await getStudentNameFromLineId(userId);

        if (name) {
            return NextResponse.json({ status: 'ok', data: { name } });
        } else {
            return NextResponse.json({ status: 'error', message: 'Student not found' }, { status: 404 });
        }
    } catch (error: any) {
        console.error('Error in test API:', error);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
