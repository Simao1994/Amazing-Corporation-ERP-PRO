import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: any | null;
    session: any | null;
    loading: boolean;
    refreshProfile: (session?: any, force?: boolean) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    const refreshProfile = async (currentSession?: any, force = false) => {
        if (isRefreshing.current && !force) return { success: false, message: 'Already refreshing' };
        isRefreshing.current = true;

        const activeSession = currentSession || session;
        if (!activeSession?.user) {
            isRefreshing.current = false;
            return { success: false, message: 'No active session' };
        }

        const userEmail = activeSession.user.email || '';
        const defaultProfile = {
            id: activeSession.user.id,
            email: userEmail,
            role: activeSession.user.user_metadata?.role || (userEmail === 'simaopambo94@gmail.com' ? 'saas_admin' : 'funcionario'),
            nome: activeSession.user.user_metadata?.nome || userEmail.split('@')[0] || 'Utilizador',
            tenant_id: activeSession.user.user_metadata?.tenant_id
        };

        try {
            console.log('AuthContext: Buscando perfil de', userEmail);
            const profilePromise = supabase
                .from('profiles')
                .select('*, tenant_id')
                .eq('id', activeSession.user.id)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('A operação de perfis excedeu tempo limite de 15s. A sua rede local pode estar a estrangular o tráfego da API REST.')), 15000)
            );

            const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (error) {
                console.warn('AuthContext: Erro ao buscar perfil. A sessão pode estar inválida ou inacessível:', error);
                const isTimeout = error.message && error.message.includes('tempo limite');
                if (error.code === 'PGRST116' || isTimeout) {
                    console.log('AuthContext: Usando perfil padrão devido a erro ou timeout.');
                    const tenantId = activeSession.user.user_metadata?.tenant_id || defaultProfile.tenant_id;
                    const fullUser = {
                        ...activeSession.user,
                        ...defaultProfile,
                        tenant_id: tenantId
                    };
                    setUser(fullUser);
                    localStorage.setItem('auth_user_cache', JSON.stringify(fullUser));
                    return { success: true, message: 'Perfil carregado via fallback' };
                }
                setUser(null);
                localStorage.removeItem('auth_user_cache');
                const errMsg = error.code === 'PGRST116' ? 'Perfil não encontrado na Base de Dados. É necessário correr o script de reparação.' : error.message;
                return { success: false, message: errMsg };
            } else if (profile) {
                const tenantId = profile.tenant_id || activeSession.user.user_metadata?.tenant_id;
                const fullUser = {
                    ...activeSession.user,
                    ...profile,
                    tenant_id: tenantId
                };
                console.log('AuthContext DEBUG: User loaded with tenant_id:', tenantId);
                setUser(fullUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fullUser));
                return { success: true, message: 'Perfil carregado com sucesso' };
            }
            else {
                console.warn('AuthContext: Perfil não encontrado.');
                setUser(null);
                return { success: false, message: 'Perfil retornou vazio na Base de Dados' };
            }
        } catch (err: any) {
            console.warn('AuthContext: Timeout ou erro crítico no refreshProfile:', err);
            const isTimeout = err?.message && err.message.includes('tempo limite');
            if (isTimeout) {
                console.log('AuthContext: Usando perfil padrão após timeout crítico.');
                const tenantId = activeSession.user.user_metadata?.tenant_id || defaultProfile.tenant_id;
                const fullUser = {
                    ...activeSession.user,
                    ...defaultProfile,
                    tenant_id: tenantId
                };
                setUser(fullUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fullUser));
                return { success: true, message: 'Perfil carregado via fallback (timeout)' };
            }
            setUser(null);
            localStorage.removeItem('auth_user_cache');
            return { success: false, message: err?.message || 'Erro crítico ao sincronizar o perfil' };
        } finally {
            isRefreshing.current = false;
        }
    };

    useEffect(() => {
        const failSafeTimer = setTimeout(() => {
            console.error('AuthContext: FAIL-SAFE disparado! Abortando espera da sessão pendente.');
            setUser(null);
            localStorage.removeItem('auth_user_cache');
            setLoading(false);
        }, 8000);

        const initAuth = async (retryCount = 0) => {
            try {
                // Obter sessão inicial com proteção pesada contra deadlocks do LockManager (Supabase JS bug)
                const sessionPromise = supabase.auth.getSession();
                const sessionTimeout = new Promise<any>((resolve) =>
                    setTimeout(() => resolve({ data: { session: null }, error: new Error('getSession timeout - Lock detectado') }), 3000)
                );

                const { data: { session: initialSession }, error } = await Promise.race([sessionPromise, sessionTimeout]);

                if (error) {
                    console.error('AuthContext: Erro ao buscar sessão:', error.message);
                    const isLockError = error.message?.includes('Lock') || error.message?.includes('timeout');
                    if (isLockError && retryCount < 1) {
                        const delay = 1000 * (retryCount + 1);
                        console.warn(`AuthContext: Lock detectado, bypassando falha local para evitar bloqueio eterno...`);
                        // Try forcing session reconstruction instead of hanging
                        localStorage.removeItem('supabase.auth.token'); // Attempt to clear the lock
                    }
                }

                setSession(initialSession);
                if (initialSession) {
                    await refreshProfile(initialSession);
                } else {
                    console.log('[Auth] Nenhuma sessão activa encontrada. Limpando cache optimista.');
                    setUser(null);
                    localStorage.removeItem('auth_user_cache');
                }
            } catch (err) {
                console.error('AuthContext: Erro crítico na inicialização:', err);
            } finally {
                // EXTREME FAIL-SAFE: Garantir que o loading morre sempre aqui se não houver retry pendente
                if (retryCount >= 0) {
                    setLoading(false);
                    isInitialLoad.current = false;
                    clearTimeout(failSafeTimer);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log(`[Auth] Evento detectado: ${event}`, { hasSession: !!newSession });
            setSession(newSession);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (newSession) {
                    console.log(`[Auth] Actualizando perfil para o utilizador: ${newSession.user.id}`);
                    await refreshProfile(newSession);
                }
            } else if (event === 'SIGNED_OUT') {
                console.warn('[Auth] Sessão encerrada pelo servidor ou utilizador.');
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
