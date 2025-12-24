import { ApiResponse, Student, OccupancyData } from '@/types';
import { UnifiedWeeklyBadges } from '@/services/badgeService';
import { BookingRequest, RestDayRequest } from '@/lib/schema';
import { CONFIG } from '@/lib/config';

// Helper to handle fetch responses typesafely
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const data = (await res.json()) as ApiResponse<T>;

    if (data.status === 'error') {
        throw new Error(data.message || 'API Error');
    }

    if (!res.ok) {
        throw new Error(data.message || `HTTP Error ${res.status}`);
    }

    return data.data as T;
}

/**
 * 認証付きリクエストを行うためのヘルパー
 * Google Auth (Cookie) と LINE Auth (Header) の両方をサポート
 */
export async function fetchWithAuth<T>(url: string, lineUserId?: string | null, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
        // 'Content-Type': 'application/json', // Removed to avoid forcing preflight on simple GETs
        ...((options?.headers as Record<string, string>) || {}),
    };

    if (lineUserId) {
        headers['x-line-user-id'] = lineUserId;
    }

    return fetchJson<T>(url, {
        ...options,
        credentials: 'include', // Cookie送信 (Google Auth用)
        headers,
    });
}

export const api = {
    auth: {
        login: async (lineUserId: string): Promise<{ student: Student | null }> => {
            return fetchJson<{ student: Student | null }>('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineUserId }),
            });
        },
    },
    booking: {
        reserveMeeting: async (data: BookingRequest) => {
            return fetchJson('/api/reserveMeeting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        },
        registerRestDay: async (data: RestDayRequest) => {
            return fetchJson('/api/registerRestDay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        },
    },
    occupancy: {
        get: async (lineUserId?: string): Promise<OccupancyData> => {
            return fetchWithAuth(CONFIG.API.OCCUPANCY, lineUserId, {
                cache: 'no-store'
            });
        },
        setStatus: (lineUserId: string | null | undefined, building: '1' | '2', isOpen: boolean, actorName: string) =>
            fetchWithAuth(
                '/api/occupancy/status',
                lineUserId,
                {
                    method: 'POST',
                    body: JSON.stringify({ building, isOpen, actorName }),
                }
            ),
    },
    ranking: {
        get: async (lineUserId?: string) => {
            return fetchWithAuth<UnifiedWeeklyBadges>('/api/ranking', lineUserId);
        }
    },
    dashboard: {
        getStudentDetail: async (lineUserId: string | null | undefined, name: string, days: number = 28) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return fetchWithAuth<any>( // Type definition is complex, using any for now or define StudentDetailResponse
                `/api/dashboard/student-detail?name=${encodeURIComponent(name)}&days=${days}`,
                lineUserId
            );
        }
    },
};
