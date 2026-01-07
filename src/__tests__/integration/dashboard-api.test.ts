
import { GET as getStats } from '@/app/api/dashboard/stats/route';
import { GET as getDetail } from '@/app/api/dashboard/student-detail/route';
import { NextRequest } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

// Mock Auth logic dependencies
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue(null)
}));

// Mock StudentService for authUtils to lookup user
jest.mock('@/services/studentService', () => ({
    getStudentFromLineId: jest.fn()
}));

// Mock DashboardService to avoid DB calls
jest.mock('@/services/dashboardService');

import { getStudentFromLineId } from '@/services/studentService';
const mockGetStudentFromLineId = getStudentFromLineId as jest.Mock;

describe('Dashboard API Integration', () => {
    let mockGetDashboardStats: jest.Mock;
    let mockGetStudentDetails: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetDashboardStats = jest.fn().mockResolvedValue({ totalDuration: 100 });
        mockGetStudentDetails = jest.fn().mockResolvedValue({ history: [] });

        (DashboardService as jest.Mock).mockImplementation(() => ({
            getDashboardStats: mockGetDashboardStats,
            getStudentDetails: mockGetStudentDetails
        }));
    });

    const createReq = (url: string, lineUserId?: string) => {
        const headers = new Headers();
        if (lineUserId) headers.set('x-line-user-id', lineUserId);
        return new NextRequest(new URL(url, 'http://localhost'), { headers });
    };

    describe('GET /api/dashboard/stats', () => {
        it('should return 401 for Guest', async () => {
            const req = createReq('/api/dashboard/stats');
            const res = await getStats(req);
            expect(res.status).toBe(401);
        });

        it('should return 403 for Student (No Dashboard Permission)', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'student_id', name: 'Student', grade: '中3', status: '在塾'
            });

            const req = createReq('/api/dashboard/stats', 'student_id');
            const res = await getStats(req);

            // Student is authenticated but does not have canViewDashboard permission
            expect(res.status).toBe(403);
        });

        it('should return 200 for Teacher', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'teacher_id', name: 'Teacher', grade: '講師', status: '在塾(講師)'
            });

            const req = createReq('/api/dashboard/stats', 'teacher_id');
            const res = await getStats(req);

            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.status).toBe('ok');
        });
    });

    describe('GET /api/dashboard/student-detail', () => {
        it('should return 401 for Guest', async () => {
            const req = createReq('/api/dashboard/student-detail?name=Test');
            const res = await getDetail(req);
            expect(res.status).toBe(401);
        });

        it('should return 200 for Student viewing themselves', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 's1', name: 'MyName', grade: '中3', status: '在塾'
            });

            const req = createReq('/api/dashboard/student-detail?name=MyName', 's1');
            const res = await getDetail(req);

            expect(res.status).toBe(200);
        });

        it('should return 403 for Student viewing others', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 's1', name: 'MyName', grade: '中3', status: '在塾'
            });

            const req = createReq('/api/dashboard/student-detail?name=OtherName', 's1');
            const res = await getDetail(req);

            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.message).toContain('Forbidden');
        });

        it('should return 200 for Teacher viewing anyone', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 't1', name: 'Teacher', grade: '講師', status: '在塾(講師)'
            });

            const req = createReq('/api/dashboard/student-detail?name=OtherName', 't1');
            const res = await getDetail(req);

            expect(res.status).toBe(200);
        });
    });
});
