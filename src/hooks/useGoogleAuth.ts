'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

/**
 * Google認証状態を取得するカスタムフック
 * 
 * @returns {object} 認証状態とアクション
 * - isAuthenticated: Google認証済みかどうか
 * - isLoading: セッション読み込み中かどうか
 * - user: ユーザー情報 (email, name, image)
 * - signInWithGoogle: Googleログイン関数
 * - signOutFromGoogle: ログアウト関数
 */
export const useGoogleAuth = () => {
    const { data: session, status } = useSession();

    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated' && !!session?.user;

    return {
        isAuthenticated,
        isLoading,
        user: session?.user || null,
        signInWithGoogle: () => signIn('google'),
        signOutFromGoogle: () => signOut(),
    };
};
