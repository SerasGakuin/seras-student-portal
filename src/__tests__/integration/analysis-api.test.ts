import { GET } from '@/app/api/analysis/occupancy/route';
import { NextRequest } from 'next/server';

// Mock Auth logic dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockResolvedValue(null),
}));

// next-auth も mock（authUtils が import { getServerSession } from 'next-auth' を使うため）
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

// Mock analysisService to avoid Google Sheets calls
jest.mock('@/services/analysisService', () => ({
  getOccupancyAnalysis: jest.fn().mockResolvedValue({
    heatmap: { matrix: [], weekdayLabels: [], hourLabels: [], maxValue: 0 },
    trends: { weekdayMean: [], weekendMean: [] },
    breakdown: [],
    period: { from: '2026-01-01', to: '2026-01-31' },
    totalDays: 0,
  }),
}));

import { getStudentFromLineId } from '@/services/studentService';
import { getServerSession } from 'next-auth';
import { isEmailAllowed } from '@/lib/authConfig';

const mockGetStudentFromLineId = getStudentFromLineId as jest.Mock;
const mockGetServerSession = getServerSession as jest.Mock;
const mockIsEmailAllowed = isEmailAllowed as jest.Mock;

describe('Analysis Occupancy API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createReq = (url: string, lineUserId?: string) => {
    const headers = new Headers();
    if (lineUserId) headers.set('x-line-user-id', lineUserId);
    return new NextRequest(new URL(url, 'http://localhost'), { headers });
  };

  const BASE_URL = '/api/analysis/occupancy?from=2026-01-01&to=2026-01-31';

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
      expect(json.data).toHaveProperty('heatmap');
      expect(json.data).toHaveProperty('trends');
      expect(json.data).toHaveProperty('breakdown');
      expect(json.data).toHaveProperty('period');
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
    it('should return 400 when from parameter is missing', async () => {
      mockGetStudentFromLineId.mockResolvedValue({
        lineId: 'teacher_id',
        name: 'Teacher',
        grade: '講師',
        status: '在塾(講師)',
      });

      const req = createReq('/api/analysis/occupancy?to=2026-01-31', 'teacher_id');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('should return 400 when to parameter is missing', async () => {
      mockGetStudentFromLineId.mockResolvedValue({
        lineId: 'teacher_id',
        name: 'Teacher',
        grade: '講師',
        status: '在塾(講師)',
      });

      const req = createReq('/api/analysis/occupancy?from=2026-01-01', 'teacher_id');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid date format', async () => {
      mockGetStudentFromLineId.mockResolvedValue({
        lineId: 'teacher_id',
        name: 'Teacher',
        grade: '講師',
        status: '在塾(講師)',
      });

      const req = createReq('/api/analysis/occupancy?from=invalid&to=2026-01-31', 'teacher_id');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });
});
