import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

    const refreshProfile = async (currentSession?: any, force = false) => {
        if (isRefreshing.current && !force) return { success: false, message: 'Already refreshing' };
        isRefreshing.current = true;

        const activeSession = currentSession || session;
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
            console.log('AuthContext: Buscando perfil de', userEmail);

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

            if (error) {
                console.warn('AuthContext: Erro ao buscar perfil após retries. Usando fallback:', error.message);
                const tenantId = activeSession.user.user_metadata?.tenant_id || defaultProfile.tenant_id;
                const fullUser = {
                    ...activeSession.user,
                    ...defaultProfile,
                    tenant_id: tenantId
                };
                setUser(fullUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fullUser));
                return { success: true, message: 'Perfil carregado via fallback' };
            } else if (profile) {
                const tenantId = profile.tenant_id || activeSession.user.user_metadata?.tenant_id;
                const fullUser = {
                    ...activeSession.user,
                    ...profile,
                    tenant_id: tenantId
                };
                setUser(fullUser);
                localStorage.setItem('auth_user_cache', JSON.stringify(fullUser));
                return { success: true, message: 'Perfil carregado com sucesso' };
            }
            return { success: true, message: 'Usando perfil padrão' };
        } catch (err: any) {
            console.warn('AuthContext: Timeout ou erro crítico:', err);
            const tenantId = activeSession.user.user_metadata?.tenant_id || defaultProfile.tenant_id;
            const fullUser = {
                ...activeSession.user,
                ...defaultProfile,
                tenant_id: tenantId
            };
            setUser(fullUser);
            return { success: true, message: 'Perfil recuperado' };
        } finally {
            isRefreshing.current = false;
        }
    };

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
                } else {
                    console.log('[Auth] Nenhuma sessão activa encontrada. Limpando cache optimista.');
                    setUser(null);
                    localStorage.removeItem('auth_user_cache');
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
