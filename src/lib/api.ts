import { ApiResponse, Student, OccupancyData } from '@/types';
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
            const headers: HeadersInit = {};
            if (lineUserId) {
                headers['x-line-user-id'] = lineUserId;
            }
            return fetchJson(CONFIG.API.OCCUPANCY, {
                cache: 'no-store',
                headers,
            });
        },
        setStatus: (building: '1' | '2', isOpen: boolean, actorName: string) => fetchJson(
            '/api/occupancy/status',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ building, isOpen, actorName }),
            }
        ),
    },
};
