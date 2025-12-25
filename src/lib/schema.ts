import { z } from 'zod';

// Config constants for validation
// We can import these from generic config later, but defining here for schema completeness
const TIME_PATTERN = /^T\d{2}:\d{2}:\d{2}$/; // e.g., T14:00:00

export const GradeSchema = z.enum([
    '中1', '中2', '中3',
    '高1', '高2', '高3',
    '既卒', '講師'
]);

export const StudentStatusSchema = z.enum([
    '在塾', '体験', '退塾', '休塾',
    '在塾(講師)', '退塾(講師)', '教室長'
]);

export const StudentSchema = z.object({
    lineId: z.string().min(1),
    name: z.string().min(1),
    grade: GradeSchema,
    status: StudentStatusSchema,
    docLink: z.string().url().optional().or(z.literal('')),
    sheetLink: z.string().url().optional().or(z.literal('')),
});

export const BookingRequestSchema = z.object({
    userId: z.string().min(1),
    meetingType: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    arrivalTime: z.string().regex(TIME_PATTERN, 'Invalid time format'),
    leaveTime: z.string().regex(TIME_PATTERN, 'Invalid time format'),
});

export const RestDayRequestSchema = z.object({
    userId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// Export inferred types if needed to replace manual interfaces later
export type Grade = z.infer<typeof GradeSchema>;
export type StudentStatus = z.infer<typeof StudentStatusSchema>;
export type Student = z.infer<typeof StudentSchema>;
export type BookingRequest = z.infer<typeof BookingRequestSchema>;
export type RestDayRequest = z.infer<typeof RestDayRequestSchema>;
