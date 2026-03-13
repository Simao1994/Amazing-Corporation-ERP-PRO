import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { safeQuery } from '../lib/supabaseUtils';

interface AuthContextType {
    user: any | null;
    session: any | null;
    loading: boolean;
    refreshProfile: (session?: any, force?: boolean) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface Profile {
    id: string;
    email: string;
    tenant_id?: string;
    role?: string;
    nome?: string;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Iniciar imediatamente com dados do cache se disponíveis para evitar tela branca
    const [user, setUser] = useState<any | null>(() => {
        const cached = localStorage.getItem('auth_user_cache');
        if (cached) console.log('[Auth] Carregando utilizador do cache local para inicialização');
        return cached ? JSON.parse(cached) : null;
    });

    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const isRefreshing = useRef(false);
    const isInitialLoad = useRef(true);
    const sessionRef = useRef<any>(null);

    // Sincronizar ref com estado para closures estáveis
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    const refreshProfile = useCallback(async (currentSession?: any, force = false) => {
        if (isRefreshing.current && !force) return { success: false, message: 'Already refreshing' };
        isRefreshing.current = true;

        const activeSession = currentSession || sessionRef.current;
        if (!activeSession?.user) {
            isRefreshing.current = false;
            return { success: false, message: 'No active session' };
        }

        const userEmail = activeSession.user.email || '';
        const defaultProfile: Profile = {
            id: activeSession.user.id,
            email: userEmail,
            role: activeSession.user.user_metadata?.role || (userEmail === 'simaopambo94@gmail.com' ? 'saas_admin' : 'funcionario'),
            nome: activeSession.user.user_metadata?.nome || userEmail.split('@')[0] || 'Utilizador',
            tenant_id: activeSession.user.user_metadata?.tenant_id
        };

        try {
            const { data: profile, error } = await safeQuery<Profile>(
                () => supabase
                    .from('profiles')
                    .select('*, tenant_id')
                    .eq('id', activeSession.user.id)
                    .single(),
                {
                    cacheKey: `profile-${activeSession.user.id}`,
                    fallbackData: defaultProfile
                }
            );

            let consolidatedUser: any;

            if (error || !profile) {
                const tenantId = activeSession.user.user_metadata?.tenant_id || defaultProfile.tenant_id;
                consolidatedUser = {
                    ...activeSession.user,
                    ...defaultProfile,
                    tenant_id: tenantId
                };
            } else {
                const tenantId = profile.tenant_id || activeSession.user.user_metadata?.tenant_id;
                consolidatedUser = {
                    ...activeSession.user,
                    ...profile,
                    tenant_id: tenantId
                };
            }

            // Estabilização: Só alterar o estado se o conteúdo mudou de facto
            setUser((prev: any) => {
                if (JSON.stringify(prev) === JSON.stringify(consolidatedUser)) return prev;
                console.log('[Auth] Perfil consolidado actualizado.');
                localStorage.setItem('auth_user_cache', JSON.stringify(consolidatedUser));
                return consolidatedUser;
            });

            return { success: true, message: 'Perfil processado' };
        } catch (err: any) {
            console.warn('AuthContext: Falha ao consolidar perfil:', err);
            return { success: false, message: 'Erro no perfil' };
        } finally {
            isRefreshing.current = false;
        }
    }, []); // Agora é estável para sempre

    useEffect(() => {
        const failSafeTimer = setTimeout(() => {
            console.error('AuthContext: FAIL-SAFE disparado! Abortando espera da sessão pendente.');
            setLoading(false);
        }, 20000);

        const initAuth = async () => {
            try {
                // Obter sessão — sem timeout agressivo para não cortar o lock de auth
                console.log('[Auth] Obtendo sessão inicial...');
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('AuthContext: Erro ao buscar sessão:', error.message);
                }

                setSession(initialSession);
                if (initialSession) {
                    await refreshProfile(initialSession);
                } else if (!error) {
                    // APENAS limpa o cache se houver a certeza de que a sessão não existe (sem erro de lock/timeout)
                    console.warn('[Auth TRACE] Nenhuma sessão activa encontrada sem erros aparentes (initAuth). Limpando cache optimista.');
                    console.trace('Tracing initAuth no-session');
                    setUser(null);
                    localStorage.removeItem('auth_user_cache');
                } else {
                    console.warn('[Auth TRACE] Erro ao obter sessão. Mantendo cache optimista para evitar loop de logout.', error);
                }
            } catch (err) {
                console.error('AuthContext: Erro crítico na inicialização:', err);
            } finally {
                // EXTREME FAIL-SAFE: Garantir que o loading morre sempre aqui se não houver retry pendente
                setLoading(false);
                isInitialLoad.current = false;
                clearTimeout(failSafeTimer);
                // Fallback de segurança absoluto
                setTimeout(() => setLoading(false), 2000);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            // Estabilização da Sessão
            setSession((prev: any) => {
                if (JSON.stringify(prev) === JSON.stringify(newSession)) return prev;
                console.log(`[Auth] Evento: ${event}. Sessão actualizada.`);
                return newSession;
            });
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (newSession) {
                    console.log(`[Auth] Actualizando perfil para o utilizador: ${newSession.user.id}`);
                    await refreshProfile(newSession);
                }
            } else if (event === 'SIGNED_OUT') {
                setTimeout(async () => {
                    const { data: { session: checkSession } } = await supabase.auth.getSession();
                    if (checkSession) {
                        setSession(checkSession);
                        await refreshProfile(checkSession);
                    } else {
                        setUser(null);
                        setSession(null);
                        localStorage.removeItem('auth_user_cache');
                        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
                            window.location.href = '/';
                        }
                    }
                }, 1000);
            }

            if (!isInitialLoad.current) setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(failSafeTimer);
        };
    }, []);

    const authValue = React.useMemo(() => ({
        user,
        session,
        loading,
        refreshProfile
    }), [user, session, loading]);

    return (
        <AuthContext.Provider value={authValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
