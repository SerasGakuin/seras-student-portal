import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * 許可されたメールアドレスのリスト
 * 環境変数 ALLOWED_EMAILS でカンマ区切りで設定可能
 */
const getAllowedEmails = (): string[] => {
    const emails = process.env.ALLOWED_EMAILS || '';
    return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

/**
 * メールアドレスが許可リストに含まれているか確認
 */
export const isEmailAllowed = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const allowed = getAllowedEmails();
    return allowed.includes(email.toLowerCase());
};

/**
 * NextAuth.js 設定
 * Google OAuth プロバイダーを使用し、許可されたメールアドレスのみアクセス可能
 */
export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        /**
         * サインイン時のコールバック
         * 許可されたメールアドレスのみサインインを許可
         */
        async signIn({ user }) {
            return isEmailAllowed(user.email);
        },
        /**
         * セッションコールバック
         * セッションにユーザー情報を追加
         */
        async session({ session, token }) {
            if (session.user && token.email) {
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',  // カスタムサインインページ（オプション）
        error: '/auth/error',    // エラーページ（オプション）
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30日間有効
    },
};
