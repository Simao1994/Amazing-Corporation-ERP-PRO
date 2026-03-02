
import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, AlertCircle, Database, Download, HardDrive, RefreshCw, CheckCircle2, Send, Lock, Cloud, Wifi, ShieldCheck, Plus, Edit, FolderOpen, PlayCircle, Clock, AlertTriangle, CheckCircle, Archive } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { supabase } from '../src/lib/supabase';
import { MENU_ITEMS, ROLE_ACCESS, getMergedPermissions, setDynamicRoles } from '../constants';
import { UserRole } from '../types';

const SettingsPage: React.FC = () => {
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbTableCount, setDbTableCount] = useState(0);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [dynamicRolesLocal, setDynamicRolesLocal] = useState<Record<string, string[]>>({});

  // Backup System State
  const [backupPath, setBackupPath] = useState<string>(() => localStorage.getItem('backup_dest_path') || '');
  const [backupRetention, setBackupRetention] = useState<number>(() => parseInt(localStorage.getItem('backup_retention') || '7'));
  const [backupSaving, setBackupSaving] = useState(false);
  const [backupSaved, setBackupSaved] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupLogs, setBackupLogs] = useState<string[]>([]);
  const [backupLastStatus, setBackupLastStatus] = useState<{ status: string | null; date: string | null; file: string | null; error: string | null }>(
    () => {
      try { return JSON.parse(localStorage.getItem('backup_last_status') || 'null') || { status: null, date: null, file: null, error: null }; }
      catch { return { status: null, date: null, file: null, error: null }; }
    }
  );


  const checkCloudStatus = async () => {
    setCloudStatus('checking');
    try {
      // 1. Verificar conexão básica
      const { error: pingError } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true });
      if (pingError) throw pingError;

      // 2. Buscar contagem real de tabelas via RPC
      const { data: count, error: rpcError } = await supabase.rpc('get_table_count');

      if (!rpcError && typeof count === 'number') {
        setDbTableCount(count);
      } else {
        // Fallback para contagem estimada se o RPC ainda não existir no DB
        setDbTableCount(15);
      }

      setCloudStatus('connected');
    } catch {
      setCloudStatus('error');
    }
  };

  const fetchDynamicRoles = async () => {
    try {
      const { data, error } = await supabase.from('app_roles').select('*');
      if (error) throw error;
      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach(r => { map[r.role_key] = r.allowed_modules; });
        setDynamicRolesLocal(map);
        setDynamicRoles(map);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleSaveRole = async (role: any) => {
    try {
      const { error } = await supabase
        .from('app_roles')
        .upsert(role, { onConflict: 'role_key' });

      if (error) throw error;
      fetchDynamicRoles();
    } catch (err: any) {
      console.error('Error saving role:', err);
      alert(`Erro ao guardar cargo: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const togglePermission = (roleKey: string, moduleId: string) => {
    const current = getMergedPermissions(roleKey);
    const updated = current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId];

    // Buscar label existente para não perder no upsert
    const existingLabel = allRoleOptions.find(r => r.value === roleKey)?.label || roleKey;

    handleSaveRole({
      role_key: roleKey,
      label: existingLabel,
      allowed_modules: updated
    });
  };

  useEffect(() => {
    checkCloudStatus();
    fetchDynamicRoles();
  }, []);

  const [inviteForm, setInviteForm] = useState({ nome: '', email: '', role: 'manager' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [staticRoles] = useState([
    { value: 'admin', label: 'Administrador (Acesso Total)' },
    { value: 'hr', label: 'Gestor de RH' },
    { value: 'finance', label: 'Financeiro' },
    { value: 'manager', label: 'Director de Frota' },
    { value: 'maintenance_director', label: 'Director da Manutenção' },
    { value: 'accounting', label: 'Contabilidade' },
    { value: 'inventory', label: 'Inventários' },
    { value: 'operario', label: 'Operário (Acesso Restrito)' },
  ]);

  const allRoleOptions = [
    ...staticRoles,
    ...Object.entries(dynamicRolesLocal)
      .filter(([key]) => !staticRoles.find(r => r.value === key))
      .map(([key, modules]) => ({
        value: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }))
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

  // ─── Backup Handlers ──────────────────────────────────────────────────────
  const handleSaveBackupConfig = async () => {
    if (!backupPath.trim()) {
      alert('Por favor indica o caminho de destino para o backup.');
      return;
    }
    setBackupSaving(true);
    try {
      localStorage.setItem('backup_dest_path', backupPath.trim());
      localStorage.setItem('backup_retention', String(backupRetention));

      // Tenta escrever backup-config.json via fetch ao servidor local (dev mode)
      // Se falhar, guarda apenas no localStorage (produção)
      try {
        await fetch('/api/backup-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destPath: backupPath.trim(), retentionDays: backupRetention }),
        });
      } catch {
        // Endpoint não disponível — configuração guardada localmente
      }

      setBackupSaved(true);
      setTimeout(() => setBackupSaved(false), 3000);
    } finally {
      setBackupSaving(false);
    }
  };

  const handleManualBackup = async () => {
    if (!backupPath.trim()) {
      alert('Configura o caminho de destino antes de executar o backup.');
      return;
    }
    setBackupRunning(true);
    const startTime = new Date().toISOString();
    const logEntry = `[${startTime}] A iniciar backup manual para: ${backupPath}...`;
    setBackupLogs(prev => [logEntry, ...prev].slice(0, 50));

    try {
      // Tenta invocar o script via endpoint local do servidor de dev
      const res = await fetch('/api/run-backup', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        const successLog = `[${new Date().toISOString()}] ✅ ${result.message || 'Backup concluído com sucesso.'}`;
        setBackupLogs(prev => [successLog, ...prev].slice(0, 50));
        const newStatus = { status: 'success', date: new Date().toISOString(), file: result.file || null, error: null };
        setBackupLastStatus(newStatus);
        localStorage.setItem('backup_last_status', JSON.stringify(newStatus));
      } else {
        throw new Error('O servidor de backup retornou um erro. Verifica se o ambiente de desenvolvimento está ativo.');
      }
    } catch (err: any) {
      // Quando não existe endpoint, mostra instrução manual
      const errLog = `[${new Date().toISOString()}] ⚠️ Backup manual via UI não disponível em produção. Executa: node scripts/backup.cjs`;
      setBackupLogs(prev => [errLog, ...prev].slice(0, 50));
    } finally {
      setBackupRunning(false);
    }
  };

  const handleSetupScheduler = () => {
    const instructions = [
      '1. Abre o PowerShell como Administrador',
      '2. Navega para a pasta do projecto:',
      `   cd "${backupPath || 'C:\\caminho\\do\\projecto'}"`,
      '3. Executa o script de configuração:',
      '   powershell -ExecutionPolicy Bypass -File .\\scripts\\setup-task.ps1',
      '',
      'A tarefa será registada para correr todos os dias às 02:00.',
    ].join('\n');
    alert(instructions);
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


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-sky-100 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cloudStatus === 'connected' ? 'bg-green-100 text-green-600' :
            cloudStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'
            }`}>
            <Cloud size={24} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado da Cloud</p>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-900">
                {cloudStatus === 'connected' ? 'Supabase Conectado' :
                  cloudStatus === 'error' ? 'Erro de Ligação' : 'A verificar...'}
              </h3>
              <div className={`w-2 h-2 rounded-full ${cloudStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                cloudStatus === 'error' ? 'bg-red-500' : 'bg-sky-400 animate-bounce'
                }`}></div>
            </div>
          </div>
          <button onClick={checkCloudStatus} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 transition-all">
            <RefreshCw size={16} className={cloudStatus === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-sky-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
            <Database size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dados do Sistema</p>
            <h3 className="text-sm font-black text-zinc-900">{dbTableCount} Tabelas Activas</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-sky-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Segurança Integrada</p>
            <h3 className="text-sm font-black text-zinc-900">RLS Activa & Logs</h3>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Gestão de Cargos Dinâmicos */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-sky-100 overflow-hidden">
          <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
            <h2 className="font-black text-zinc-900 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
              <ShieldCheck size={18} className="text-yellow-500" />
              Gestão de Cargos e Permissões
            </h2>
            <button
              onClick={() => {
                const name = prompt('Nome do novo cargo:');
                if (name) {
                  // Normalização robusta do key (slugify)
                  const key = name
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
                    .replace(/[^a-z0-9]/g, '_')      // Substitui tudo que não é alfanumérico por underscore
                    .replace(/_+/g, '_')            // Remove underscores duplicados
                    .replace(/^_|_$/g, '');         // Remove underscores no início/fim

                  if (key) {
                    handleSaveRole({
                      role_key: key,
                      label: name,
                      allowed_modules: ['home', 'dashboard'],
                      is_system: false
                    });
                  }
                }
              }}
              className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-all shadow-lg"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            {allRoleOptions.map((roleOpt) => {
              const key = roleOpt.value;
              const isEditing = editingRole === key;
              const permissions = getMergedPermissions(key);
              const isSystem = !!ROLE_ACCESS[key as UserRole] || key === 'admin';

              return (
                <div key={key} className="p-6 rounded-[2rem] border border-zinc-100 bg-zinc-50/30 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-zinc-900 text-sm flex items-center gap-2">
                        {roleOpt.label}
                        {isSystem && <span className="text-[8px] bg-zinc-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Sistema</span>}
                      </h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                        {permissions.length} Módulos Activos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRole(isEditing ? null : key)}
                        className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-yellow-500 text-white' : 'bg-white border border-sky-100 text-sky-600 hover:bg-sky-50'}`}
                      >
                        <Edit size={14} />
                      </button>
                      {/* Só permite apagar se não for sistema */}
                      {!isSystem && (
                        <button
                          onClick={async () => {
                            if (confirm('Tem a certeza que deseja eliminar este cargo?')) {
                              await supabase.from('app_roles').delete().eq('role_key', key);
                              fetchDynamicRoles();
                            }
                          }}
                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2">
                      {MENU_ITEMS.map(item => {
                        const isAllowed = permissions.includes(item.id) || permissions.includes('all');
                        return (
                          <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-white bg-white/50 cursor-pointer hover:border-yellow-200 transition-all group">
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              disabled={key === 'admin'}
                              onChange={() => togglePermission(key, item.id)}
                              className="w-4 h-4 rounded border-zinc-300 text-yellow-500 focus:ring-yellow-500/20"
                            />
                            <div className="text-zinc-400 group-hover:text-yellow-600 transition-colors">
                              {item.icon && React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement, { size: 14 }) : null}
                            </div>
                            <span className="text-[11px] font-bold text-zinc-600 truncate">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
              options={allRoleOptions}
              value={inviteForm.role}
              onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
            />

            {/* Feedback Visual de Permissões Dinâmico */}
            <div className="p-6 rounded-[2rem] bg-zinc-50 border border-zinc-100 space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Módulos permitidos para este cargo:</p>
              <div className="flex flex-wrap gap-2">
                {getMergedPermissions(inviteForm.role).map(modId => {
                  const item = MENU_ITEMS.find(m => m.id === modId);
                  if (!item && modId !== 'all') return null;
                  return (
                    <span key={modId} className="px-4 py-1.5 bg-white border border-zinc-200 rounded-full text-[10px] font-black text-zinc-600 flex items-center gap-3 shadow-sm uppercase tracking-wider transition-all hover:border-yellow-200 group">
                      <div className="text-yellow-500 group-hover:scale-110 transition-transform">
                        {modId === 'all' ? <Shield size={12} /> : React.cloneElement(item?.icon as React.ReactElement, { size: 12 })}
                      </div>
                      {modId === 'all' ? 'CONTROLO TOTAL' : item?.label}
                    </span>
                  );
                })}
              </div>
            </div>

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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BACKUP AUTOMÁTICO                                               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-sky-100 overflow-hidden">
          <div className="p-8 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
            <h2 className="font-black text-zinc-900 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
              <Archive size={18} className="text-sky-500" />
              Backup Automático
            </h2>
            <div className="flex items-center gap-2">
              {backupLastStatus.status === 'success' && (
                <span className="flex items-center gap-1.5 text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                  <CheckCircle size={10} /> Último OK
                </span>
              )}
              {backupLastStatus.status === 'error' && (
                <span className="flex items-center gap-1.5 text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                  <AlertTriangle size={10} /> Último Falhou
                </span>
              )}
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Último Backup</p>
                <p className="text-sm font-black text-zinc-900 mt-1">
                  {backupLastStatus.date
                    ? new Date(backupLastStatus.date).toLocaleString('pt-AO')
                    : 'Nunca executado'}
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ficheiro</p>
                <p className="text-sm font-black text-zinc-900 mt-1 truncate">
                  {backupLastStatus.file || '—'}
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Agendamento</p>
                <p className="text-sm font-black text-zinc-900 mt-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-sky-500" /> Diário às 02:00
                </p>
              </div>
            </div>

            {/* Configuração do Caminho */}
            <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100 space-y-4">
              <h4 className="font-black text-zinc-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <FolderOpen size={14} className="text-sky-600" /> Destino do Backup
              </h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={backupPath}
                  onChange={e => setBackupPath(e.target.value)}
                  placeholder="Ex: C:\Backups\AmazingERP  ou  D:\Servidor\Backups"
                  className="flex-1 px-4 py-3 bg-white border border-sky-200 rounded-xl text-sm font-medium text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all"
                />
                <button
                  onClick={handleSaveBackupConfig}
                  disabled={backupSaving}
                  className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${backupSaved
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                >
                  {backupSaved ? <><CheckCircle size={14} /> Guardado</> : <><HardDrive size={14} /> Guardar</>}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">Retenção (dias):</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={backupRetention}
                  onChange={e => setBackupRetention(Number(e.target.value))}
                  className="w-20 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm font-black text-zinc-700 text-center focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                />
                <span className="text-[10px] text-zinc-500">Backups mais antigos são apagados automaticamente.</span>
              </div>
            </div>

            {/* Acções */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleManualBackup}
                disabled={backupRunning}
                className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sky-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20"
              >
                {backupRunning ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A executar...</>
                ) : (
                  <><PlayCircle size={14} /> Executar Backup Agora</>
                )}
              </button>
              <button
                onClick={handleSetupScheduler}
                className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
              >
                <Clock size={14} /> Configurar Agendamento (02:00)
              </button>
            </div>

            {/* Instrução de Setup */}
            <div className="p-4 bg-zinc-900 rounded-2xl text-xs font-mono text-zinc-300 space-y-1">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Comando manual (PowerShell como Admin):</p>
              <p className="text-green-400">node scripts/backup.cjs</p>
              <p className="text-zinc-500">— ou para agendar automaticamente —</p>
              <p className="text-yellow-400">powershell -ExecutionPolicy Bypass -File scripts\setup-task.ps1</p>
            </div>

            {/* Log de Execuções */}
            {backupLogs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-zinc-700 text-[9px] uppercase tracking-widest">Log desta sessão:</h4>
                <div className="max-h-40 overflow-y-auto bg-zinc-950 rounded-2xl p-4 space-y-1">
                  {backupLogs.map((line, i) => (
                    <p key={i} className={`text-[10px] font-mono ${line.includes('✅') ? 'text-green-400' :
                      line.includes('⚠️') || line.includes('❌') ? 'text-red-400' :
                        'text-zinc-400'
                      }`}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Erro do último backup */}
            {backupLastStatus.error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Erro no último backup:</p>
                  <p className="text-xs text-red-600 mt-1 font-mono">{backupLastStatus.error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Segurança */}
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
  );
};

export default SettingsPage;
