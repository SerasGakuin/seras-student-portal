'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';
import { Student, StudentProfile } from '@/types';
import { api } from '@/lib/api';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';

interface LiffContextType {
    liff: typeof liff | null;
    profile: StudentProfile | null;
    student: Student | null;
    isLoggedIn: boolean;
    isRegistered: boolean;
    error: string | null;
    isLoading: boolean;
}

const LiffContext = createContext<LiffContextType>({
    liff: null,
    profile: null,
    student: null,
    isLoggedIn: false,
    isRegistered: false,
    error: null,
    isLoading: true,
});

export const useLiff = () => useContext(LiffContext);

export const LiffProvider = ({ children }: { children: React.ReactNode }) => {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initLiff = async () => {
            try {
                if (!LIFF_ID) {
                    console.warn('LIFF ID is not set. Running in mock mode.');
                    // Mock data for development
                    const mockProfile = {
                        userId: 'Ufd3f1cc5afd45924f995d7b51304c550', // Test ID
                        displayName: 'テストユーザー',
                    };
                    setProfile(mockProfile);
                    setIsLoggedIn(true);

                    // Mock Login attempt
                    await attemptLogin(mockProfile.userId);

                    setIsLoading(false);
                    return;
                }

                await liff.init({ liffId: LIFF_ID });

                if (liff.isLoggedIn()) {
                    setIsLoggedIn(true);
                    const p = await liff.getProfile();
                    const userProfile = {
                        userId: p.userId,
                        displayName: p.displayName,
                        pictureUrl: p.pictureUrl,
                    };
                    setProfile(userProfile);

                    // Attempt to login with backend using LINE ID
                    await attemptLogin(userProfile.userId);
                } else {
                    setIsLoggedIn(false);
                    // Login is not forced here; user can browse as guest if allowed, or trigger login elsewhere
                }
            } catch (err: unknown) {
                console.error('LIFF init failed', err);
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                if (process.env.NODE_ENV === 'development') {
                    const mockProfile = {
                        userId: 'Ufd3f1cc5afd45924f995d7b51304c550',
                        displayName: 'テストユーザー (Fallback)',
                    };
                    setProfile(mockProfile);
                    setIsLoggedIn(true);
                    await attemptLogin(mockProfile.userId);
                }
            } finally {
                setIsLoading(false);
            }
        };

        initLiff();
    }, []);

    const attemptLogin = async (lineUserId: string) => {
        try {
            const data = await api.auth.login(lineUserId);

            if (data.student) {
                setStudent(data.student);
                setIsRegistered(true);
            } else {
                setIsRegistered(false);
            }
        } catch (e) {
            console.error('Failed to login to backend:', e);
            // Don't set error state here to avoid blocking UI for non-fatal login fails (e.g. just unregistered)
            // But if it's network error, might be good.
            // For now preserving original logic: just set registered=false
            setIsRegistered(false);
        }
    };

    return (
        <LiffContext.Provider value={{ liff: LIFF_ID ? liff : null, profile, student, isLoggedIn, isRegistered, error, isLoading }}>
            {children}
        </LiffContext.Provider>
    );
};
