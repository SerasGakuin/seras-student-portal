import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';
import { authenticateRequest } from '@/lib/authUtils';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (!auth.isAuthenticated) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Unauthorized'
            }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const name = searchParams.get('name');
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 28;

        if (!name) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Name is required'
            }, { status: 400 });
        }

        // Access Control: Self or Teacher
        const isSelf = auth.user?.name === name;
        const isTeacher = auth.permissions.canViewDashboard; // Teachers have dashboard access

        if (!isSelf && !isTeacher) {
            return NextResponse.json<ApiResponse>({
                status: 'error',
                message: 'Forbidden: You can only view your own stats'
            }, { status: 403 });
        }

        const dashboardService = new DashboardService();
        const details = await dashboardService.getStudentDetails(name, days);

        return NextResponse.json<ApiResponse>({
            status: 'ok',
            data: details
        });
    } catch (e) {
        console.error('Failed to fetch student details', e);
        return NextResponse.json<ApiResponse>({
            status: 'error',
            message: 'Internal Server Error'
        }, { status: 500 });
    }
}
