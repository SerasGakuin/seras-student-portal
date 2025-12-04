'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';

interface Profile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

interface LiffContextType {
    liff: typeof liff | null;
    profile: Profile | null;
    isLoggedIn: boolean;
    error: string | null;
    isLoading: boolean;
}

const LiffContext = createContext<LiffContextType>({
    liff: null,
    profile: null,
    isLoggedIn: false,
    error: null,
    isLoading: true,
});

export const useLiff = () => useContext(LiffContext);

export const LiffProvider = ({ children }: { children: React.ReactNode }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initLiff = async () => {
            try {
                if (!LIFF_ID) {
                    console.warn('LIFF ID is not set. Running in mock mode.');
                    // Mock data for development
                    setProfile({
                        userId: 'U873f976fc1f2ab959918871c84714da9', // Test ID
                        displayName: 'テストユーザー',
                    });
                    setIsLoggedIn(true);
                    setIsLoading(false);
                    return;
                }

                await liff.init({ liffId: LIFF_ID });

                if (liff.isLoggedIn()) {
                    setIsLoggedIn(true);
                    const p = await liff.getProfile();
                    setProfile({
                        userId: p.userId,
                        displayName: p.displayName,
                        pictureUrl: p.pictureUrl,
                    });
                } else {
                    setIsLoggedIn(false);
                    // Auto login if not logged in (optional, depending on UX)
                    // liff.login();
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                console.error('LIFF init failed', err);
                setError(err.message);
                // Fallback to mock data in dev if init fails (e.g. wrong LIFF ID)
                if (process.env.NODE_ENV === 'development') {
                    setProfile({
                        userId: 'U873f976fc1f2ab959918871c84714da9',
                        displayName: 'テストユーザー (Fallback)',
                    });
                    setIsLoggedIn(true);
                }
            } finally {
                setIsLoading(false);
            }
        };

        initLiff();
    }, []);

    return (
        <LiffContext.Provider value={{ liff: LIFF_ID ? liff : null, profile, isLoggedIn, error, isLoading }}>
            {children}
        </LiffContext.Provider>
    );
};
