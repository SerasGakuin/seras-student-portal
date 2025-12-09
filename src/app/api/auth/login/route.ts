import { NextResponse } from 'next/server';
import { getStudentFromLineId } from '@/lib/studentMaster';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { lineUserId } = body;

        if (!lineUserId) {
            return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
        }

        const student = await getStudentFromLineId(lineUserId);

        if (!student) {
            return NextResponse.json({ error: 'Student not found', registered: false }, { status: 404 });
        }

        return NextResponse.json({
            student,
            registered: true
        });

    } catch (error) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
