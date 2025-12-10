import { NextResponse } from 'next/server';
import { loginStudent } from '@/services/authService';
import { ApiResponse } from '@/types';

export async function POST(request: Request) {
    try {
        // Zod validation for login could actally go here if we defined LoginRequestSchema
        // For now, minimal refactor
        const { lineUserId } = await request.json();

        if (!lineUserId) {
            return NextResponse.json<ApiResponse>(
                { status: 'error', message: 'Missing lineUserId' },
                { status: 400 }
            );
        }

        const student = await loginStudent(lineUserId);

        return NextResponse.json<ApiResponse>({
            status: 'ok',
            data: {
                student: student, // Returns full Student object or null
            },
        });
    } catch (error: unknown) {
        console.error('Error in login API:', error);
        return NextResponse.json<ApiResponse>(
            { status: 'error', message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
