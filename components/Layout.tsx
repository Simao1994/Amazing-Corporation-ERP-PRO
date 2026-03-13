
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MENU_ITEMS,
  ROLE_ACCESS,
  getMergedPermissions,
  setDynamicRoles,
  LogOut,
  Search
} from '../constants';
import { supabase } from '../src/lib/supabase';
import { Menu } from 'lucide-react';
import {
  MessageCircle,
  X,
  Send,
  User as UserIcon,
  Minimize2,
  HardHat,
  Bell,
  Check,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Phone,
  Clock,
  ArrowRight
} from 'lucide-react';
import { User, ChatMessage, ChatContact, UserRole } from '../types';
import Logo from './Logo';
import { useTenant } from '../src/components/TenantProvider';
import { useSaaS } from '../src/contexts/SaaSContext';
import { isModuleActive } from '../src/utils/subscription';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';

import { useAuth } from '../src/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const { tenant } = useTenant();
  const { subscription: subStatus, loading: saasLoading } = useSaaS();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isHomePage = location.pathname === '/';

  // --- CHAT STATE ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- NOTIFICATION STATE ---
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- LOAD DATA (Chat & Notifications) ---
  useEffect(() => {
    // Defer non-critical loading to allow route transition to complete smoothly (INP Optimization)
    const deferTimer = setTimeout(() => {
      // Chat Load
      const allMessages = AmazingStorage.get<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, []);
      setMessages(allMessages);

      // Chat Contacts
      const mockContacts: ChatContact[] = [
        { id: 'admin_sys', nome: 'Eng. Simão Puca', role: 'Suporte TI', avatar: '', online: true, lastSeen: new Date().toISOString(), unreadCount: 0 },
      ];
      setContacts(mockContacts);

      // Notifications Load (Simulação inicial se vazio)
      const savedNotifs = AmazingStorage.get<Notification[]>('amazing_notifications', []);
      if (savedNotifs.length === 0) {
        const initialNotifs: Notification[] = [
          { id: '1', title: 'Manutenção Pendente', message: 'Veículo Toyota Hilux (LD-22-44) requer revisão.', type: 'warning', timestamp: new Date().toISOString(), read: false },
          { id: '2', title: 'Folha Processada', message: 'O processamento salarial de Março foi concluído.', type: 'success', timestamp: new Date(Date.now() - 86400000).toISOString(), read: false },
          { id: '3', title: 'Novo Contrato', message: 'Contrato imobiliário #402 assinado digitalmente.', type: 'info', timestamp: new Date(Date.now() - 172800000).toISOString(), read: true },
        ];
        setNotifications(initialNotifs);
        AmazingStorage.save('amazing_notifications', initialNotifs);
      } else {
        setNotifications(savedNotifs);
      }
    }, 1500); // Wait 1.5s after mount before doing heavy localStorage work

    return () => clearTimeout(deferTimer);
  }, []);

  const [rolesLoaded, setRolesLoaded] = useState(false);

  const { user: authUser, loading: authLoading } = useAuth();

  // --- DYNAMIC ROLES FETCH ---
  useEffect(() => {
    const fetchDynamicRoles = async () => {
      // Só carregar se a autenticação estiver pronta e houver um utilizador
      if (authLoading || !authUser || rolesLoaded) return;

      try {
        const tenantId = authUser.tenant_id || user?.tenant_id;
        if (!tenantId) {
          console.warn('Layout: Tenant ID não encontrado, ignorando busca de cargos.');
          return;
        }

        // console.log('Layout: A carregar cargos dinâmicos...');

        // Uso de safeQuery para garantir cache e evitar loops (erro 429)
        const { data, error } = await supabase.rpc('get_dynamic_roles', { p_tenant_id: tenantId });

        // Fallback para select se a RPC falhar ou não existir
        if (error) {
          console.warn('Layout: Erro na RPC get_dynamic_roles, tentando select direto...', error.message);
          const { data: selectData, error: selectError } = await supabase
            .from('papeis_dinamicos')
            .select('*')
            .eq('tenant_id', tenantId);

          if (selectError) throw selectError;

          if (selectData) {
            const rolesMap: Record<string, string[]> = {};
            selectData.forEach(r => {
              rolesMap[r.role_key] = r.allowed_modules;
            });
            setDynamicRoles(rolesMap);
            setRolesLoaded(true);
          }
        } else if (data) {
          setDynamicRoles(data as any);
          setRolesLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching dynamic roles:', err);
        // Não marcar como carregado para tentar novamente com cautela, 
        // mas aqui evitamos o loop pela flag rolesLoaded no topo.
        setRolesLoaded(true);
      }
    };

    fetchDynamicRoles();
  }, [authLoading, authUser?.id, rolesLoaded]);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChat?.id, isChatOpen]);

  // --- NOTIFICATION LOGIC ---
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    AmazingStorage.save('amazing_notifications', updated);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    AmazingStorage.save('amazing_notifications', []);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    AmazingStorage.save('amazing_notifications', updated);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error': return <X size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  // --- CHAT HANDLERS ---
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id || 'current_user',
      receiverId: activeChat.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sent',
      type: 'text'
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    AmazingStorage.save(STORAGE_KEYS.CHAT_MESSAGES, updatedMessages);
    setNewMessage('');

    if (activeChat.id === 'admin_sys') {
      // Notificar Admin via WhatsApp (+244 945 035 089)
      const encodedMsg = encodeURIComponent(`Olá Eng. Simão Puca, recebi uma nova solicitação no ERP da Amazing Corp.\n\nUtilizador: ${user.nome}\nEmail: ${user.email}\n\nMensagem: ${newMessage}`);
      const whatsappUrl = `https://wa.me/244945035089?text=${encodedMsg}`;

      // Mostrar notificação para o utilizador
      if ((window as any).notify) {
        (window as any).notify("O Eng. Simão Puca foi notificado via canal urgente!", "info");
      }

      // Abrir WhatsApp em nova aba (opcional ou automático se for SMS bridge)
      // Como o utilizador pediu para ele receber no número dele:
      window.open(whatsappUrl, '_blank');

      setTimeout(() => {
        const reply: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: 'admin_sys',
          receiverId: user.id || 'current_user',
          content: 'Engenheiro Simão Puca aqui. Acabei de receber o seu alerta no meu telemóvel. Estou analisando a sua solicitação técnica.',
          timestamp: new Date().toISOString(),
          status: 'delivered',
          type: 'text'
        };
        const withReply = [...updatedMessages, reply];
        setMessages(withReply);
        AmazingStorage.save(STORAGE_KEYS.CHAT_MESSAGES, withReply);
      }, 1500);
    }
  };

  const getFilteredMessages = () => {
    if (!activeChat) return [];
    return messages.filter(m =>
      (m.senderId === (user.id || 'current_user') && m.receiverId === activeChat.id) ||
      (m.senderId === activeChat.id && m.receiverId === (user.id || 'current_user'))
    );
  };


  const allowedMenuItems = React.useMemo(() => {
    return MENU_ITEMS.filter(item => {
      // SaaS Admin and Master Admin see everything related to their role
      if (user.role === 'saas_admin') return true;

      // Check role permissions first
      const userPermissions = getMergedPermissions(user.role);
      const hasRoleAccess = user.role === 'admin' || userPermissions.includes(item.id) || userPermissions.includes('all');

      if (!hasRoleAccess) return false;

      // Check plan module access for standard users
      if (subStatus) {
        // Exceptions for pages that should always be visible (home, dashboard, profile, subscription)
        const publicDocs = ['home', 'dashboard', 'configuracoes', 'assinatura', 'solicitacoes'];
        if (publicDocs.includes(item.id)) return true;

        // Map menu item IDs to module names in the SaaS plan
        const moduleMap: Record<string, string> = {
          'rh': 'RH',
          'financeiro': 'FINANCEIRO',
          'contabilidade': 'CONTABILIDADE',
          'inventario': 'INVENTARIO',
          'manutencao': 'MANUTENCAO',
          'transportes': 'TRANSPORTES',
          'imobiliario': 'IMOBILIARIO',
          'agro': 'AGRO',
          'arena_admin': 'ARENA'
        };

        const moduleName = moduleMap[item.id] || item.id.toUpperCase();
        return isModuleActive(subStatus, moduleName);
      }

      return true;
    });
  }, [user.role, subStatus]);

  // Strict License Block Logic
  // 1. saas_admin is never blocked
  // 2. /master and /configuracoes/assinatura are never blocked
  // 3. / (home) is never blocked
  const isMasterPath = location.pathname.startsWith('/master');
  const isSubPath = location.pathname === '/configuracoes/assinatura';
  const isPublicPath = location.pathname === '/' || location.pathname === '/dashboard';

  const isBlocked = !saasLoading &&
    subStatus &&
    !subStatus.active &&
    user.role !== 'saas_admin' &&
    !isMasterPath &&
    !isSubPath &&
    !isPublicPath;

  if (saasLoading && !isBlocked) {
    return (
      <div className="flex h-screen bg-[#e0f2fe] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#e0f2fe] overflow-hidden text-zinc-900 font-sans">
      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Blocked Interface Overlay */}
      {isBlocked && (
        <div className="fixed inset-0 z-[100] bg-zinc-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="max-w-md w-full bg-white rounded-[3.5rem] p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={48} className="text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-4">Acesso Bloqueado</h2>
            <p className="text-zinc-500 font-bold mb-10 leading-relaxed">
              A licença de uso deste sistema expirou ou foi suspensas. Por favor, regularize o pagamento para continuar operacional.
            </p>
            <div className="space-y-4">
              <Link
                to="/configuracoes/assinatura"
                className="flex items-center justify-center gap-3 w-full py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20"
              >
                Gerir Assinatura <ArrowRight size={16} />
              </Link>
              <button
                onClick={onLogout}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-red-500 transition-colors"
              >
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar — fixed drawer on mobile, static flex item on desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0f172a] text-white shadow-2xl border-r border-white/5
        transition-all duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        w-72
        lg:relative lg:inset-auto lg:translate-x-0 lg:z-20
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'}
      `}>
        <div className="p-8 flex flex-col items-center overflow-hidden">
          {isSidebarOpen ? (
            tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.nome} className="max-h-12 w-auto" />
            ) : (
              <Logo className="w-full" light showTagline />
            )
          ) : (
            <div className="bg-yellow-500 text-zinc-900 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg text-lg">
              {tenant?.nome?.charAt(0) || 'A'}
            </div>
          )}
        </div>
        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {allowedMenuItems.map((item) => (
            <Link key={item.id} to={item.path} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-yellow-500 text-zinc-900 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <div className={location.pathname === item.path ? 'text-current' : 'text-slate-400'}>{item.icon}</div>
              {isSidebarOpen && <span className="font-semibold text-sm truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className={`flex items-center gap-3 mb-4 px-2 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="relative">
              <img src={`https://ui-avatars.com/api/?name=${user.nome}&background=6d28d9&color=ffffff`} alt="Avatar" className="w-10 h-10 rounded-xl border-2 border-slate-700" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.nome.split(' ')[0]}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="flex items-center gap-4 w-full p-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"><LogOut size={20} /> {isSidebarOpen && <span className="font-semibold text-sm">Sair</span>}</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 lg:h-20 bg-[#020617] border-b border-white/5 px-4 lg:px-8 flex items-center justify-between z-10 relative shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-sky-100 rounded-lg text-slate-600"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            {/* Desktop sidebar toggle */}
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden lg:flex p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-all"><Search size={20} /></button>
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/10 ml-2">
              <div className="scale-110 filter brightness-0 invert opacity-90 origin-left">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt={tenant.nome} className="h-10 w-auto" />
                ) : (
                  <Logo className="h-10" />
                )}
              </div>
              {tenant && <span className="text-white font-black uppercase text-xs tracking-widest ml-2">{tenant.nome}</span>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`text-slate-400 hover:text-white relative p-2.5 hover:bg-white/10 rounded-xl transition-all ${isNotifOpen ? 'bg-white/20 text-white' : ''}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#020617] animate-pulse"></span>}
              </button>

              {/* NOTIFICATION DROPDOWN */}
              {isNotifOpen && (
                <div className="absolute top-14 right-0 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-sky-100 overflow-hidden animate-in zoom-in-95 origin-top-right z-50">
                  <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 uppercase">Notificações</h4>
                      <p className="text-[10px] text-zinc-500 font-bold">{unreadCount} não lidas</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleMarkAllRead} className="p-2 text-zinc-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Marcar todas como lidas"><Check size={16} /></button>
                      <button onClick={handleClearNotifications} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Limpar tudo"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {notifications.length > 0 ? notifications.map(notif => (
                      <div key={notif.id} className={`p-4 rounded-2xl flex gap-3 transition-all relative group ${notif.read ? 'bg-white opacity-60' : 'bg-sky-50/50 border border-sky-100'}`}>
                        <div className="mt-1">{getNotifIcon(notif.type)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className={`text-xs font-bold ${notif.read ? 'text-zinc-600' : 'text-zinc-900'}`}>{notif.title}</p>
                            <span className="text-[9px] text-zinc-400">{new Date(notif.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                        <button onClick={(e) => deleteNotification(notif.id, e)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-all"><X size={12} /></button>
                      </div>
                    )) : (
                      <div className="py-12 text-center text-zinc-400">
                        <FileText size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">Sem notificações recentes.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-center">
                    <button onClick={() => setIsNotifOpen(false)} className="text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900">Fechar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${isHomePage ? 'p-0' : 'p-4 lg:p-8'} bg-[#e0f2fe] relative`}>
          {subStatus && !subStatus.active && (
            <div className="mb-8 p-6 bg-white border-2 border-red-100 rounded-[2.5rem] shadow-xl shadow-red-500/5 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Licença em Risco</h4>
                  <p className="text-[11px] text-zinc-500 font-bold max-w-md">{subStatus.message || 'A sua licença expirou ou o pagamento falhou. Regularize para evitar bloqueio total.'}</p>
                </div>
              </div>
              <Link to="/configuracoes/assinatura" className="bg-red-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
                Pagar Agora
              </Link>
            </div>
          )}

          {subStatus && subStatus.active && subStatus.daysLeft <= 7 && (
            <div className="mb-8 p-6 bg-white border-2 border-orange-100 rounded-[2.5rem] shadow-xl shadow-orange-500/5 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 line">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Renovação Próxima</h4>
                  <p className="text-[11px] text-zinc-500 font-bold max-w-md">O seu plano expira em apenas <span className="text-orange-600">{subStatus.daysLeft} dias</span>. Evite interrupções no serviço.</p>
                </div>
              </div>
              <Link to="/configuracoes/assinatura" className="bg-zinc-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20">
                Regularizar
              </Link>
            </div>
          )}
          <div className={`${isHomePage ? 'w-full' : 'max-w-7xl mx-auto pb-12'}`}>{children}</div>
        </main>

        {/* CHAT WIDGET */}
        <div className={`fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end transition-all duration-300 ${isChatOpen ? 'w-[calc(100vw-2rem)] sm:w-96' : 'w-auto'}`}>
          {isChatOpen && (
            <div className="bg-white rounded-t-2xl shadow-2xl border border-sky-100 w-full overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-10" style={{ height: '500px' }}>
              <div className="bg-zinc-900 p-4 text-white flex justify-between items-center">
                {activeChat ? (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveChat(null)} className="hover:bg-white/10 p-1 rounded-lg"><Minimize2 size={16} /></button>
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-zinc-900 font-bold text-xs">{activeChat.nome.charAt(0)}</div>
                      {activeChat.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900"></div>}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none">{activeChat.nome}</p>
                      <p className="text-[10px] text-zinc-400">{activeChat.role}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><MessageCircle size={16} className="text-yellow-500" /> Suporte Amazing</h3>
                    <p className="text-[10px] text-zinc-400">Canal Directo TI</p>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {activeChat?.id === 'admin_sys' && (
                    <a
                      href={`tel:+244945035089`}
                      className="text-zinc-400 hover:text-green-500 p-2 hover:bg-white/10 rounded-full transition-all"
                      title="Ligar Directo"
                    >
                      <Phone size={18} />
                    </a>
                  )}
                  <button onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all"><X size={18} /></button>
                </div>
              </div>

              <div className="flex-1 bg-zinc-50 overflow-y-auto custom-scrollbar p-4">
                {!activeChat ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 px-2">Suporte Técnico</p>
                    {contacts.map(contact => (
                      <div key={contact.id} onClick={() => setActiveChat(contact)} className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-100 shadow-sm">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full ${contact.id === 'admin_sys' ? 'bg-zinc-900 text-yellow-500' : 'bg-zinc-200 text-zinc-500'} flex items-center justify-center font-bold`}>
                            {contact.id === 'admin_sys' ? <HardHat size={18} /> : <UserIcon size={18} />}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${contact.online ? 'bg-green-500' : 'bg-zinc-400'}`}></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-zinc-900">{contact.nome}</p>
                          <p className="text-xs text-zinc-500 truncate">{contact.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredMessages().map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderId === (user.id || 'current_user') ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium shadow-sm ${msg.senderId === (user.id || 'current_user') ? 'bg-zinc-900 text-white rounded-tr-none' : 'bg-white text-zinc-700 border border-zinc-200 rounded-tl-none'}`}>
                          {msg.content}
                          <div className={`text-[9px] mt-1 text-right ${msg.senderId === (user.id || 'current_user') ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {activeChat && (
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-zinc-100 flex items-center gap-2">
                  <input className="flex-1 bg-zinc-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500/20 outline-none" placeholder="Falar com suporte..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                  <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-yellow-500 text-zinc-900 rounded-xl shadow-md"><Send size={18} /></button>
                </form>
              )}
            </div>
          )}
          <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative ${isChatOpen ? 'bg-zinc-800 text-white mt-4 rounded-t-none' : 'bg-zinc-900 text-yellow-500'}`}>
            {isChatOpen ? <X size={24} /> : <MessageCircle size={28} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
