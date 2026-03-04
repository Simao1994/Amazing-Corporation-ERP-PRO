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

        try {
            // Fetch profile for tenant_id and role
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', activeSession.user.id)
                .single();

            if (profile) {
                setUser({
                    ...activeSession.user,
                    ...profile
                });
            } else {
                // Fallback for Master Admin or missing profile
                setUser({
                    ...activeSession.user,
                    role: activeSession.user.email === 'simaopambo94@gmail.com' ? 'saas_admin' : 'operario',
                    nome: activeSession.user.user_metadata?.nome || activeSession.user.email?.split('@')[0]
                });
            }
        } catch (err) {
            console.error('AuthContext: Error fetching profile:', err);
        }
    };

    useEffect(() => {
        // 1. Initial lookup
        const initAuth = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
                if (initialSession) {
                    await refreshProfile(initialSession);
                }
            } catch (err) {
                console.error('AuthContext: Init error:', err);
            } finally {
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
