
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MENU_ITEMS,
  ROLE_ACCESS,
  LogOut,
  Search
} from '../constants';
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
  Phone
} from 'lucide-react';
import { User, ChatMessage, ChatContact } from '../types';
import Logo from './Logo';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';

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
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- LOAD DATA (Chat & Notifications) ---
  useEffect(() => {
    // Chat Load
    const allMessages = AmazingStorage.get<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, []);
    setMessages(allMessages);

    // Chat Contacts
    const mockContacts: ChatContact[] = [
      { id: 'admin_sys', nome: 'Eng. Simão Puca', role: 'Suporte TI', avatar: '', online: true, lastSeen: new Date().toISOString(), unreadCount: 0 },
      { id: 'dir_fin', nome: 'Direcção Financeira', role: 'Financeiro', avatar: '', online: true, lastSeen: new Date().toISOString(), unreadCount: 2 },
      { id: 'rh_manager', nome: 'Recursos Humanos', role: 'RH', avatar: '', online: false, lastSeen: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0 },
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
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat, isChatOpen]);

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

  const allowedMenuItems = MENU_ITEMS.filter(item => {
    if (user.role === 'admin') return true;
    const userPermissions = ROLE_ACCESS[user.role] || [];
    return userPermissions.includes(item.id);
  });

  return (
    <div className="flex h-screen bg-[#e0f2fe] overflow-hidden text-zinc-900 font-sans">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} transition-all duration-300 bg-[#0f172a] text-white flex flex-col z-20 shadow-2xl border-r border-white/5`}>
        <div className="p-8 flex flex-col items-center overflow-hidden">
          {isSidebarOpen ? <Logo className="w-full" light showTagline /> : <div className="bg-yellow-500 text-zinc-900 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg text-lg">A</div>}
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
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-sky-200 px-8 flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-sky-100 rounded-lg text-slate-600"><Search size={20} /></button>
            <div className="hidden md:flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amazing Corp ERP</span></div>
          </div>
          <div className="flex items-center gap-6">
            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`text-slate-500 hover:text-purple-600 relative p-2 hover:bg-sky-50 rounded-full transition-all ${isNotifOpen ? 'bg-sky-100 text-purple-600' : ''}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
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

        <main className={`flex-1 overflow-y-auto ${isHomePage ? 'p-0' : 'p-8'} bg-[#e0f2fe] relative`}>
          <div className={`${isHomePage ? 'w-full' : 'max-w-7xl mx-auto pb-12'}`}>{children}</div>
        </main>

        {/* CHAT WIDGET */}
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${isChatOpen ? 'w-80 sm:w-96' : 'w-auto'}`}>
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
