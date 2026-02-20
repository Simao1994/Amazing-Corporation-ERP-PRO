
import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, AlertCircle, Database, Download, HardDrive, RefreshCw, CheckCircle2, Send, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { AmazingStorage } from '../utils/storage';

const SettingsPage: React.FC = () => {
  const [dbStats, setDbStats] = useState<{key: string, size: string}[]>([]);
  
  // Estado para o formulário de convite
  const [inviteForm, setInviteForm] = useState({
    nome: '',
    email: '',
    role: 'manager'
  });
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

  const keys = [
    'amazing_funcionarios', 
    'amazing_departamentos', 
    'amazing_motoqueiros', 
    'amazing_notas', 
    'amazing_manutencao', 
    'amazing_inventario',
    'amazing_municipios',
    'amazing_grupos_frota',
    'amazing_user',
    'amazing_parceiros',
    'amazing_fornecedores'
  ];

  const updateStats = () => {
    const stats = keys.map(key => {
      const data = localStorage.getItem(key);
      const size = data ? (data.length / 1024).toFixed(2) + ' KB' : '0 KB';
      return { key, size };
    });
    setDbStats(stats);
  };

  useEffect(() => {
    updateStats();
  }, []);

  const handleClearDatabase = () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os dados do ERP salvos neste navegador. Esta ação é irreversível. Deseja continuar?')) {
      keys.forEach(k => localStorage.removeItem(k));
      alert('Sistema resetado! Recarregando...');
      window.location.reload();
    }
  };

  const downloadBackup = () => {
    const backup: any = {};
    keys.forEach(k => {
      const data = localStorage.getItem(k);
      if (data) {
        try {
          backup[k] = JSON.parse(data);
        } catch {
          backup[k] = data;
        }
      }
    });
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amazing_erp_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.nome || !inviteForm.email) {
      alert("Por favor preencha o nome e o email.");
      return;
    }

    setIsInviting(true);

    // Simulação de chamada de API e envio de email
    setTimeout(() => {
      AmazingStorage.logAction(
        'Segurança', 
        'Acessos', 
        `Convite de acesso (${inviteForm.role}) enviado para ${inviteForm.email}`
      );
      
      setIsInviting(false);
      setInviteSuccess(true);
      setInviteForm({ nome: '', email: '', role: 'manager' }); // Reset form

      // Remove mensagem de sucesso após 3 segundos
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
            <Download size={16} /> Exportar Backup
          </button>
          <button 
            onClick={handleClearDatabase}
            className="px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
          >
            <Trash2 size={16} /> Resetar Base
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Database Monitor */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-sky-100 overflow-hidden">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
              <h2 className="font-black text-zinc-900 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <HardDrive size={18} className="text-yellow-500" /> 
                Monitor de Armazenamento
              </h2>
              <button onClick={updateStats} className="text-zinc-400 hover:text-zinc-600 transition-colors"><RefreshCw size={16}/></button>
            </div>
            <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {dbStats.map((stat) => (
                <div key={stat.key} className="p-5 bg-zinc-50/50 rounded-2xl border border-zinc-100 group hover:border-yellow-200 transition-all">
                  <p className="text-[9px] font-black text-zinc-400 uppercase truncate mb-1" title={stat.key}>
                    {stat.key.replace('amazing_', '')}
                  </p>
                  <p className="text-xl font-black text-zinc-900">{stat.size}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100 flex items-start gap-6">
            <div className="p-4 bg-red-100 rounded-2xl text-red-600">
              <AlertCircle size={28} />
            </div>
            <div>
              <p className="text-sm font-black text-red-900 uppercase tracking-widest mb-1">Zona de Segurança</p>
              <p className="text-xs text-red-600 font-medium leading-relaxed">
                Este ERP armazena dados exclusivamente no navegador local (LocalStorage). 
                Recomendamos a exportação de um Backup JSON semanalmente para evitar perda de dados em caso de limpeza do cache do navegador.
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
                onChange={e => setInviteForm({...inviteForm, nome: e.target.value})}
                required
              />
              <Input 
                label="Email Corporativo" 
                type="email" 
                placeholder="maria@amazing.com" 
                value={inviteForm.email}
                onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                required
              />
              <Select 
                label="Privilégios de Acesso" 
                options={roles} 
                value={inviteForm.role}
                onChange={e => setInviteForm({...inviteForm, role: e.target.value})}
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
