export interface ApiResponse<T = unknown> {
    status: 'ok' | 'error';
    data?: T;
    message?: string;
}

export interface OccupancyData {
    building1: number;
    building2: number;
    timestamp: string;
}

export interface StudentProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

export interface BookingRequest {
    userId: string;
    meetingType: string;
    date: string;
    arrivalTime: string;
    leaveTime: string;
}

export interface RestDayRequest {
    userId: string;
    date: string;
}

export interface Student {
    lineId: string;
    name: string;
}
