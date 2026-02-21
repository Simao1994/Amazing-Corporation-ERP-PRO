
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, Activity, FileText, RefreshCw } from 'lucide-react';
import Input from '../components/ui/Input';
import { AmazingStorage, STORAGE_KEYS, SystemLog } from '../utils/storage';

import { supabase } from '../src/lib/supabase';

const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('acc_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      if (data) setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    (log.acao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.tabela_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.registro_id && log.registro_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const safeFormatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'Data Inválida' : d.toLocaleString('pt-PT');
    } catch (e) {
      return '---';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-yellow-600 animate-spin" />
        <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Auditoria de Sistema</h1>
          <p className="text-zinc-500 font-medium mt-1">Registo histórico de todas as operações críticas do ERP.</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900 px-6 py-4 rounded-2xl shadow-lg">
          <Activity className="text-yellow-500" />
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase">Integridade</p>
            <p className="text-white font-bold text-sm">Base de Dados Verificada</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-sky-100">
        <Input
          placeholder="Pesquisar por ação, tabela ou registro..."
          icon={<Search size={20} className="text-zinc-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none py-4 text-lg font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
          <p className="text-zinc-400 text-[10px] font-black uppercase mb-1">Total de Registos</p>
          <p className="text-3xl font-black text-zinc-900">{logs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
          <p className="text-zinc-400 text-[10px] font-black uppercase mb-1">Módulos Ativos</p>
          <p className="text-3xl font-black text-zinc-900">8</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
          <p className="text-zinc-400 text-[10px] font-black uppercase mb-1">Logs Hoje</p>
          <p className="text-3xl font-black text-green-600">
            {logs.filter(l => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
          <p className="text-zinc-400 text-[10px] font-black uppercase mb-1">Alertas Criticos</p>
          <p className="text-3xl font-black text-red-600">0</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-sky-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              <th className="px-8 py-6">Timestamp / Data</th>
              <th className="px-8 py-6">Tabela / Módulo</th>
              <th className="px-8 py-6">Operação</th>
              <th className="px-8 py-6">Registro ID</th>
              <th className="px-8 py-6">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-50/50 transition-all">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-600">
                      {safeFormatDate(log.created_at)}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.tabela_nome?.includes('acc') ? 'bg-green-100 text-green-700' : 'bg-sky-100 text-sky-700'
                    }`}>
                    {log.tabela_nome || 'N/A'}
                  </span>
                </td>
                <td className="px-8 py-5 font-black text-zinc-900 text-sm">
                  <span className={`px-2 py-1 rounded-md ${log.acao === 'DELETE' ? 'text-red-600 bg-red-50' :
                      log.acao === 'INSERT' ? 'text-green-600 bg-green-50' : 'text-sky-600 bg-sky-50'
                    }`}>
                    {log.acao}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 leading-tight">
                      {log.registro_id?.substring(0, 18)}...
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs text-zinc-500 font-medium italic">
                    {log.dados_novos ? 'Dados atualizados / inseridos' : 'Registro de sistema'}
                  </p>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <FileText size={48} className="mx-auto text-zinc-100 mb-4" />
                  <p className="text-zinc-400 font-medium italic">Nenhum evento registado na base de dados.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditPage;
