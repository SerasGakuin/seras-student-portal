
import { GET } from '@/app/api/occupancy/route';
import { POST } from '@/app/api/occupancy/status/route';
import { NextRequest } from 'next/server';
import { occupancyService } from '@/services/occupancyService';

// Mock Dependencies
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue(null)
}));

jest.mock('@/services/occupancyService', () => ({
    occupancyService: {
        getOccupancyData: jest.fn(),
        updateBuildingStatus: jest.fn()
    }
}));

// Mock studentService for authUtils lookup
jest.mock('@/services/studentService', () => ({
    getStudentFromLineId: jest.fn()
}));
import { getStudentFromLineId } from '@/services/studentService';
const mockGetStudentFromLineId = getStudentFromLineId as jest.Mock;

describe('Occupancy API Integration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup Service Mock defaults
        (occupancyService.getOccupancyData as jest.Mock).mockResolvedValue({
            building1: { count: 0, isOpen: true, members: [] },
            building2: { count: 0, isOpen: true, members: [] }
        });
        (occupancyService.updateBuildingStatus as jest.Mock).mockResolvedValue(undefined);
    });

    const createReq = (url: string, method: string = 'GET', body: unknown = null, lineUserId?: string) => {
        const headers = new Headers();
        if (lineUserId) headers.set('x-line-user-id', lineUserId);

        return new NextRequest(new URL(url, 'http://localhost'), {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
    };

    describe('GET /api/occupancy', () => {
        it('should return 200 for Guest (Public Access)', async () => {
            const req = createReq('/api/occupancy');
            const res = await GET(req);

            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.status).toBe('ok');
        });
    });

    describe('POST /api/occupancy/status', () => {
        const body = { building: '1', isOpen: false, actorName: 'Tester' };

        it('should return 403 for Guest', async () => {
            const req = createReq('/api/occupancy/status', 'POST', body);
            const res = await POST(req);
            expect(res.status).toBe(403);
        });

        it('should return 403 for Teacher (No Operate Permission)', async () => {
            // Mock Teacher
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 't1', name: 'Teacher', grade: '講師', status: '在塾(講師)'
            });

            const req = createReq('/api/occupancy/status', 'POST', body, 't1');
            const res = await POST(req);
            expect(res.status).toBe(403);
        });

        it('should return 200 for Principal', async () => {
            // Mock Principal
            mockGetStudentFromLineId.mockResolvedValue({
                lineId: 'p1', name: 'Boss', grade: '教室長', status: '教室長'
            });

            const req = createReq('/api/occupancy/status', 'POST', body, 'p1');
            const res = await POST(req);
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.data.success).toBe(true);
        });
    });
});
