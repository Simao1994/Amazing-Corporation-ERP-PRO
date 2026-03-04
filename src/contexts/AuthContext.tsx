import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: any | null;
    session: any | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const refreshProfile = async (currentSession?: any) => {
        const activeSession = currentSession || session;
        if (!activeSession?.user) {
            setUser(null);
            return;
        }

        // Defensive fallback data
        const userEmail = activeSession.user.email || '';
        const fallbackUser = {
            ...activeSession.user,
            role: userEmail === 'simaopambo94@gmail.com' ? 'saas_admin' : 'operario',
            nome: activeSession.user.user_metadata?.nome || userEmail.split('@')[0] || 'Utilizador',
            tenant_id: activeSession.user.user_metadata?.tenant_id
        };

        try {
            console.log('AuthContext: Fetching profile for', activeSession.user.email);

            // Timeout protection for the profile fetch (5 seconds)
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', activeSession.user.id)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (error) {
                console.warn('AuthContext: Profile fetch error (using fallback):', error);
                setUser(fallbackUser);
            } else if (profile) {
                console.log('AuthContext: Profile loaded successfully');
                setUser({
                    ...activeSession.user,
                    ...profile
                });
            } else {
                setUser(fallbackUser);
            }
        } catch (err) {
            console.error('AuthContext: Error in refreshProfile (using fallback):', err);
            setUser(fallbackUser);
        }
    };

    useEffect(() => {
        // 1. Initial lookup
        const initAuth = async () => {
            console.log('AuthContext: Starting initAuth...');
            try {
                // Initial session fetch with timeout
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
                );

                const { data: { session: initialSession } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

                setSession(initialSession);
                if (initialSession) {
                    await refreshProfile(initialSession);
                }
            } catch (err) {
                console.error('AuthContext: Init error:', err);
                setUser(null);
            } finally {
                console.log('AuthContext: initAuth finished, setting loading to false.');
                setLoading(false);
                isInitialLoad.current = false;
            }
        };

        initAuth();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log('AuthContext: Auth Event:', event);

            setSession(newSession);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (newSession) {
                    await refreshProfile(newSession);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setSession(null);
            }

            // Only stop loading if we're not in the middle of init
            if (!isInitialLoad.current) {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
