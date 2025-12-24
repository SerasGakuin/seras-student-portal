import { getServerSession } from 'next-auth';
import { authOptions, isEmailAllowed } from '@/lib/authConfig';
import { loginStudent } from '@/services/authService';
import { CONFIG } from '@/lib/config';

export type UserRole = 'student' | 'teacher' | 'principal' | 'guest';

export interface AuthUser {
    id: string; // LINE User ID or Email
    name: string;
    role: UserRole;
    status: string;
    authMethod: 'line' | 'google';
}

export interface AuthPermissions {
    canViewDashboard: boolean;
    canViewOccupancyMembers: boolean;
    canOperateBuildingStatus: boolean;
}

export interface AuthResult {
    isAuthenticated: boolean;
    user: AuthUser | null;
    permissions: AuthPermissions;
    error?: string;
}

/**
 * サーバーサイド認証ユーティリティ
 * APIルートでの認証と権限チェックを一元管理します。
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
    const defaultPermissions: AuthPermissions = {
        canViewDashboard: false,
        canViewOccupancyMembers: false,
        canOperateBuildingStatus: false,
    };

    try {
        // 1. Check Google OAuth (NextAuth Session)
        const session = await getServerSession(authOptions);

        // DEBUG LOG
        // console.log('[Auth] Session:', session ? 'Found' : 'Null', session?.user?.email);

        if (session?.user?.email && isEmailAllowed(session.user.email)) {
            console.log(`[Auth] Google User Authenticated: ${session.user.email}`);
            // Google認証ユーザーは「講師」とみなす (CONFIGで拡張可能だが現状はハードコードに近い扱い)
            // ※ 将来的にはGoogleユーザー用のDBレコードを作るかもしれないが、現在は簡易実装
            return {
                isAuthenticated: true,
                user: {
                    id: session.user.email,
                    name: 'Seras学院', // 固定表示名
                    role: 'teacher',
                    status: '詳細不明(Google)', // ステータス文字列としてはプレースホルダー
                    authMethod: 'google',
                },
                permissions: {
                    canViewDashboard: true, // Google認証ユーザーはダッシュボード閲覧可
                    canViewOccupancyMembers: true, // 生徒リストも見れる
                    canOperateBuildingStatus: false, // 開閉操作は不可（教室長のみ）
                },
            };
        } else if (session?.user?.email) {
            console.log(`[Auth] Google User Email NOT Allowed: ${session.user.email}`);
        } else {
            // console.log('[Auth] No Google Session');
        }

        // 2. Check LINE Auth (Header)
        const lineUserId = req.headers.get('x-line-user-id');
        if (lineUserId) {
            const student = await loginStudent(lineUserId);

            if (student) {
                // ロール判定
                let role: UserRole = 'student';
                if (student.status === '教室長') role = 'principal';
                else if (student.grade === '講師' || student.status.includes('講師')) role = 'teacher';

                // 権限判定
                const permissions: AuthPermissions = {
                    canViewDashboard: (CONFIG.PERMISSIONS.VIEW_DASHBOARD as readonly string[]).includes(student.status),
                    canViewOccupancyMembers: (CONFIG.PERMISSIONS.VIEW_OCCUPANCY_MEMBERS as readonly string[]).includes(student.status),
                    canOperateBuildingStatus: (CONFIG.PERMISSIONS.OPERATE_BUILDING_STATUS as readonly string[]).includes(student.status),
                };

                return {
                    isAuthenticated: true,
                    user: {
                        id: student.lineId,
                        name: student.name,
                        role,
                        status: student.status,
                        authMethod: 'line',
                    },
                    permissions,
                };
            } else {
                // LINE IDはあるが生徒が見つからない
                return {
                    isAuthenticated: false,
                    user: null,
                    permissions: defaultPermissions,
                    error: 'Student not found',
                };
            }
        }

        // 3. Not Authenticated
        return {
            isAuthenticated: false,
            user: null,
            permissions: defaultPermissions,
            error: 'No valid credentials found',
        };

    } catch (error) {
        console.error('Authentication Error:', error);
        return {
            isAuthenticated: false,
            user: null,
            permissions: defaultPermissions,
            error: 'Internal authentication error',
        };
    }
}
