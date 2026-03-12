
import React, { useState, useEffect } from 'react';
import { Inbox, MessageSquare, Trash2, Check, X, ShieldCheck, Star, RefreshCw } from 'lucide-react';
import { Solicitacao, Testemunho } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';

const RequestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'testemunhos'>('solicitacoes');

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [testemunhos, setTestemunhos] = useState<Testemunho[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequestsData = async () => {
    setLoading(true);
    try {
      const { data: solData, error: solError } = await supabase.from('solicitacoes').select('*').order('created_at', { ascending: false });
      if (solError) throw solError;
      if (solData) {
        setSolicitacoes(solData.map((s: any) => ({
          id: s.id,
          nome: s.nome,
          email: s.email,
          assunto: s.assunto,
          mensagem: s.mensagem,
          status: s.status as any,
          data: s.created_at
        })));
      }

      const { data: testData, error: testError } = await supabase.from('testemunhos').select('*').order('created_at', { ascending: false });
      if (testError) throw testError;
      setTestemunhos(testData || []);

    } catch (error) {
      console.error('Error fetching requests data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestsData();
  }, []);

  const toggleSolicitacao = async (id: string) => {
    const current = solicitacoes.find(s => s.id === id);
    if (!current) return;

    const newStatus = current.status === 'pendente' ? 'resolvido' : 'pendente';

    try {
      const { error } = await supabase.from('solicitacoes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      fetchRequestsData();
      AmazingStorage.logAction('Actualização', 'Solicitações', `Estado do ticket ${id} alterado para ${newStatus}`);
    } catch (err) {
      alert('Erro ao atualizar solicitação');
    }
  };

  const approveTestimonial = async (id: string) => {
    const current = testemunhos.find(t => t.id === id);
    if (!current) return;

    try {
      const { error } = await supabase.from('testemunhos').update({ aprovado: !current.aprovado }).eq('id', id);
      if (error) throw error;
      fetchRequestsData();
      AmazingStorage.logAction('Moderação', 'Depoimentos', `Visibilidade do depoimento ${id} alterada`);
    } catch (err) {
      alert('Erro ao atualizar depoimento');
    }
  };

  const toggleStar = async (id: string) => {
    const current = testemunhos.find(t => t.id === id);
    if (!current) return;

    try {
      const { error } = await supabase.from('testemunhos').update({ destaque: !current.destaque }).eq('id', id);
      if (error) throw error;
      fetchRequestsData();
    } catch (err) {
      alert('Erro ao destacar depoimento');
    }
  };

  const deleteSolicitacao = async (id: string) => {
    if (confirm('Eliminar esta solicitação permanentemente?')) {
      try {
        const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
        if (error) throw error;
        fetchRequestsData();
        AmazingStorage.logAction('Eliminação', 'Solicitações', `Ticket ${id} removido do sistema`);
      } catch (err) {
        alert('Erro ao remover solicitação');
      }
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (confirm('Eliminar este depoimento permanentemente?')) {
      try {
        const { error } = await supabase.from('testemunhos').delete().eq('id', id);
        if (error) throw error;
        fetchRequestsData();
      } catch (err) {
        alert('Erro ao remover depoimento');
      }
    }
  };

  // Carregamento não-bloqueante

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Central de Atendimento</h1>
          <p className="text-zinc-500 font-medium mt-1">Gestão de mensagens de clientes e moderação de depoimentos.</p>
        </div>
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-sky-100">
          <button
            onClick={() => setActiveTab('solicitacoes')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'solicitacoes' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Inbox size={16} /> Tickets ({solicitacoes.filter(s => s.status === 'pendente').length})
          </button>
          <button
            onClick={() => setActiveTab('testemunhos')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'testemunhos' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <MessageSquare size={16} /> Moderação ({testemunhos.filter(t => !t.aprovado).length})
          </button>
        </div>
      </div>

      {activeTab === 'solicitacoes' ? (
        <div className="grid grid-cols-1 gap-4">
          {loading && solicitacoes.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <RefreshCw className="mx-auto w-10 h-10 text-sky-500 animate-spin" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">A recuperar tickets de suporte...</p>
            </div>
          ) : solicitacoes.length > 0 ? [...solicitacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(s => (
            <div key={s.id} className={`bg-white p-8 rounded-[2rem] border border-sky-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-xl transition-all ${s.status === 'resolvido' ? 'opacity-60 grayscale' : ''}`}>
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {s.status}
                  </span>
                  <span className="text-zinc-400 text-xs font-bold">{new Date(s.data).toLocaleString('pt-PT')}</span>
                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">ID: {s.id}</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">{s.assunto}</h3>
                  <p className="text-zinc-500 font-bold text-sm mb-4">De: {s.nome} (<a href={`mailto:${s.email}`} className="text-sky-600 hover:underline">{s.email}</a>)</p>
                  <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-6 rounded-2xl font-medium italic border-l-4 border-yellow-500">
                    "{s.mensagem}"
                  </p>
                </div>
              </div>
              <div className="flex md:flex-col justify-end gap-2">
                <button
                  onClick={() => toggleSolicitacao(s.id)}
                  className={`p-4 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${s.status === 'pendente' ? 'bg-green-500 text-white shadow-green-500/20 shadow-lg hover:bg-green-600' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
                >
                  <Check size={20} /> {s.status === 'pendente' ? 'Resolver' : 'Marcar Pendente'}
                </button>
                <button
                  onClick={() => deleteSolicitacao(s.id)}
                  className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                  title="Eliminar Ticket"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-sky-100">
              <Inbox size={48} className="mx-auto text-sky-100 mb-4" />
              <p className="text-zinc-400 font-bold italic">Nenhuma solicitação pendente no momento.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && testemunhos.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <RefreshCw className="mx-auto w-10 h-10 text-sky-500 animate-spin" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">A processar depoimentos...</p>
            </div>
          ) : testemunhos.length > 0 ? testemunhos.map(t => (
            <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col group relative overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <img src={t.avatar} className="w-12 h-12 rounded-full border-2 border-yellow-500" alt={t.nome} />
                  <div>
                    <h4 className="font-bold text-sm">{t.nome}</h4>
                    <p className="text-[10px] text-zinc-400 font-black uppercase">{t.empresa}</p>
                  </div>
                </div>
                <div className="flex gap-1 relative z-10">
                  <button onClick={() => toggleStar(t.id)} className={`p-2 rounded-xl transition-all ${t.destaque ? 'text-yellow-500' : 'text-zinc-200 hover:text-yellow-200'}`} title="Destacar na Home">
                    <Star size={18} fill={t.destaque ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => approveTestimonial(t.id)} className={`p-2 rounded-xl transition-all ${t.aprovado ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`} title={t.aprovado ? 'Ocultar' : 'Publicar'}>
                    <ShieldCheck size={18} />
                  </button>
                  <button onClick={() => deleteTestimonial(t.id)} className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <p className="text-zinc-600 text-sm font-medium italic mb-6 leading-relaxed flex-1">"{t.texto}"</p>
              <div className="pt-4 border-t border-zinc-50 flex justify-between items-center">
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${t.aprovado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {t.aprovado ? 'Publicado' : 'Pendente'}
                </span>
                {t.destaque && <span className="text-[8px] font-black uppercase text-yellow-600">★ Destaque</span>}
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-sky-100">
              <MessageSquare size={48} className="mx-auto text-sky-100 mb-4" />
              <p className="text-zinc-400 font-bold italic">Nenhum testemunho recebido.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
