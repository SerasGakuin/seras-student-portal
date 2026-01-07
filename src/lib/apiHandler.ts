/**
 * APIハンドラー共通ユーティリティ
 * エラーハンドリング、認証チェック、レスポンス形式の統一
 */

import { NextResponse } from 'next/server';
import { authenticateRequest, AuthResult } from '@/lib/authUtils';

/**
 * API成功レスポンスを生成
 */
export function successResponse<T>(data: T) {
    return NextResponse.json({ status: 'ok', data });
}

/**
 * APIエラーレスポンスを生成
 */
export function errorResponse(message: string, status: number = 500) {
    return NextResponse.json({ status: 'error', message }, { status });
}

/**
 * 認証エラーレスポンス (401)
 */
export function unauthorizedResponse(auth: AuthResult) {
    return NextResponse.json({
        status: 'error',
        message: `Unauthorized: ${auth.error || 'Permission denied'}`,
    }, { status: 401 });
}

/**
 * 権限エラーレスポンス (403)
 */
export function forbiddenResponse(message: string = 'Permission denied') {
    return NextResponse.json({
        status: 'error',
        message: `Forbidden: ${message}`,
    }, { status: 403 });
}

/**
 * バリデーションエラーレスポンス (400)
 */
export function validationErrorResponse(message: string) {
    return NextResponse.json({
        status: 'error',
        message,
    }, { status: 400 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandler = (request: Request) => Promise<NextResponse<any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthenticatedHandler = (request: Request, auth: AuthResult) => Promise<NextResponse<any>>;

/**
 * エラーハンドリングラッパー
 * APIハンドラーをラップして共通のエラーハンドリングを提供
 *
 * @param context エラーログに出力するコンテキスト名
 * @param handler 実際のAPIハンドラー関数
 */
export function withErrorHandler(context: string) {
    return (handler: ApiHandler): ApiHandler => {
        return async (request: Request) => {
            try {
                return await handler(request);
            } catch (error: unknown) {
                console.error(`[${context}] Error:`, error);
                const message = error instanceof Error ? error.message : 'Internal Server Error';
                return errorResponse(message, 500);
            }
        };
    };
}

/**
 * 認証付きAPIハンドラーラッパー
 * 認証チェックとエラーハンドリングを自動化
 *
 * @param context エラーログに出力するコンテキスト名
 * @param handler 認証済みリクエストを処理するハンドラー
 */
export function withAuth(context: string) {
    return (handler: AuthenticatedHandler): ApiHandler => {
        return withErrorHandler(context)(async (request: Request) => {
            const auth = await authenticateRequest(request);

            if (!auth.isAuthenticated) {
                return unauthorizedResponse(auth);
            }

            return await handler(request, auth);
        });
    };
}

/**
 * 権限チェック付きAPIハンドラーラッパー
 *
 * @param context エラーログに出力するコンテキスト名
 * @param permission 必要な権限
 * @param handler 認証・認可済みリクエストを処理するハンドラー
 */
export function withPermission(
    context: string,
    permission: 'canViewDashboard' | 'canViewOccupancyMembers' | 'canOperateBuildingStatus'
) {
    return (handler: AuthenticatedHandler): ApiHandler => {
        return withAuth(context)(async (request: Request, auth: AuthResult) => {
            if (!auth.permissions[permission]) {
                return forbiddenResponse(`Missing permission: ${permission}`);
            }

            return await handler(request, auth);
        });
    };
}
