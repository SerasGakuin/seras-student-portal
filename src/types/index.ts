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

export type Grade = '中1' | '中2' | '中3' | '高1' | '高2' | '高3' | '既卒' | '講師';
export type StudentStatus = '在塾' | '体験' | '退塾' | '休塾' | '在塾(講師)' | '退塾(講師)' | '教室長';

export interface Student {
    lineId: string;
    name: string;
    grade: Grade;
    status: StudentStatus;
}
