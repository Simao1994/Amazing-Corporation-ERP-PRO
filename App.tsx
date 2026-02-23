// Trigger Re-deploy: v1.0.1
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import HRPage from './pages/HR';
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
import UnauthorizedPage from './pages/Unauthorized';
import FornecedoresPage from './pages/Fornecedores';
import ParceirosPage from './pages/Parceiros';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import UsersPage from './pages/Users';
import EmpresasPage from './pages/Empresas';
import { supabase, getUserProfile } from './src/lib/supabase';
import { AmazingStorage, STORAGE_KEYS } from './utils/storage';
import { User } from './types';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';

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
      if (session?.user) {
        // Fetch profile BEFORE finalizing initialization, so the app never
        // renders with a stale/default role ('user') causing broken states.
        const { data: profile } = await getUserProfile(session.user.id);
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          nome: profile?.nome || session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Utilizador',
          role: profile?.role || 'admin', // Default to admin only if profile missing (fail-safe)
        };
        setUser(userData);
        AmazingStorage.save(STORAGE_KEYS.USER, userData);

        // Now safe to finalize initialization (profile is resolved)
        setIsInitializing(false);

        // Targeted sync for essential info (background)
        AmazingStorage.loadSpecificKeys([STORAGE_KEYS.CORPORATE_INFO]);

        // Full background sync
        setIsSyncing(true);
        AmazingStorage.loadAllFromCloud().then(() => {
          setIsSyncing(false);
          console.log('Nuvem sincronizada em segundo plano.');
        });
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        setIsInitializing(false);

        // Even for public users, sync public info in background
        AmazingStorage.loadSpecificKeys([STORAGE_KEYS.CORPORATE_INFO]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (userData: User) => {
    setUser(userData);
    AmazingStorage.save(STORAGE_KEYS.USER, userData);
    setIsSyncing(true);
    await AmazingStorage.loadAllFromCloud();
    setIsSyncing(false);
    AmazingStorage.logAction('Login', 'Sessão', `Utilizador ${userData.nome} acedeu ao sistema`);
    showToast("Login realizado com sucesso!");
    // Force redirect to Home Corporativo after login
    window.location.hash = '#/';
  };

  const handleLogout = async () => {
    AmazingStorage.logAction('Logout', 'Sessão', `Utilizador encerrou sessão`);
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
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
                    <Route path="/utilizadores" element={<ProtectedRoute user={user} path="/utilizadores"><UsersPage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute user={user} path="/dashboard"><Dashboard /></ProtectedRoute>} />
                    <Route path="/arena/admin" element={<ProtectedRoute user={user} path="/arena/admin"><ArenaAdmin /></ProtectedRoute>} />
                    <Route path="/recrutamento" element={<ProtectedRoute user={user} path="/recrutamento"><RecruitmentPage /></ProtectedRoute>} />
                    <Route path="/tesouraria" element={<ProtectedRoute user={user} path="/tesouraria"><FinancialHubPage /></ProtectedRoute>} />
                    <Route path="/solicitacoes" element={<ProtectedRoute user={user} path="/solicitacoes"><RequestsPage /></ProtectedRoute>} />
                    <Route path="/blog" element={<ProtectedRoute user={user} path="/blog"><BlogPage /></ProtectedRoute>} />
                    <Route path="/galeria" element={<ProtectedRoute user={user} path="/galeria"><GaleriaPage /></ProtectedRoute>} />
                    <Route path="/feed" element={<ProtectedRoute user={user} path="/feed"><FeedPage /></ProtectedRoute>} />
                    <Route path="/transportes" element={<ProtectedRoute user={user} path="/transportes"><TransportPage /></ProtectedRoute>} />
                    <Route path="/rh" element={<ProtectedRoute user={user} path="/rh"><HRPage user={user} /></ProtectedRoute>} />
                    <Route path="/departamentos" element={<ProtectedRoute user={user} path="/departamentos"><DepartmentsPage user={user} /></ProtectedRoute>} />
                    <Route path="/financeiro" element={<ProtectedRoute user={user} path="/financeiro"><FinancePage /></ProtectedRoute>} />
                    <Route path="/contabilidade" element={<ProtectedRoute user={user} path="/contabilidade"><AccountingPage /></ProtectedRoute>} />
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
