import { Student, StudentProfile } from '@/types';

/**
 * Resolves the display name for a user.
 * Priority: Student Name > LINE Profile Name > 'ゲスト'
 */
export const getDisplayName = (student: Student | null, profile: StudentProfile | null): string => {
    if (student?.name) return student.name;
    if (profile?.displayName) return profile.displayName;
    return 'ゲスト';
};
