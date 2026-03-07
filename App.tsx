// Trigger Re-deploy: v1.0.3 - Fixed Authentication Strobe
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
// Core Lazy Imports
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const HRPage = React.lazy(() => import('./pages/HR'));
const FinancePage = React.lazy(() => import('./pages/Finance'));
const AccountingPage = React.lazy(() => import('./pages/Accounting'));
const MasterAdmin = React.lazy(() => import('./pages/MasterAdmin'));
const ArenaGames = React.lazy(() => import('./pages/ArenaGames'));
const CorporateHome = React.lazy(() => import('./pages/CorporateHome'));
const PublicVagasSite = React.lazy(() => import('./pages/PublicVagasSite'));
const PublicVagaDetalhes = React.lazy(() => import('./pages/PublicVagaDetalhes'));

// Standard Imports
import ContasBancariasPage from './pages/ContasBancariasPage';
import TransportPage from './pages/Transport';
import MaintenancePage from './pages/Maintenance';
import FinancialHubPage from './pages/FinancialHub';
import InventoryPage from './pages/Inventory';
import AuditPage from './pages/Audit';
import SettingsPage from './pages/Settings';
import DepartmentsPage from './pages/Departments';
import FeedPage from './pages/Feed';
import RequestsPage from './pages/Requests';
import BlogPage from './pages/Blog';
import GaleriaPage from './pages/Galeria';
import AgroPage from './pages/Agro';
import RealEstatePage from './pages/RealEstate';
import RecruitmentPage from './pages/Recruitment';
import ArenaAdmin from './pages/ArenaAdmin';
import DashboardGallery from './pages/DashboardGallery';
import DashboardLibrary from './pages/DashboardLibrary';
import DashboardFiles from './pages/DashboardFiles';
import UnauthorizedPage from './pages/Unauthorized';
import FornecedoresPage from './pages/Fornecedores';
import ParceirosPage from './pages/Parceiros';
import PublicCandidaturaStatus from './pages/PublicCandidaturaStatus';
import ProtectedRoute from './components/ProtectedRoute';
import { TenantProvider } from './src/components/TenantProvider';
import { supabase } from './src/lib/supabase';
import { AmazingStorage, STORAGE_KEYS } from './utils/storage';
import { useSaaS } from './src/contexts/SaaSContext';
import { useAuth } from './src/contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import UsersPage from './pages/Users';
import EmpresasPage from './pages/Empresas';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import PublicCandidaturaEspontanea from './pages/PublicCandidaturaEspontanea';
import AutoLogout from './components/AutoLogout';
import SubscriptionPage from './pages/Subscription';

