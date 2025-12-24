
/**
 * @jest-environment node
 */
import { GET } from '@/app/api/ranking/route';
import { NextRequest } from 'next/server';

// Mock next-auth to avoid "headers outside request scope" error
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue(null)
}));

// Mock dependencies
jest.mock('@/services/studentService', () => ({
    getStudentFromLineId: jest.fn(async (lineId: string) => {
        if (lineId === 'TEACHER_ID') {
            return {
                lineId: 'TEACHER_ID',
                name: 'Teacher',
                grade: '講師',
                status: '在塾(講師)'
            };
        }
        if (lineId === 'STUDENT_ID') {
            return {
                lineId: 'STUDENT_ID',
                name: 'Student',
                grade: '高3',
                status: '在塾'
            };
        }
        return null;
    }),
    getPrincipal: jest.fn()
}));

// Mock BadgeService to capture calls and avoid DB access
jest.mock('@/services/badgeService', () => {
    return {
        BadgeService: jest.fn().mockImplementation(() => ({
            getWeeklyBadges: jest.fn().mockResolvedValue({
                exam: {
                    'Student A': [{ type: 'HEAVY_USER', rank: 1 }]
                },
                general: {},
                timestamp: '2025-12-25T00:00:00Z',
                examRankings: [],
                generalRankings: [],
                totalExamStudents: 10,
                totalGeneralStudents: 5
            })
        }))
    };
});

describe('Ranking API Integration Test', () => {

    it('should return 401 Unauthorized for guest (no headers)', async () => {
        const req = new NextRequest('http://localhost:3000/api/ranking');
        const res = await GET(req);

        expect(res.status).toBe(401);
    });

    it('should return 200 OK and wrapped ApiResponse for Teacher', async () => {
        const req = new NextRequest('http://localhost:3000/api/ranking', {
            headers: {
                'x-line-user-id': 'TEACHER_ID'
            }
        });
        const res = await GET(req);

        expect(res.status).toBe(200);

        const json = await res.json();

        // Verify Wrapper Structure (The fix we made)
        expect(json).toHaveProperty('status', 'ok');
        expect(json).toHaveProperty('data');
        expect(json.data).toHaveProperty('exam');
        expect(json.data).toHaveProperty('general');
    });

    it('should return 200 OK for Student', async () => {
        const req = new NextRequest('http://localhost:3000/api/ranking', {
            headers: {
                'x-line-user-id': 'STUDENT_ID'
            }
        });
        const res = await GET(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe('ok');
    });

    it('should return 401 for unknown LINE ID', async () => {
        const req = new NextRequest('http://localhost:3000/api/ranking', {
            headers: {
                'x-line-user-id': 'UNKNOWN_ID'
            }
        });
        const res = await GET(req);

        expect(res.status).toBe(401);
    });
});
