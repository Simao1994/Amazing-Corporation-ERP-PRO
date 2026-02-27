
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
   Gamepad2, Plus, Search, Edit, Trash2, TrendingUp, DollarSign,
   BarChart3, ShieldCheck, X, Save, LayoutGrid, Trophy, Award,
   Monitor, Users, Activity, PieChart as PieIcon,
   ArrowUpRight, ArrowDownRight, CreditCard, Clock, Camera,
   Settings, History, Filter, Download, Zap, RefreshCw, Medal,
   UserPlus, Star, ImageIcon, Eye, EyeOff,
   CheckCircle2, AlertCircle, Copy, Check, FileText
} from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
   AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Game, ArenaTournament, ArenaRanking, GameStatus } from '../types';

// Tipo local para pagamentos da nova tabela
interface ArenaPagamento {
   id: string;
   game_id: string;
   game_titulo: string;
   tipo: 'jogo' | 'torneio';
   valor: number;
   metodo_pagamento: string;
   referencia_transacao: string;
   status: 'Pendente' | 'Confirmado' | 'Falhado' | 'Cancelado';
   cliente_nome: string;
   cliente_telefone?: string;
   notas_admin?: string;
   criado_em: string;
   confirmado_em?: string;
}

interface ArenaDespesa {
   id: string;
   descricao: string;
   valor: number;
   categoria: 'Manutenção' | 'Pessoal' | 'Marketing' | 'Outros';
   data: string;
}

const FUNCTIONS_URL = 'https://jgktemwegesmmomlftgt.supabase.co/functions/v1';
const ADMIN_KEY = 'amazing-arena-admin-2026';
import { supabase } from '../src/lib/supabase';
import { formatAOA } from '../constants';

