// Trigger Re-deploy: v1.0.1
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import HRPage from './pages/HR';
import ContasBancariasPage from './pages/ContasBancariasPage';
import TransportPage from './pages/Transport';
import MaintenancePage from './pages/Maintenance';
import FinancePage from './pages/Finance';
import AccountingPage from './pages/Accounting';
import FinancialHubPage from './pages/FinancialHub';
import InventoryPage from './pages/Inventory';
import AuditPage from './pages/Audit';
import SettingsPage from './pages/Settings';
import DepartmentsPage from './pages/Departments';
import FeedPage from './pages/Feed';
import CorporateHome from './pages/CorporateHome';
import RequestsPage from './pages/Requests';
import BlogPage from './pages/Blog';
import GaleriaPage from './pages/Galeria';
import AgroPage from './pages/Agro';
import RealEstatePage from './pages/RealEstate';
import RecruitmentPage from './pages/Recruitment';
import ArenaGames from './pages/ArenaGames';
import ArenaAdmin from './pages/ArenaAdmin';
import DashboardGallery from './pages/DashboardGallery';
import DashboardLibrary from './pages/DashboardLibrary';
import DashboardFiles from './pages/DashboardFiles';
import UnauthorizedPage from './pages/Unauthorized';
import FornecedoresPage from './pages/Fornecedores';
import ParceirosPage from './pages/Parceiros';
import PublicVagasSite from './pages/PublicVagasSite';
import PublicVagaDetalhes from './pages/PublicVagaDetalhes';
import PublicCandidaturaStatus from './pages/PublicCandidaturaStatus';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import UsersPage from './pages/Users';
import EmpresasPage from './pages/Empresas';
import { supabase, getUserProfile } from './src/lib/supabase';
import { AmazingStorage, STORAGE_KEYS } from './utils/storage';
import { User } from './types';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import PublicCandidaturaEspontanea from './pages/PublicCandidaturaEspontanea';
import AutoLogout from './components/AutoLogout';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (window as any).notify = showToast;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth event: ${event}`);

      if (session?.user) {
        // Parallel Background tasks
        Promise.all([
          getUserProfile(session.user.id),
          AmazingStorage.loadSpecificKeys([STORAGE_KEYS.CORPORATE_INFO]),
          AmazingStorage.loadAllFromCloud()
        ]).then(([{ data: profile }]) => {
          // Check if profile exists in DB, otherwise use metadata/fallback
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            nome: profile?.nome || session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Utilizador',
            role: profile?.role || (session.user.email === 'simaopambo94@gmail.com' ? 'admin' : 'operario'),
          };

          setUser(userData);
          AmazingStorage.save(STORAGE_KEYS.USER, userData);
          setIsInitializing(false);

          // If profile is missing but user is logged in, we might want to notify or log
          if (!profile && session.user.email === 'simaopambo94@gmail.com') {
            console.warn("Profile missing for admin user. Ensure SQL fix is applied.");
          }
        }).catch(err => {
          console.error("Background initialization error:", err);
          const fallbackUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            nome: session.user.user_metadata?.nome || 'Utilizador',
            role: session.user.email === 'simaopambo94@gmail.com' ? 'admin' : 'operario'
          };
          setUser(fallbackUser);
          setIsInitializing(false);
        });
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        // Background sync for public info
        AmazingStorage.loadSpecificKeys([STORAGE_KEYS.CORPORATE_INFO]).finally(() => {
          setIsInitializing(false);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (userData: User) => {
    // Show feedback immediately for a "premium" feel
    showToast("Login realizado com sucesso!");

    setUser(userData);
    AmazingStorage.save(STORAGE_KEYS.USER, userData);

    // Non-blocking background sync
    setIsSyncing(true);
    AmazingStorage.loadAllFromCloud().finally(() => setIsSyncing(false));

    AmazingStorage.logAction('Login', 'Sessão', `Utilizador ${userData.nome} acedeu ao sistema`);
    // Removed window.location.hash = '#/' to prevent flickering/jumpy transition
  };

  const handleLogout = async () => {
    try {
      AmazingStorage.logAction('Logout', 'Sessão', `Utilizador encerrou sessão`);
      // Use a timeout for signOut to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

      await Promise.race([signOutPromise, timeoutPromise]).catch(err => console.warn("SignOut error or timeout:", err));
    } catch (error) {
      console.error("Logout process error:", error);
    } finally {
      // ALWAYS clear local state regardless of server outcome
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.USER);
      // Force clear specific Supabase keys just in case
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth-token')) localStorage.removeItem(key);
      });
      showToast("Sessão encerrada.", "info");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#e0f2fe] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 shadow-xl"></div>
        <p className="text-zinc-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Iniciando Amazing Corp Cloud...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Layout>
              )
            } />
          </Routes>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
