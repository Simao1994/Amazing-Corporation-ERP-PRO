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
    // 1. Iniciar imediatamente com dados do cache se disponíveis para evitar tela branca
    const [user, setUser] = useState<any | null>(() => {
        const cached = localStorage.getItem('auth_user_cache');
        return cached ? JSON.parse(cached) : null;
    });

    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const refreshProfile = async (currentSession?: any) => {
        const activeSession = currentSession || session;
        if (!activeSession?.user) {
            setUser(null);
            localStorage.removeItem('auth_user_cache');
            return;
        }

        const userEmail = activeSession.user.email || '';
        const fallbackUser = {
            ...activeSession.user,
            role: userEmail === 'simaopambo94@gmail.com' ? 'saas_admin' : 'operario',
            nome: activeSession.user.user_metadata?.nome || userEmail.split('@')[0] || 'Utilizador',
            tenant_id: activeSession.user.user_metadata?.tenant_id
        };

        try {
            console.log('AuthContext: Buscando perfil de', userEmail);

            // Proteção de timeout para a busca de perfil (3 segundos)
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', activeSession.user.id)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
            );

            const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (error) {
                console.warn('AuthContext: Erro ao buscar perfil (usando fallback):', error);
                setUser(fallbackUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fallbackUser));
            } else if (profile) {
                const fullUser = { ...activeSession.user, ...profile };
                setUser(fullUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fullUser));
            } else {
                setUser(fallbackUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fallbackUser));
            }
        } catch (err) {
            console.warn('AuthContext: Timeout ou erro no refreshProfile (usando fallback):', err);
            setUser(fallbackUser);
        }
    };

    useEffect(() => {
        // FAIL-SAFE GLOBAL: Independente de tudo, parar o loading em 4 segundos
        const failSafeTimer = setTimeout(() => {
            if (loading) {
                console.error('AuthContext: FAIL-SAFE disparado! Forçando carregamento...');
                setLoading(false);
            }
        }, 15000);

        const initAuth = async (retryCount = 0) => {
            try {
                // Obter sessão inicial com retry para erros de Lock
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                
                if (error) {
                    const isLockError = error.message?.includes('Lock broken') || error.message?.includes('steal');
                    if (isLockError && retryCount < 3) {
                        const delay = 500 * (retryCount + 1);
                        console.warn(`AuthContext: Lock detectado, tentando novamente em ${delay}ms...`);
                        setTimeout(() => initAuth(retryCount + 1), delay);
                        return;
                    }
                    throw error;
                }

                setSession(initialSession);
                if (initialSession) {
                    await refreshProfile(initialSession);
                }
            } catch (err) {
                console.error('AuthContext: Erro na inicialização:', err);
            } finally {
                if (retryCount === 0 || !loading) {
                    setLoading(false);
                    isInitialLoad.current = false;
                    clearTimeout(failSafeTimer);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            setSession(newSession);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (newSession) await refreshProfile(newSession);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setSession(null);
                localStorage.removeItem('auth_user_cache');
            }

            if (!isInitialLoad.current) setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(failSafeTimer);
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
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
