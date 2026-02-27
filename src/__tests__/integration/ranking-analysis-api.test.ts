import { GET } from '@/app/api/analysis/ranking/route';
import { NextRequest } from 'next/server';

// Mock Auth logic dependencies (analysis-api.test.ts と同パターン)
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue(null),
}));

jest.mock('next-auth', () => ({
    getServerSession: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/authConfig', () => ({
    authOptions: {},
    isEmailAllowed: jest.fn().mockReturnValue(false),
}));

jest.mock('@/services/studentService', () => ({
    getStudentFromLineId: jest.fn(),
}));

// Mock rankingAnalysisService to avoid Google Sheets calls
jest.mock('@/services/rankingAnalysisService', () => ({
    getMonthlyRanking: jest.fn().mockResolvedValue({
        month: '2026-01',
        monthLabel: '2026年01月',
        examGroup: { label: '受験生の部', students: [], totalStudents: 0 },
        generalGroup: { label: '高2以下の部', students: [], totalStudents: 0 },
        topN: 5,
        generatedAt: '2026-02-27T00:00:00.000Z',
    }),
}));

import { getStudentFromLineId } from '@/services/studentService';
import { getServerSession } from 'next-auth';
import { isEmailAllowed } from '@/lib/authConfig';

const mockGetStudentFromLineId = getStudentFromLineId as jest.Mock;
const mockGetServerSession = getServerSession as jest.Mock;
const mockIsEmailAllowed = isEmailAllowed as jest.Mock;

describe('Analysis Ranking API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createReq = (url: string, lineUserId?: string) => {
        const headers = new Headers();
        if (lineUserId) headers.set('x-line-user-id', lineUserId);
        return new NextRequest(new URL(url, 'http://localhost'), { headers });
    };

    const BASE_URL = '/api/analysis/ranking?month=2026-01';

    describe('Permission checks', () => {
        it('should return 401 for Guest (no auth)', async () => {
            const req = createReq(BASE_URL);
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it('should return 403 for Student (no canViewDashboard)', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'student_id',
                name: 'Student',
                grade: '中3',
                status: '在塾',
            });

            const req = createReq(BASE_URL, 'student_id');
            const res = await GET(req);
            expect(res.status).toBe(403);
        });

        it('should return 200 for Teacher (LINE auth)', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'teacher_id',
                name: 'Teacher',
                grade: '講師',
                status: '在塾(講師)',
            });

            const req = createReq(BASE_URL, 'teacher_id');
            const res = await GET(req);
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.status).toBe('ok');
            expect(json.data).toHaveProperty('month');
            expect(json.data).toHaveProperty('examGroup');
            expect(json.data).toHaveProperty('generalGroup');
        });

        it('should return 200 for Principal (LINE auth)', async () => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'principal_id',
                name: 'Principal',
                grade: '教室長',
                status: '教室長',
            });

            const req = createReq(BASE_URL, 'principal_id');
            const res = await GET(req);
            expect(res.status).toBe(200);
        });

        it('should return 200 for Google Auth Teacher', async () => {
            mockGetServerSession.mockResolvedValue({
                user: { email: 'teacher@serasgakuin.com' },
            });
            mockIsEmailAllowed.mockReturnValue(true);

            const req = createReq(BASE_URL);
            const res = await GET(req);
            expect(res.status).toBe(200);

            // cleanup
            mockIsEmailAllowed.mockReturnValue(false);
        });
    });

    describe('Parameter validation', () => {
        beforeEach(() => {
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'teacher_id',
                name: 'Teacher',
                grade: '講師',
                status: '在塾(講師)',
            });
        });

        it('should return 400 when month parameter is missing', async () => {
            const req = createReq('/api/analysis/ranking', 'teacher_id');
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid month format', async () => {
            const req = createReq('/api/analysis/ranking?month=2026-1', 'teacher_id');
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('should return 400 for topN out of range', async () => {
            const req = createReq('/api/analysis/ranking?month=2026-01&topN=0', 'teacher_id');
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('should default topN to 5 when not specified', async () => {
            const req = createReq(BASE_URL, 'teacher_id');
            const res = await GET(req);
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.data.topN).toBe(5);
        });
    });
});
