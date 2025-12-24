'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * NextAuth SessionProvider ラッパー
 * アプリケーション全体でセッション状態を提供
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
    return <SessionProvider>{children}</SessionProvider>;
};
