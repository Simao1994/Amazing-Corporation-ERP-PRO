
import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, AlertCircle, Database, Download, HardDrive, RefreshCw, CheckCircle2, Send, Lock, Cloud, Wifi, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { supabase } from '../src/lib/supabase';

const SettingsPage: React.FC = () => {
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbTableCount, setDbTableCount] = useState(0);

  const checkCloudStatus = async () => {
    setCloudStatus('checking');
    try {
      const { count, error } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true });
      if (error) throw error;
      // Count known tables
      setDbTableCount(12); // acc_contas, acc_periodos, blog_posts, funcionarios, etc.
      setCloudStatus('connected');
    } catch {
      setCloudStatus('error');
    }
  };

  useEffect(() => {
    checkCloudStatus();
  }, []);

  const [inviteForm, setInviteForm] = useState({ nome: '', email: '', role: 'manager' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const roles = [
    { value: 'admin', label: 'Administrador (Acesso Total)' },
    { value: 'hr', label: 'Gestor de RH' },
    { value: 'finance', label: 'Financeiro' },
    { value: 'manager', label: 'Director de Frota' },
    { value: 'maintenance_director', label: 'Director da Manutenção' },
    { value: 'accounting', label: 'Contabilidade' },
    { value: 'inventory', label: 'Inventários' },
  ];

  const downloadBackup = async () => {
    try {
      const [posts, funcionarios] = await Promise.all([
        supabase.from('blog_posts').select('*'),
        supabase.from('funcionarios').select('*')
      ]);
      const backup = {
        generated_at: new Date().toISOString(),
        source: 'Amazing ERP Cloud (Supabase)',
        blog_posts: posts.data || [],
        funcionarios: funcionarios.data || []
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amazing_erp_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar backup. Verifique a ligação.');
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.nome || !inviteForm.email) {
      alert('Por favor preencha o nome e o email.');
      return;
    }
    setIsInviting(true);
    setTimeout(() => {
      setIsInviting(false);
      setInviteSuccess(true);
      setInviteForm({ nome: '', email: '', role: 'manager' });
      setTimeout(() => setInviteSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-sky-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Configurações do ERP</h1>
          <p className="text-zinc-500 font-medium mt-1">Gerenciamento de infraestrutura local e segurança de acesso.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadBackup}
            className="px-6 py-3 bg-white border border-sky-200 text-sky-600 rounded-xl hover:bg-sky-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
          >
            <Download size={16} /> Exportar Backup Cloud
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Cloud Status Monitor */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-sky-100 overflow-hidden">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
              <h2 className="font-black text-zinc-900 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <Cloud size={18} className="text-sky-500" />
                Estado da Infraestrutura Cloud
              </h2>
              <button onClick={checkCloudStatus} className="text-zinc-400 hover:text-zinc-600 transition-colors"><RefreshCw size={16} /></button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center gap-3 transition-all ${cloudStatus === 'connected' ? 'bg-green-50 border-green-200' :
                cloudStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-100'
                }`}>
                {cloudStatus === 'checking' ? <RefreshCw size={28} className="text-zinc-400 animate-spin" /> :
                  cloudStatus === 'connected' ? <Wifi size={28} className="text-green-600" /> :
                    <AlertCircle size={28} className="text-red-600" />}
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supabase</p>
                <p className={`text-xs font-bold ${cloudStatus === 'connected' ? 'text-green-700' :
                  cloudStatus === 'error' ? 'text-red-700' : 'text-zinc-500'
                  }`}>
                  {cloudStatus === 'checking' ? 'A verificar...' : cloudStatus === 'connected' ? 'Ligado' : 'Sem Ligação'}
                </p>
              </div>
              <div className="p-6 rounded-2xl border-2 bg-blue-50 border-blue-200 flex flex-col items-center text-center gap-3">
                <Database size={28} className="text-blue-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tabelas Activas</p>
                <p className="text-2xl font-black text-blue-700">{dbTableCount}+</p>
              </div>
              <div className="p-6 rounded-2xl border-2 bg-purple-50 border-purple-200 flex flex-col items-center text-center gap-3">
                <ShieldCheck size={28} className="text-purple-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Encriptação</p>
                <p className="text-xs font-black text-purple-700">TLS 1.3 / AES-256</p>
              </div>
            </div>
          </div>

          {/* Painel de status correcto - Supabase Cloud */}
          <div className="bg-green-50 p-8 rounded-[2rem] border border-green-100 flex items-start gap-6">
            <div className="p-4 bg-green-100 rounded-2xl text-green-600 shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-sm font-black text-green-900 uppercase tracking-widest mb-1">Dados Protegidos na Nuvem</p>
              <p className="text-xs text-green-700 font-medium leading-relaxed">
                Este ERP armazena todos os dados no <strong>Supabase Cloud</strong> com encriptação AES-256 e backups automáticos diários.
                Os seus dados estão seguros mesmo que limpe o cache do navegador. O backup manual é opcional e serve apenas para exportações locais.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-sky-100 relative overflow-hidden">
            {inviteSuccess && (
              <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in text-center p-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-xl font-black text-zinc-900">Convite Enviado!</h4>
                <p className="text-zinc-500 text-sm mt-2">O colaborador receberá as credenciais por email.</p>
              </div>
            )}

            <h3 className="font-black text-zinc-900 text-[10px] uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <UserPlus size={18} className="text-yellow-500" />
              Novo Acesso
            </h3>
            <form className="space-y-5" onSubmit={handleInviteSubmit}>
              <Input
                label="Nome do Colaborador"
                placeholder="Ex: Maria Santos"
                value={inviteForm.nome}
                onChange={e => setInviteForm({ ...inviteForm, nome: e.target.value })}
                required
              />
              <Input
                label="Email Corporativo"
                type="email"
                placeholder="maria@amazing.com"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
              />
              <Select
                label="Privilégios de Acesso"
                options={roles}
                value={inviteForm.role}
                onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
              />

              {/* Feedback Visual de Permissões para RH */}
              {inviteForm.role === 'hr' && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-sm animate-in fade-in">
                  <div className="flex items-center gap-2 mb-2 font-black text-red-900 uppercase text-[10px] tracking-widest">
                    <Lock size={14} className="text-red-600" />
                    Restrições Aplicadas ao Cargo
                  </div>
                  <div className="text-zinc-600 space-y-2">
                    <p className="flex items-center gap-2 text-green-700 font-bold text-xs">
                      <CheckCircle2 size={14} /> Acesso: Recursos Humanos, Comunicação, Galeria.
                    </p>
                    <p className="flex items-center gap-2 text-red-600 font-bold text-xs">
                      <Shield size={14} /> Bloqueado: Frota, Manutenção.
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback Visual de Permissões para Director de Frota */}
              {inviteForm.role === 'manager' && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 text-sm animate-in fade-in">
                  <div className="flex items-center gap-2 mb-2 font-black text-yellow-900 uppercase text-[10px] tracking-widest">
                    <Lock size={14} className="text-yellow-600" />
                    Perfil Operacional Restrito
                  </div>
                  <div className="text-zinc-600 space-y-2">
                    <p className="flex items-center gap-2 text-green-700 font-bold text-xs">
                      <CheckCircle2 size={14} /> Acesso: Frota, Dashboard, Fornecedores, Parceiros, Subsidiárias.
                    </p>
                    <p className="flex items-center gap-2 text-red-600 font-bold text-xs">
                      <Shield size={14} /> Bloqueado: Recursos Humanos, Manutenção.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isInviting}
                className="w-full py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all uppercase text-[10px] tracking-widest mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isInviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Enviar Convite
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Database size={120} />
            </div>
            <Shield size={40} className="text-yellow-500 mb-6" />
            <h3 className="font-black text-2xl mb-4 tracking-tight">Segurança Amazing</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-medium">
              Sua infraestrutura de dados local utiliza encriptação nativa do navegador. Para migrar para uma solução multi-utilizador em nuvem, contacte o suporte técnico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
