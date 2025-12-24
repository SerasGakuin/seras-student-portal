
import { useLiff } from '@/lib/liff';
import { CONFIG } from '@/lib/config';

export type UserRole = 'student' | 'teacher' | 'principal' | 'guest';

export const useRole = () => {
    const { student, isLoggedIn, isLoading } = useLiff();

    if (isLoading) {
        return { role: 'guest' as UserRole, canViewDashboard: false, isLoading: true };
    }

    if (!isLoggedIn || !student) {
        return { role: 'guest' as UserRole, canViewDashboard: false, isLoading: false };
    }

    // Determine Role (Legacy logic for compatibility, optionally refactor later)
    const isPrincipal = student.status === '教室長';
    const isTeacher = student.grade === '講師' || student.status.includes('講師');

    let role: UserRole = 'student';
    if (isPrincipal) role = 'principal';
    else if (isTeacher) role = 'teacher';

    // Determine Permissions from CONFIG (Single Source of Truth)
    // Cast to string[] safely as we know the config structure
    const allowedStatuses = CONFIG.PERMISSIONS.VIEW_DASHBOARD as readonly string[];
    const canViewDashboard = allowedStatuses.includes(student.status);

    return {
        role,
        canViewDashboard,
        isLoading: false
    };
};
