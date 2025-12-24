
import { useLiff } from '@/lib/liff';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { CONFIG } from '@/lib/config';

export type UserRole = 'student' | 'teacher' | 'principal' | 'guest';

export interface RoleInfo {
    role: UserRole;
    canViewDashboard: boolean;
    isLoading: boolean;
    displayName: string | null;
    authMethod: 'line' | 'google' | null;
}

/**
 * ハイブリッド認証フック
 * LINE認証とGoogle認証の両方をサポート
 * 
 * - LINE認証: 生徒・講師・教室長を識別
 * - Google認証: 許可されたメールアドレスは「講師」として扱う
 */
export const useRole = (): RoleInfo => {
    const { student, isLoggedIn: isLineLoggedIn, isLoading: isLineLoading } = useLiff();
    const { isAuthenticated: isGoogleAuthenticated, isLoading: isGoogleLoading } = useGoogleAuth();

    // どちらかが読み込み中ならローディング状態
    if (isLineLoading || isGoogleLoading) {
        return {
            role: 'guest',
            canViewDashboard: false,
            isLoading: true,
            displayName: null,
            authMethod: null
        };
    }

    // Google認証済み → 講師として扱う
    if (isGoogleAuthenticated) {
        return {
            role: 'teacher',
            canViewDashboard: true,
            isLoading: false,
            displayName: 'Seras学院',
            authMethod: 'google'
        };
    }

    // LINE認証済み
    if (isLineLoggedIn && student) {
        const isPrincipal = student.status === '教室長';
        const isTeacher = student.grade === '講師' || student.status.includes('講師');

        let role: UserRole = 'student';
        if (isPrincipal) role = 'principal';
        else if (isTeacher) role = 'teacher';

        const allowedStatuses = CONFIG.PERMISSIONS.VIEW_DASHBOARD as readonly string[];
        const canViewDashboard = allowedStatuses.includes(student.status);

        return {
            role,
            canViewDashboard,
            isLoading: false,
            displayName: student.name,
            authMethod: 'line'
        };
    }

    // 未認証
    return {
        role: 'guest',
        canViewDashboard: false,
        isLoading: false,
        displayName: null,
        authMethod: null
    };
};