const App: React.FC = () => {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { loading: saasLoading } = useSaaS();

  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [showForceLoad, setShowForceLoad] = useState(false);
  const [forceLoadManual, setForceLoadManual] = useState(() => {
    return localStorage.getItem('emergency_nuclear_bypass') === 'true';
  });

  const clearEverything = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    (window as any).notify = showToast;

    // Após 1s mostrar os botões de emergência (Reduzido drasticamente para evitar frustração)
    const timer = setTimeout(() => {
      setShowForceLoad(true);
    }, 1000);

    // BYPASS AUTOMÁTICO: após 12s forçar saída do loading (Reduzido de 25s)
    const autoBypass = setTimeout(() => {
      if (!forceLoadManual) {
        console.warn('App: Auto-bypass activado após 12s. Rede instável detectada.');
        localStorage.setItem('emergency_nuclear_bypass', 'true');
        setForceLoadManual(true);
      }
    }, 12000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoBypass);
    };
  }, []);

  const handleLogin = async (userData: any) => {
    showToast("Autenticando...");
    await refreshProfile();
    showToast("Login realizado com sucesso!");

    setIsSyncing(true);
    AmazingStorage.loadAllFromCloud().finally(() => setIsSyncing(false));
    AmazingStorage.logAction('Login', 'Sessão', `Utilizador acedeu ao sistema`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Preservar apenas o flag de emergência se o utilizador já o tiver activo
      const bypass = localStorage.getItem('emergency_nuclear_bypass');
      
      // Limpeza profunda de resíduos de sessão
      localStorage.clear();
      sessionStorage.clear();
      
      if (bypass) {
        localStorage.setItem('emergency_nuclear_bypass', bypass);
      }
      
      showToast("Sessão encerrada com sucesso.", "info");
      
      // Pequeno delay e reload forçado para garantir estado limpo
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.clear(); // Garantir limpeza mesmo em erro
      window.location.reload();
    }
  };

  // RULE 1, 2, 3: While loading, show spinner, DO NOT render dashboard, DO NOT redirect
  // Emergency bypass: if forceLoadManual is true, we stop loading
  const isGlobalLoading = (authLoading || saasLoading) && !forceLoadManual;

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 p-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-purple-500/10 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-white font-black uppercase text-xs tracking-[0.3em] animate-pulse">
            Sincronizando Segurança Alpha
          </p>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            A validar infraestrutura e permissões...
          </p>
          <div className="flex gap-4 justify-center mt-4">
            <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${authLoading ? 'border-yellow-500/50 text-yellow-500 animate-pulse' : 'border-green-500/50 text-green-500'}`}>
              Auth: {authLoading ? 'Pendente' : 'Pronto'}
            </div>
            <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${saasLoading ? 'border-yellow-500/50 text-yellow-500 animate-pulse' : 'border-green-500/50 text-green-500'}`}>
              SaaS: {saasLoading ? 'Pendente' : 'Pronto'}
            </div>
          </div>
          <p className="text-slate-600 text-[8px] font-mono mt-2 break-all max-w-xs mx-auto">
            URL: {import.meta.env.VITE_SUPABASE_URL || 'NÃO CONFIGURADA'}
          </p>
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-left space-y-2 max-w-sm mx-auto">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Debug em Tempo Real:</p>
            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-slate-400">
              <span>Auth Context:</span>
              <span className={authLoading ? "text-yellow-500 animate-pulse" : "text-green-500"}>
                {authLoading ? "A verificar..." : "Pronto"}
              </span>
              <span>SaaS Context:</span>
              <span className={saasLoading ? "text-yellow-500 animate-pulse" : "text-green-500"}>
                {saasLoading ? "A sincronizar..." : "Pronto"}
              </span>
              <span>Sessão Supabase:</span>
              <span className={user ? "text-green-500" : "text-yellow-500"}>
                {user ? "Activa" : "Pendente"}
              </span>
              <span>ID da Empresa:</span>
              <span className={user?.tenant_id ? "text-green-500" : "text-red-500"}>
                {user?.tenant_id ? "Sincronizado" : "Não Encontrado"}
              </span>
            </div>
          </div>
        </div>

        {showForceLoad && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-4">
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl max-w-xs text-center">
              <p className="text-red-400 text-[10px] font-bold leading-relaxed">
                O carregamento está travado. Isto pode ser devido a instabilidade no banco de dados. Use o Modo de Segurança para entrar.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl"
              >
                Recarregar
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('emergency_nuclear_bypass', 'true');
                  setForceLoadManual(true);
                }}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl border border-purple-400/30"
              >
                Modo de Segurança
              </button>
              <button
                onClick={clearEverything}
                className="bg-red-900/40 text-red-500 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-900/60 transition-all border border-red-500/30"
              >
                Limpar & Resetar
              </button>
            </div>
            <p className="text-slate-500 text-[9px] font-medium italic">
              Se o ecrã não sumir após o Modo de Segurança, tente Limpar & Resetar.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TenantProvider tenantId={user?.tenant_id}>
        <HashRouter>
          <div className="relative">
            <AutoLogout user={user} onLogout={handleLogout} />
            {isSyncing && (
              <div className="fixed bottom-6 left-6 z-[100] bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-yellow-500/50 animate-bounce">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Nuvem Activa</span>
              </div>
            )}

            {toast && (
              <div className="fixed top-6 right-6 z-[110] animate-in slide-in-from-right duration-300">
                <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-bold border-2 ${toast.type === 'success' ? 'bg-zinc-900 text-white border-yellow-500' :
                  toast.type === 'info' ? 'bg-sky-600 text-white border-sky-400' :
                    'bg-red-600 text-white border-red-400'
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-yellow-500 text-zinc-900' : 'bg-white text-current'
                    }`}>
                    {toast.type === 'success' ? '✓' : toast.type === 'info' ? '☁' : '!'}
                  </div>
                  {toast.message}
                </div>
              </div>
            )}

            <React.Suspense fallback={
              <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Carregando Módulo...</p>
              </div>
            }>
              <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<CorporateHome />} />
              <Route path="/carreiras" element={<PublicVagasSite />} />
              <Route path="/carreiras/estado" element={<PublicCandidaturaStatus />} />
              <Route path="/carreiras/:id" element={<PublicVagaDetalhes />} />
              <Route path="/candidatura-espontanea" element={<PublicCandidaturaEspontanea />} />
              <Route path="/candidatura" element={<RecruitmentPage isPublic={true} />} />
              <Route path="/arena" element={<ArenaGames />} />
              <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

              {/* Rotas Protegidas (Exigem Login) */}
              <Route path="/*" element={
                !user ? (
                  <LoginPage onLogin={handleLogin} />
                ) : (
                  <Layout user={user} onLogout={handleLogout}>
                    <Routes>
                      <Route path="/unauthorized" element={<UnauthorizedPage />} />
                      <Route path="/utilizadores" element={<ProtectedRoute user={user} path="/utilizadores"><UsersPage user={user} /></ProtectedRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute user={user} path="/dashboard"><Dashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/galeria" element={<ProtectedRoute user={user} path="/dashboard/galeria"><DashboardGallery user={user} /></ProtectedRoute>} />
                      <Route path="/dashboard/biblioteca" element={<ProtectedRoute user={user} path="/dashboard/biblioteca"><DashboardLibrary user={user} /></ProtectedRoute>} />
                      <Route path="/dashboard/arquivos" element={<ProtectedRoute user={user} path="/dashboard/arquivos"><DashboardFiles user={user} /></ProtectedRoute>} />
                      <Route path="/arena/admin" element={<ProtectedRoute user={user} path="/arena/admin"><ArenaAdmin /></ProtectedRoute>} />
                      <Route path="/recrutamento" element={<ProtectedRoute user={user} path="/recrutamento"><RecruitmentPage /></ProtectedRoute>} />
                      <Route path="/tesouraria" element={<ProtectedRoute user={user} path="/tesouraria"><FinancialHubPage /></ProtectedRoute>} />
                      <Route path="/solicitacoes" element={<ProtectedRoute user={user} path="/solicitacoes"><RequestsPage /></ProtectedRoute>} />
                      <Route path="/blog" element={<ProtectedRoute user={user} path="/blog"><BlogPage user={user} /></ProtectedRoute>} />
                      <Route path="/galeria" element={<ProtectedRoute user={user} path="/galeria"><GaleriaPage /></ProtectedRoute>} />
                      <Route path="/feed" element={<ProtectedRoute user={user} path="/feed"><FeedPage /></ProtectedRoute>} />
                      <Route path="/transportes" element={<ProtectedRoute user={user} path="/transportes"><TransportPage /></ProtectedRoute>} />
                      <Route path="/rh" element={<ProtectedRoute user={user} path="/rh"><HRPage user={user} /></ProtectedRoute>} />
                      <Route path="/rh/contas" element={<ProtectedRoute user={user} path="/rh/contas"><ContasBancariasPage user={user} /></ProtectedRoute>} />
                      <Route path="/departamentos" element={<ProtectedRoute user={user} path="/departamentos"><DepartmentsPage user={user} /></ProtectedRoute>} />
                      <Route path="/financeiro" element={<ProtectedRoute user={user} path="/financeiro"><FinancePage /></ProtectedRoute>} />
                      <Route path="/contabilidade" element={<ProtectedRoute user={user} path="/contabilidade"><AccountingPage user={user} /></ProtectedRoute>} />
                      <Route path="/inventario" element={<ProtectedRoute user={user} path="/inventario"><InventoryPage /></ProtectedRoute>} />
                      <Route path="/manutencao" element={<ProtectedRoute user={user} path="/manutencao"><MaintenancePage /></ProtectedRoute>} />
                      <Route path="/auditoria" element={<ProtectedRoute user={user} path="/auditoria"><AuditPage /></ProtectedRoute>} />
                      <Route path="/configuracoes" element={<ProtectedRoute user={user} path="/configuracoes"><SettingsPage /></ProtectedRoute>} />
                      <Route path="/agro" element={<ProtectedRoute user={user} path="/agro"><AgroPage /></ProtectedRoute>} />
                      <Route path="/imobiliario" element={<ProtectedRoute user={user} path="/imobiliario"><RealEstatePage /></ProtectedRoute>} />
                      <Route path="/fornecedores" element={<ProtectedRoute user={user} path="/fornecedores"><FornecedoresPage /></ProtectedRoute>} />
                      <Route path="/empresas" element={<ProtectedRoute user={user} path="/empresas"><EmpresasPage /></ProtectedRoute>} />
                      <Route path="/parceiros" element={<ProtectedRoute user={user} path="/parceiros"><ParceirosPage /></ProtectedRoute>} />
                      <Route path="/configuracoes/assinatura" element={<ProtectedRoute user={user} path="/configuracoes"><SubscriptionPage /></ProtectedRoute>} />
                      <Route path="/master" element={<ProtectedRoute user={user} path="/master" customRole="saas_admin"><MasterAdmin /></ProtectedRoute>} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </Layout>
                )
              } />
            </Routes>
          </React.Suspense>
          </div>
        </HashRouter>
      </TenantProvider>
    </ErrorBoundary>
  );
};

export default App;