const ArenaAdmin: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'analytics' | 'catalog' | 'tournaments' | 'payments' | 'ranking'>('analytics');
   const [financeView, setFinanceView] = useState<'payments' | 'expenses'>('payments');
   const [searchTerm, setSearchTerm] = useState('');
   const [loading, setLoading] = useState(true);

   // States de Dados
   const [games, setGames] = useState<Game[]>([]);
   const [payments, setPayments] = useState<ArenaPagamento[]>([]);
   const [tournaments, setTournaments] = useState<ArenaTournament[]>([]);
   const [rankings, setRankings] = useState<ArenaRanking[]>([]);
   const [expenses, setExpenses] = useState<ArenaDespesa[]>([]);

   // Pagamentos — filtros, recibo e loading
   const [pagamentoFilter, setPagamentoFilter] = useState<'Todos' | 'Pendente' | 'Confirmado' | 'Falhado'>('Todos');
   const [selectedPagamento, setSelectedPagamento] = useState<ArenaPagamento | null>(null);
   const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
   const [copiedRef, setCopiedRef] = useState(false);

   // Modals e Edição
   const [showGameModal, setShowGameModal] = useState(false);
   const [editingGame, setEditingGame] = useState<Game | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [showTournamentModal, setShowTournamentModal] = useState(false);
   const [editingTournament, setEditingTournament] = useState<ArenaTournament | null>(null);
   const [showRankingModal, setShowRankingModal] = useState(false);
   const [editingRanking, setEditingRanking] = useState<ArenaRanking | null>(null);

   const [showExpenseModal, setShowExpenseModal] = useState(false);

   const fetchData = async () => {
      setLoading(true);
      try {
         const [
            { data: gms },
            { data: pays },
            { data: trns },
            { data: rnks },
            { data: exps }
         ] = await Promise.all([
            supabase.from('arena_games').select('*').order('titulo'),
            supabase.from('arena_pagamentos').select('*').order('criado_em', { ascending: false }),
            supabase.from('arena_tournaments').select('*').order('data_inicio', { ascending: false }),
            supabase.from('arena_ranking').select('*').order('rank', { ascending: true }),
            supabase.from('arena_expenses').select('*').order('data', { ascending: false })
         ]);

         if (gms) setGames(gms as unknown as Game[]);
         if (pays) setPayments(pays as unknown as ArenaPagamento[]);
         if (trns) setTournaments(trns as unknown as ArenaTournament[]);
         if (rnks) setRankings(rnks as unknown as ArenaRanking[]);
         if (exps) setExpenses(exps as unknown as ArenaDespesa[]);
      } catch (error) {
         console.error('Error fetching admin arena data:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   // --- MOTOR DE ANALYTICS (DADOS REAIS) ---
   const bizStats = useMemo(() => {
      const revenue = payments.filter(p => p.status === 'Confirmado').reduce((a, b) => a + Number(b.valor), 0);
      const totalExpenses = expenses.reduce((a, b) => a + Number(b.valor), 0);
      const profit = revenue - totalExpenses;
      const pendentes = payments.filter(p => p.status === 'Pendente').length;
      const activePlayers = [...new Set(payments.map(p => p.cliente_nome))].length;

      const gameSales: Record<string, number> = {};
      const categorySales: Record<string, number> = {};

      payments.filter(p => p.status === 'Confirmado').forEach(p => {
         gameSales[p.game_titulo] = (gameSales[p.game_titulo] || 0) + Number(p.valor);
         // Encontrar categoria do jogo
         const game = games.find(g => g.titulo === p.game_titulo);
         if (game) {
            categorySales[game.categoria] = (categorySales[game.categoria] || 0) + Number(p.valor);
         }
      });

      const pieData = Object.entries(gameSales)
         .map(([name, value]) => ({ name, value }))
         .sort((a, b) => b.value - a.value)
         .slice(0, 5);

      const categoryData = Object.entries(categorySales)
         .map(([name, value]) => ({ name, value }))
         .sort((a, b) => b.value - a.value);

      const totalEstacoes = games.reduce((acc, g) => acc + (g.vagas_disponiveis || 0), 0);
      const taxaOcupacao = totalEstacoes > 0 ? 75 : 0;

      return { revenue, totalExpenses, profit, activePlayers, pieData, categoryData, taxaOcupacao, pendentes };
   }, [payments, games, expenses]);

   // --- ACÇÕES DE PAGAMENTO (via Edge Function) ---
   const handleConfirmarPagamento = async (p: ArenaPagamento) => {
      if (!confirm(`Confirmar pagamento de ${p.cliente_nome} — Ref: ${p.referencia_transacao}?`)) return;
      setConfirmandoId(p.id);
      try {
         const res = await fetch(`${FUNCTIONS_URL}/arena-confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
            body: JSON.stringify({ pagamento_id: p.id, action: 'confirmar' })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error);
         fetchData();
         setSelectedPagamento(null);
         alert('✅ Pagamento confirmado! Vagas actualizadas.');
      } catch (err: any) {
         alert('Erro: ' + err.message);
      } finally {
         setConfirmandoId(null);
      }
   };

   const handleRejeitarPagamento = async (p: ArenaPagamento) => {
      if (!confirm(`Rejeitar pagamento de ${p.cliente_nome}? Esta acção não pode ser desfeita.`)) return;
      setConfirmandoId(p.id);
      try {
         const res = await fetch(`${FUNCTIONS_URL}/arena-confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
            body: JSON.stringify({ pagamento_id: p.id, action: 'rejeitar', notas_admin: 'Rejeitado pelo administrador' })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error);
         fetchData();
         setSelectedPagamento(null);
      } catch (err: any) {
         alert('Erro: ' + err.message);
      } finally {
         setConfirmandoId(null);
      }
   };

   const pagamentosFiltrados = useMemo(() =>
      payments.filter(p => pagamentoFilter === 'Todos' || p.status === pagamentoFilter),
      [payments, pagamentoFilter]
   );

   // --- CRUD JOGOS ---
   const handleSaveGame = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingGame;

      const payload = {
         titulo: fd.get('titulo') as string,
         descricao: fd.get('descricao') as string,
         historico: fd.get('historico') as string,
         categoria: fd.get('categoria') as string,
         imagem_url: imagePreview || editingGame?.imagem_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
         preco_sessao: Number(fd.get('preco')),
         tempo_minutos: Number(fd.get('tempo')),
         status: (fd.get('status') as GameStatus) || 'Ativo',
         vagas_disponiveis: Number(fd.get('vagas'))
      };

      try {
         if (isEditing) {
            const { error } = await supabase.from('arena_games').update(payload).eq('id', editingGame.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('arena_games').insert([payload]);
            if (error) throw error;
         }
         setShowGameModal(false);
         setEditingGame(null);
         setImagePreview(null);
         fetchData();
      } catch (error: any) {
         console.error('Erro detalhado ao salvar jogo:', error);
         alert('Erro ao salvar jogo: ' + (error.message || 'Verifique a consola.'));
      }
   };

   const handleDeleteGame = async (id: string, titulo: string) => {
      if (confirm(`Remover "${titulo}" do catálogo permanentemente?`)) {
         try {
            await supabase.from('arena_games').delete().eq('id', id);
            fetchData();
         } catch (error) {
            alert('Erro ao remover jogo');
         }
      }
   };

   // --- CRUD RANKING ---
   const handleSaveRanking = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingRanking;

      const newScore = Number(fd.get('score'));
      const payload = {
         player_name: fd.get('player_name') as string,
         score: newScore,
         last_game: fd.get('last_game') as string,
      };

      try {
         // 1. Guardar ou Atualizar o jogador ativo (posição temporária)
         if (isEditing) {
            await supabase.from('arena_ranking').update(payload).eq('id', editingRanking.id);
         } else {
            await supabase.from('arena_ranking').insert([{ ...payload, rank: 9999 }]); // Rank temporário no fundo
         }

         // 2. Extrair toda a gente para recalcular a matemática do Ranking Global
         const { data: allPlayers } = await supabase.from('arena_ranking').select('*').order('score', { ascending: false });

         // 3. Impor Posições (1, 2, 3...) pela ordem dos Pontos
         if (allPlayers && allPlayers.length > 0) {
            const updates = allPlayers.map((player, index) => ({
               id: player.id,
               player_name: player.player_name,
               score: player.score,
               last_game: player.last_game,
               rank: index + 1
            }));

            // Upsert massivo para reescrever as posições oficiais de todos ao mesmo tempo
            const { error: upsertError } = await supabase.from('arena_ranking').upsert(updates);
            if (upsertError) throw upsertError;
         }

         setShowRankingModal(false);
         setEditingRanking(null);
         fetchData(); // Atualiza a tabela na UI
      } catch (error) {
         console.error('Erro no recalculo de vitórias:', error);
         alert('Erro ao salvar e ordenar o ranking global.');
      }
   };

   const handleDeleteRanking = async (id: string, name: string) => {
      if (confirm(`Remover "${name}" do Ranking?`)) {
         try {
            // 1. Apagar o jogador
            await supabase.from('arena_ranking').delete().eq('id', id);

            // 2. Extrair os restantes para recalcular a matemática do Ranking Global
            const { data: allPlayers } = await supabase.from('arena_ranking').select('*').order('score', { ascending: false });

            // 3. Impor Posições (1, 2, 3...) pela ordem dos Pontos
            if (allPlayers && allPlayers.length > 0) {
               const updates = allPlayers.map((player, index) => ({
                  id: player.id,
                  player_name: player.player_name,
                  score: player.score,
                  last_game: player.last_game,
                  rank: index + 1
               }));

               const { error: upsertError } = await supabase.from('arena_ranking').upsert(updates);
               if (upsertError) throw upsertError;
            }

            fetchData();
         } catch (error) {
            console.error('Erro na deleção de vitória:', error);
            alert('Erro ao remover do ranking');
         }
      }
   };

   // --- CRUD TORNEIOS ---
   const handleSaveTournament = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingTournament;

      const gameId = fd.get('game_id') as string;
      const selectedGame = games.find(g => g.id === gameId);

      const payload = {
         titulo: fd.get('titulo') as string,
         game_id: gameId,
         jogo: selectedGame ? selectedGame.titulo : '', // Associa o nome do jogo
         data_inicio: fd.get('data_inicio') as string,
         hora_inicio: (fd.get('hora_inicio') as string) || null,
         data_fim: fd.get('data_fim') as string,
         hora_fim: (fd.get('hora_fim') as string) || null,
         premio: fd.get('premio') as string,
         status: (fd.get('status') as any) || 'Inscrições',
         vagas: Number(fd.get('vagas')),
         vencedor: fd.get('vencedor') as string || undefined
      };

      try {
         if (isEditing) {
            const { error } = await supabase.from('arena_tournaments').update(payload).eq('id', editingTournament.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('arena_tournaments').insert([payload]);
            if (error) throw error;
         }
         setShowTournamentModal(false);
         setEditingTournament(null);
         fetchData();
      } catch (error: any) {
         console.error('Erro detalhado ao salvar torneio:', error);
         alert('Erro ao salvar torneio: ' + (error.message || 'Verifique a consola.'));
      }
   };

   const handleDeleteTournament = async (id: string, titulo: string) => {
      if (confirm(`Eliminar o torneio "${titulo}" e todos os registos associados?`)) {
         try {
            const { error } = await supabase.from('arena_tournaments').delete().eq('id', id);
            if (error) throw error;
            fetchData();
         } catch (error) {
            console.error('Error deleting tournament:', error);
            alert('Erro ao eliminar torneio.');
         }
      }
   };

   const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const payload = {
         descricao: fd.get('descricao') as string,
         valor: Number(fd.get('valor')),
         categoria: fd.get('categoria') as any,
         data: fd.get('data') as string
      };

      try {
         await supabase.from('arena_expenses').insert([payload]);
         setShowExpenseModal(false);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar despesa');
      }
   };

   const handleDeleteExpense = async (id: string) => {
      if (confirm('Remover registo de despesa?')) {
         try {
            await supabase.from('arena_expenses').delete().eq('id', id);
            fetchData();
         } catch (error) {
            alert('Erro ao remover despesa');
         }
      }
   };

   const COLORS = ['#6366f1', '#eab308', '#22c55e', '#ef4444', '#a855f7'];

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-24">
         {/* HEADER DE COMANDO */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-zinc-900 rounded-[1.5rem] shadow-2xl border border-white/10 text-indigo-500">
                  <Monitor size={32} />
               </div>
               <div>
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase leading-none">AMAZING ARENA <span className="text-indigo-600">GAMER</span></h1>
                  <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1">
                     <ShieldCheck size={14} className="text-green-600" /> Painel de Controle e Faturamento
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               {[
                  { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Relatórios' },
                  { id: 'catalog', icon: <LayoutGrid size={18} />, label: 'Catálogo' },
                  { id: 'tournaments', icon: <Trophy size={18} />, label: 'Torneios' },
                  { id: 'ranking', icon: <Medal size={18} />, label: 'Ranking' },
                  { id: 'payments', icon: <DollarSign size={18} />, label: 'Financeiro' },
               ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'}`}>{tab.icon} {tab.label}</button>
               ))}
            </div>
         </div>

         {/* DASHBOARD ANALYTICS */}
         {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Faturamento (Bruto)</p>
                     <p className="text-3xl font-black text-zinc-900">{formatAOA(bizStats.revenue)}</p>
                     <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit"><ArrowUpRight size={12} /> Confirmados</div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Despesas Totais</p>
                     <p className="text-3xl font-black text-red-500">{formatAOA(bizStats.totalExpenses)}</p>
                     <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg w-fit"><ArrowDownRight size={12} /> Operacional</div>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                     <Zap className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                     <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">Lucro Líquido</p>
                     <p className="text-4xl font-black">{formatAOA(bizStats.profit)}</p>
                     <p className="text-[9px] font-bold text-zinc-500 mt-2 uppercase">Margem de Operação</p>
                  </div>
                  <div className={`p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center items-center text-center border ${bizStats.pendentes > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-sky-100'}`}>
                     <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${bizStats.pendentes > 0 ? 'text-yellow-600' : 'text-zinc-400'}`}>Pendentes</p>
                     <p className={`text-4xl font-black ${bizStats.pendentes > 0 ? 'text-yellow-600' : 'text-zinc-900'}`}>{bizStats.pendentes}</p>
                     <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">Aguardam confirmação</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[450px] flex flex-col">
                     <h3 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-2"><PieIcon className="text-indigo-500" size={20} /> Distribuição por Popularidade</h3>
                     <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={bizStats.pieData.length > 0 ? bizStats.pieData : [{ name: 'Sem dados', value: 1 }]}
                                 cx="50%" cy="50%"
                                 innerRadius={70}
                                 outerRadius={120}
                                 paddingAngle={5}
                                 dataKey="value"
                                 stroke="none"
                              >
                                 {bizStats.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[450px]">
                     <h3 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-2"><BarChart3 className="text-indigo-500" size={20} /> Receita por Categoria</h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={bizStats.categoryData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'black' }} />
                           <YAxis hide />
                           <Tooltip formatter={(v: number) => formatAOA(v)} cursor={{ fill: '#f3f4f6' }} />
                           <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         )}

         {/* CATÁLOGO ADMIN */}
         {activeTab === 'catalog' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100 w-full flex items-center">
                     <Search className="ml-6 text-zinc-300" />
                     <input
                        placeholder="Pesquisar títulos no sistema..."
                        className="w-full bg-transparent border-none focus:ring-0 py-4 px-4 text-zinc-900 font-bold"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <button
                     onClick={() => { setEditingGame(null); setImagePreview(null); setShowGameModal(true); }}
                     className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 shadow-xl flex items-center gap-3 transition-all"
                  >
                     <Plus size={20} /> Novo Jogo
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {games.filter(g => g.titulo.toLowerCase().includes(searchTerm.toLowerCase())).map(game => (
                     <div key={game.id} className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all">
                        <div className="h-48 relative overflow-hidden">
                           <img src={game.imagem_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                           <div className="absolute top-4 right-4 flex gap-2">
                              <button onClick={() => { setEditingGame(game); setImagePreview(game.imagem_url); setShowGameModal(true); }} className="p-3 bg-white/80 backdrop-blur-md rounded-2xl text-zinc-900 hover:bg-indigo-600 hover:text-white transition-all"><Edit size={16} /></button>
                              <button onClick={() => handleDeleteGame(game.id, game.titulo)} className="p-3 bg-white/80 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                           </div>
                           <div className="absolute bottom-4 left-6">
                              <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${game.status === 'Ativo' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{game.status}</span>
                           </div>
                        </div>
                        <div className="p-8 space-y-4">
                           <div className="flex justify-between items-start">
                              <h3 className="text-xl font-black text-zinc-900">{game.titulo}</h3>
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{game.categoria}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-4 border-y border-zinc-50 py-4">
                              <div>
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Tarifa</p>
                                 <p className="text-sm font-bold text-zinc-900">{formatAOA(game.preco_sessao)}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Estações</p>
                                 <p className="text-sm font-bold text-zinc-900">{game.vagas_disponiveis} Slots</p>
                              </div>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-400">
                                 <Clock size={12} /> {game.tempo_minutos} min / sessão
                              </div>
                              <div className="flex items-center gap-1 text-yellow-500">
                                 <Star size={12} fill="currentColor" />
                                 <span className="text-[10px] font-black">{game.popularidade}%</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* FINANCEIRO / PAGAMENTOS ADMIN */}
         {activeTab === 'payments' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               {/* Header com filtros */}
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex bg-zinc-100 p-1 rounded-2xl w-fit">
                     <button onClick={() => setFinanceView('payments')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financeView === 'payments' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}>Receitas / Pagamentos</button>
                     <button onClick={() => setFinanceView('expenses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financeView === 'expenses' ? 'bg-white text-red-600 shadow-md' : 'text-zinc-400 hover:text-red-400'}`}>Despesas / Custos</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <button
                        onClick={() => setShowExpenseModal(true)}
                        className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg"
                     >
                        <Plus size={14} /> Registar Gasto
                     </button>
                     {financeView === 'payments' && (['Todos', 'Pendente', 'Confirmado', 'Falhado'] as const).map(f => (
                        <button key={f} onClick={() => setPagamentoFilter(f)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${pagamentoFilter === f
                           ? f === 'Pendente' ? 'bg-yellow-500 text-white shadow-xl' :
                              f === 'Confirmado' ? 'bg-green-600 text-white shadow-xl' :
                                 f === 'Falhado' ? 'bg-red-500 text-white shadow-xl' :
                                    'bg-zinc-900 text-white shadow-xl'
                           : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                           }`}>
                           {f === 'Pendente' && <span className="inline-block w-1.5 h-1.5 bg-current rounded-full mr-1.5 animate-pulse" />}
                           {f}
                        </button>
                     ))}
                     <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-400 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 transition-all"><Download size={14} /></button>
                  </div>
               </div>

               {/* Tabela */}
               {financeView === 'payments' ? (
                  <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              <th className="px-8 py-6">Referência / Data</th>
                              <th className="px-8 py-6">Cliente</th>
                              <th className="px-8 py-6">Jogo / Método</th>
                              <th className="px-8 py-6 text-right">Valor</th>
                              <th className="px-8 py-6 text-center">Estado</th>
                              <th className="px-8 py-6 text-center">Acções</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                           {pagamentosFiltrados.length === 0 ? (
                              <tr><td colSpan={6} className="text-center py-16 text-zinc-400 text-sm font-medium">Nenhum pagamento encontrado</td></tr>
                           ) : pagamentosFiltrados.map(p => {
                              const isPendente = p.status === 'Pendente';
                              const isProcessing = confirmandoId === p.id;
                              return (
                                 <tr key={p.id} className={`hover:bg-zinc-50/50 transition-all ${isPendente ? 'bg-yellow-50/30' : ''}`}>
                                    <td className="px-8 py-5">
                                       <p className="text-[10px] font-black text-indigo-600 mb-1 font-mono">{p.referencia_transacao || '—'}</p>
                                       <p className="text-xs font-bold text-zinc-500">{new Date(p.criado_em).toLocaleString('pt-AO')}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                       <p className="font-black text-zinc-900 text-sm">{p.cliente_nome}</p>
                                       <p className="text-[10px] text-zinc-400 font-bold">{p.cliente_telefone}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                       <p className="text-sm font-bold text-indigo-600">{p.game_titulo}</p>
                                       <p className="text-[10px] text-zinc-400 font-black uppercase">{p.metodo_pagamento}</p>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-zinc-900 text-sm">{formatAOA(p.valor)}</td>
                                    <td className="px-8 py-5 text-center">
                                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'Confirmado' ? 'bg-green-100 text-green-700' :
                                          p.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
                                             p.status === 'Falhado' ? 'bg-red-100 text-red-700' :
                                                'bg-zinc-100 text-zinc-500'
                                          }`}>
                                          {isPendente && <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1 animate-pulse" />}
                                          {p.status}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5">
                                       <div className="flex items-center justify-center gap-2">
                                          <button onClick={() => setSelectedPagamento(p)} className="p-2 text-zinc-400 hover:text-indigo-600 bg-zinc-50 hover:bg-indigo-50 rounded-xl transition-all" title="Ver Recibo">
                                             <FileText size={16} />
                                          </button>
                                          {isPendente && (
                                             <>
                                                <button
                                                   onClick={() => handleConfirmarPagamento(p)}
                                                   disabled={isProcessing}
                                                   className="p-2 text-green-600 hover:text-white bg-green-50 hover:bg-green-600 rounded-xl transition-all disabled:opacity-50" title="Confirmar Pagamento"
                                                >
                                                   {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                </button>
                                                <button
                                                   onClick={() => handleRejeitarPagamento(p)}
                                                   disabled={isProcessing}
                                                   className="p-2 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 rounded-xl transition-all disabled:opacity-50" title="Rejeitar Pagamento"
                                                >
                                                   <X size={16} />
                                                </button>
                                             </>
                                          )}
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               ) : (
                  <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden animate-in slide-in-from-left-4">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              <th className="px-8 py-6">Data</th>
                              <th className="px-8 py-6">Descrição</th>
                              <th className="px-8 py-6">Categoria</th>
                              <th className="px-8 py-6 text-right">Valor</th>
                              <th className="px-8 py-6 text-center">Acções</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                           {expenses.length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-16 text-zinc-400 text-sm font-medium">Nenhuma despesa registada</td></tr>
                           ) : expenses.map(e => (
                              <tr key={e.id} className="hover:bg-zinc-50/50 transition-all">
                                 <td className="px-8 py-5 text-xs font-bold text-zinc-500">{new Date(e.data).toLocaleDateString('pt-AO')}</td>
                                 <td className="px-8 py-5 font-black text-zinc-900 text-sm">{e.descricao}</td>
                                 <td className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest">{e.categoria}</td>
                                 <td className="px-8 py-5 text-right font-black text-red-500 text-sm">{formatAOA(e.valor)}</td>
                                 <td className="px-8 py-5 text-center">
                                    <button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         )}

         {/* MODAL RECIBO */}
         {selectedPagamento && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-3xl overflow-hidden border border-zinc-100">
                  <div className={`p-8 flex justify-between items-center ${selectedPagamento.status === 'Confirmado' ? 'bg-green-600' :
                     selectedPagamento.status === 'Pendente' ? 'bg-yellow-500' : 'bg-red-500'
                     } text-white`}>
                     <div className="flex items-center gap-3">
                        <FileText size={24} />
                        <div>
                           <h2 className="text-xl font-black uppercase tracking-tight">Recibo de Pagamento</h2>
                           <p className="text-[10px] font-bold opacity-70">Amazing Arena Gamer</p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedPagamento(null)} className="p-2 hover:bg-white/20 rounded-xl transition-all"><X size={22} /></button>
                  </div>

                  <div className="p-10 space-y-6">
                     <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Referência</span>
                           <div className="flex items-center gap-2">
                              <span className="font-black text-zinc-900 font-mono text-sm">{selectedPagamento.referencia_transacao}</span>
                              <button onClick={() => { navigator.clipboard.writeText(selectedPagamento.referencia_transacao); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 1500); }} className="p-1 text-zinc-400 hover:text-zinc-900">
                                 {copiedRef ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              </button>
                           </div>
                        </div>
                        {[
                           { label: 'Cliente', value: selectedPagamento.cliente_nome },
                           { label: 'Telemóvel', value: selectedPagamento.cliente_telefone || '—' },
                           { label: 'Serviço', value: selectedPagamento.game_titulo },
                           { label: 'Tipo', value: selectedPagamento.tipo === 'jogo' ? 'Sessão de Jogo' : 'Inscrição Torneio' },
                           { label: 'Método', value: selectedPagamento.metodo_pagamento },
                           { label: 'Data', value: new Date(selectedPagamento.criado_em).toLocaleString('pt-AO') },
                        ].map(row => (
                           <div key={row.label} className="flex justify-between">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{row.label}</span>
                              <span className="text-sm font-bold text-zinc-700">{row.value}</span>
                           </div>
                        ))}
                     </div>

                     <div className="flex justify-between items-center p-6 bg-zinc-900 rounded-2xl text-white">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</span>
                        <span className="text-3xl font-black text-yellow-400">{formatAOA(selectedPagamento.valor)}</span>
                     </div>

                     {selectedPagamento.status === 'Pendente' && (
                        <div className="grid grid-cols-2 gap-4">
                           <button
                              onClick={() => handleConfirmarPagamento(selectedPagamento)}
                              disabled={confirmandoId === selectedPagamento.id}
                              className="py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                           >
                              {confirmandoId === selectedPagamento.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirmar
                           </button>
                           <button
                              onClick={() => handleRejeitarPagamento(selectedPagamento)}
                              disabled={confirmandoId === selectedPagamento.id}
                              className="py-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                           >
                              <X size={16} /> Rejeitar
                           </button>
                        </div>
                     )}

                     {selectedPagamento.status !== 'Pendente' && (
                        <div className={`p-4 rounded-2xl text-center ${selectedPagamento.status === 'Confirmado' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                           }`}>
                           <p className={`text-[11px] font-black uppercase tracking-widest ${selectedPagamento.status === 'Confirmado' ? 'text-green-700' : 'text-red-600'
                              }`}>
                              {selectedPagamento.status === 'Confirmado' ? '✓ Confirmado em ' + new Date(selectedPagamento.confirmado_em!).toLocaleString('pt-AO') : '✗ Rejeitado'}
                           </p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* GESTÃO DE RANKING */}
         {activeTab === 'ranking' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-zinc-900 uppercase">Gestão do Ranking</h2>
                  <button
                     onClick={() => { setEditingRanking(null); setShowRankingModal(true); }}
                     className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all"
                  >
                     <UserPlus size={16} /> Consagrar Novo Líder
                  </button>
               </div>
               <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           <th className="px-10 py-6 w-32">Rank</th>
                           <th className="px-10 py-6">Jogador / Gamer Tag</th>
                           <th className="px-10 py-6">Especialidade</th>
                           <th className="px-10 py-6 text-right">Score (PTS)</th>
                           <th className="px-10 py-6 text-right">Acções</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        {rankings.map(r => (
                           <tr key={r.id} className={`hover:bg-zinc-50/50 transition-all group ${r.rank === 1 ? 'bg-yellow-50/30' : ''}`}>
                              <td className="px-10 py-5">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg transform transition-transform group-hover:scale-110 ${r.rank === 1 ? 'bg-yellow-500 text-zinc-900 ring-4 ring-yellow-200' :
                                    r.rank === 2 ? 'bg-slate-300 text-zinc-700' :
                                       r.rank === 3 ? 'bg-orange-400 text-white' :
                                          'bg-zinc-100 text-zinc-400'
                                    }`}>
                                    {r.rank <= 3 ? <Medal size={20} /> : `#${r.rank}`}
                                 </div>
                              </td>
                              <td className="px-10 py-5">
                                 <p className="font-black text-zinc-900 text-lg">{r.player_name}</p>
                                 <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ID: {r.id.substring(5, 11)}</p>
                              </td>
                              <td className="px-10 py-5">
                                 <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                    {r.last_game}
                                 </span>
                              </td>
                              <td className="px-10 py-5 text-right">
                                 <p className="font-black text-zinc-900 text-2xl tracking-tighter">{r.score.toLocaleString()}</p>
                              </td>
                              <td className="px-10 py-5 text-right flex justify-end gap-2">
                                 <button onClick={() => { setEditingRanking(r); setShowRankingModal(true); }} className="p-3 text-zinc-300 hover:text-indigo-600 transition-colors bg-zinc-50 rounded-xl"><Edit size={18} /></button>
                                 <button onClick={() => handleDeleteRanking(r.id, r.player_name)} className="p-3 text-zinc-300 hover:text-red-500 transition-colors bg-zinc-50 rounded-xl"><Trash2 size={18} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* GESTÃO DE TORNEIOS */}
         {activeTab === 'tournaments' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-zinc-900 uppercase">Gestão de Competições</h2>
                  <button onClick={() => { setEditingTournament(null); setShowTournamentModal(true); }} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all"><Plus size={16} /> Criar Torneio</button>
               </div>
               <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           <th className="px-10 py-6">Evento / Data</th>
                           <th className="px-10 py-6">Prémio</th>
                           <th className="px-10 py-6">Status</th>
                           <th className="px-10 py-6 text-right">Acções</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        {tournaments.map(t => (
                           <tr key={t.id} className="hover:bg-zinc-50/50 transition-all">
                              <td className="px-10 py-5"><p className="font-black text-zinc-900 text-sm">{t.titulo}</p><p className="text-[9px] font-bold text-zinc-400">{new Date(t.data_inicio).toLocaleDateString()}</p></td>
                              <td className="px-10 py-5 font-bold text-green-600">{t.premio}</td>
                              <td className="px-10 py-5"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.status === 'Inscrições' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-500'}`}>{t.status}</span></td>
                              <td className="px-10 py-5 text-right flex justify-end gap-2">
                                 <button onClick={() => { setEditingTournament(t); setShowTournamentModal(true); }} className="p-3 text-zinc-300 hover:text-indigo-600 transition-colors"><Edit size={18} /></button>
                                 <button onClick={() => handleDeleteTournament(t.id, t.titulo)} className="p-3 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* MODAL CONFIG JOGO */}
         {showGameModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-3xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-4">
                        <Gamepad2 className="text-indigo-600" /> {editingGame ? 'Configuração Master do Jogo' : 'Novo Título no Catálogo'}
                     </h2>
                     <button onClick={() => setShowGameModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><X size={28} /></button>
                  </div>

                  <form onSubmit={handleSaveGame} className="p-12 space-y-8 overflow-y-auto max-h-[75vh]">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="flex flex-col items-center gap-4">
                           <div
                              className="w-full aspect-square bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 overflow-hidden cursor-pointer hover:border-indigo-500 transition-all relative group"
                              onClick={() => fileInputRef.current?.click()}
                           >
                              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera size={48} />}
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                                 const f = e.target.files?.[0];
                                 if (f) { const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(f); }
                              }} />
                           </div>
                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Poster Oficial (HD)</p>
                        </div>

                        <div className="md:col-span-3 space-y-6">
                           <Input name="titulo" label="Título do Jogo" defaultValue={editingGame?.titulo} required placeholder="Ex: Call of Duty: Black Ops" />
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <Select name="categoria" label="Categoria" defaultValue={editingGame?.categoria} options={[
                                 { value: 'FPS', label: 'Tiro (FPS)' }, { value: 'Desporto', label: 'Desporto' },
                                 { value: 'Luta', label: 'Combate / Luta' }, { value: 'Corridas', label: 'Simulador Corridas' },
                                 { value: 'Aventura', label: 'Ação & Aventura' }
                              ]} />
                              <Input name="preco" label="Tarifa / Sessão (AOA)" type="number" defaultValue={editingGame?.preco_sessao} required />
                              <Input name="tempo" label="Duração (Minutos)" type="number" defaultValue={editingGame?.tempo_minutos} required />
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">Resumo Comercial (Público)</label>
                           <textarea name="descricao" defaultValue={editingGame?.descricao} required className="w-full p-5 bg-zinc-50 border border-zinc-200 rounded-3xl h-32 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium text-sm" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">Histórico da Franquia</label>
                           <textarea name="historico" defaultValue={editingGame?.historico} required className="w-full p-5 bg-zinc-50 border border-zinc-200 rounded-3xl h-32 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium text-sm" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5">
                        <Input name="vagas" label="Número de Estações" type="number" defaultValue={editingGame?.vagas_disponiveis || 4} className="bg-zinc-800 border-zinc-700 text-white" />
                        <Select name="status" label="Disponibilidade" defaultValue={editingGame?.status} className="bg-zinc-800 border-zinc-700 text-white" options={[
                           { value: 'Ativo', label: 'Activo / Catálogo' },
                           { value: 'Manutenção', label: 'Em Manutenção (Visível)' },
                           { value: 'Indisponível', label: 'Bloqueado (Oculto)' }
                        ]} />
                        <div className="flex items-end pb-1">
                           <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3">
                              <Save size={20} /> Efectivar Configuração
                           </button>
                        </div>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL RANKING (MELHORADO) */}
         {showRankingModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-3xl overflow-hidden border border-white/20 animate-in zoom-in-95">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-900 text-white">
                     <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                        <Medal className="text-yellow-500" /> {editingRanking ? 'Actualizar Score' : 'Consagrar Líder'}
                     </h2>
                     <button onClick={() => setShowRankingModal(false)} className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleSaveRanking} className="p-10 space-y-6">
                     <Input
                        name="player_name"
                        label="Gamer Tag / Nome do Jogador"
                        defaultValue={editingRanking?.player_name}
                        required
                        placeholder="Ex: Simão_The_Gamer"
                     />
                     <div className="grid grid-cols-1 gap-6">
                        <Input
                           name="score"
                           label="Pontuação Acumulada (PTS)"
                           type="number"
                           defaultValue={editingRanking?.score}
                           required
                           placeholder="Ex: 15000"
                        />
                        <Select
                           name="last_game"
                           label="Jogo de Especialidade"
                           defaultValue={editingRanking?.last_game}
                           options={games.map(g => ({ value: g.titulo, label: g.titulo }))}
                        />
                     </div>

                     <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Zap size={12} className="text-indigo-500" /> Nota do Sistema
                        </p>
                        <p className="text-xs text-zinc-600 font-medium">O rank será recalculado automaticamente com base na pontuação inserida.</p>
                     </div>

                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                        <Save size={18} /> Confirmar Registo
                     </button>
                  </form>
               </div>
            </div>
         )}

         {showTournamentModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-3xl overflow-hidden">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3"><Trophy className="text-yellow-600" /> Novo Torneio Master</h2>
                     <button onClick={() => setShowTournamentModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleSaveTournament} className="p-10 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <Input name="titulo" label="Nome do Evento" defaultValue={editingTournament?.titulo} required />
                        <Select name="game_id" label="Jogo Associado" defaultValue={editingTournament?.game_id} options={games.map(g => ({ value: g.id, label: g.titulo }))} required />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                           <Input name="data_inicio" label="Data Início" type="date" defaultValue={editingTournament?.data_inicio} required />
                           <Input name="hora_inicio" label="Hora" type="time" defaultValue={editingTournament?.hora_inicio} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <Input name="data_fim" label="Data Fim" type="date" defaultValue={editingTournament?.data_fim} required />
                           <Input name="hora_fim" label="Hora" type="time" defaultValue={editingTournament?.hora_fim} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Input name="premio" label="Prémio" defaultValue={editingTournament?.premio} required />
                        <Input name="vagas" label="Vagas" type="number" defaultValue={editingTournament?.vagas} required />
                     </div>
                     <Select name="status" label="Estado" defaultValue={editingTournament?.status} options={[{ value: 'Inscrições', label: 'Inscrições' }, { value: 'A decorrer', label: 'A decorrer' }, { value: 'Finalizado', label: 'Finalizado' }]} />
                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"><Save size={18} /> Efectivar Torneio</button>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL DESPESA */}
         {showExpenseModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-3xl overflow-hidden border border-red-100">
                  <div className="p-8 border-b border-red-50 flex justify-between items-center bg-red-500 text-white">
                     <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                        <ArrowDownRight /> Registar Nova Despesa
                     </h2>
                     <button onClick={() => setShowExpenseModal(false)} className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleSaveExpense} className="p-10 space-y-6">
                     <Input name="descricao" label="Descrição do Gasto" required placeholder="Ex: Reposição de Teclado Mecânico" />
                     <div className="grid grid-cols-2 gap-4">
                        <Input name="valor" label="Valor (AOA)" type="number" required />
                        <Input name="data" label="Data do Gasto" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                     </div>
                     <Select name="categoria" label="Categoria" options={[
                        { value: 'Manutenção', label: 'Hardware / Manutenção' },
                        { value: 'Pessoal', label: 'Staff / Freelancers' },
                        { value: 'Marketing', label: 'Publicidade / Marketing' },
                        { value: 'Outros', label: 'Outros Custos' }
                     ]} />

                     <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Atenção</p>
                        <p className="text-xs text-red-600 font-medium font-bold">Esta acção afectará directamente o Lucro Líquido no dashboard.</p>
                     </div>

                     <button type="submit" className="w-full py-5 bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3">
                        <Save size={18} /> Confirmar Saída de Caixa
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default ArenaAdmin;
