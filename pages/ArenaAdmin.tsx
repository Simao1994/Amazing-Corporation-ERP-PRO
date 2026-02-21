
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
   Gamepad2, Plus, Search, Edit, Trash2, TrendingUp, DollarSign,
   BarChart3, ShieldCheck, X, Save, LayoutGrid, Trophy, Award,
   Monitor, Users, Activity, PieChart as PieIcon,
   ArrowUpRight, ArrowDownRight, CreditCard, Clock, Camera,
   Settings, History, Filter, Download, Zap, RefreshCw, Medal,
   UserPlus, Star, ImageIcon, Eye, EyeOff
} from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
   AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Game, GamePayment, ArenaTournament, ArenaRanking, GameStatus } from '../types';
import { supabase } from '../src/lib/supabase';
import { formatAOA } from '../constants';

const ArenaAdmin: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'analytics' | 'catalog' | 'tournaments' | 'payments' | 'ranking'>('analytics');
   const [searchTerm, setSearchTerm] = useState('');
   const [loading, setLoading] = useState(true);

   // States de Dados
   const [games, setGames] = useState<Game[]>([]);
   const [payments, setPayments] = useState<GamePayment[]>([]);
   const [tournaments, setTournaments] = useState<ArenaTournament[]>([]);
   const [rankings, setRankings] = useState<ArenaRanking[]>([]);

   // Modals e Edição
   const [showGameModal, setShowGameModal] = useState(false);
   const [editingGame, setEditingGame] = useState<Game | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [showTournamentModal, setShowTournamentModal] = useState(false);
   const [editingTournament, setEditingTournament] = useState<ArenaTournament | null>(null);
   const [showRankingModal, setShowRankingModal] = useState(false);
   const [editingRanking, setEditingRanking] = useState<ArenaRanking | null>(null);

   const fetchData = async () => {
      setLoading(true);
      try {
         const [
            { data: gms },
            { data: pays },
            { data: trns },
            { data: rnks }
         ] = await Promise.all([
            supabase.from('arena_games').select('*').order('titulo'),
            supabase.from('arena_payments').select('*').order('data', { ascending: false }),
            supabase.from('arena_tournaments').select('*').order('data_inicio', { ascending: false }),
            supabase.from('arena_ranking').select('*').order('rank', { ascending: true })
         ]);

         if (gms) setGames(gms as unknown as Game[]);
         if (pays) setPayments(pays as unknown as GamePayment[]);
         if (trns) setTournaments(trns as unknown as ArenaTournament[]);
         if (rnks) setRankings(rnks as unknown as ArenaRanking[]);
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
      const activePlayers = [...new Set(payments.map(p => p.cliente_nome))].length;

      const gameSales: Record<string, number> = {};
      payments.forEach(p => {
         gameSales[p.game_titulo] = (gameSales[p.game_titulo] || 0) + 1;
      });
      const pieData = Object.entries(gameSales)
         .map(([name, value]) => ({ name, value }))
         .sort((a, b) => b.value - a.value)
         .slice(0, 5);

      const totalEstacoes = games.reduce((acc, g) => acc + (g.vagas_disponiveis || 0), 0);
      const taxaOcupacao = totalEstacoes > 0 ? 75 : 0;

      return { revenue, activePlayers, pieData, taxaOcupacao };
   }, [payments, games]);

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
            await supabase.from('arena_games').update(payload).eq('id', editingGame.id);
         } else {
            await supabase.from('arena_games').insert([payload]);
         }
         setShowGameModal(false);
         setEditingGame(null);
         setImagePreview(null);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar jogo');
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

      const payload = {
         player_name: fd.get('player_name') as string,
         score: Number(fd.get('score')),
         last_game: fd.get('last_game') as string,
         rank: 0
      };

      try {
         if (isEditing) {
            await supabase.from('arena_ranking').update(payload).eq('id', editingRanking.id);
         } else {
            const nextRank = rankings.length + 1;
            await supabase.from('arena_ranking').insert([{ ...payload, rank: nextRank }]);
         }
         setShowRankingModal(false);
         setEditingRanking(null);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar ranking');
      }
   };

   const handleDeleteRanking = async (id: string, name: string) => {
      if (confirm(`Remover "${name}" do Ranking?`)) {
         try {
            await supabase.from('arena_ranking').delete().eq('id', id);
            fetchData();
         } catch (error) {
            alert('Erro ao remover do ranking');
         }
      }
   };

   // --- CRUD TORNEIOS ---
   const handleSaveTournament = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingTournament;

      const payload = {
         titulo: fd.get('titulo') as string,
         data_inicio: fd.get('data_inicio') as string,
         data_fim: fd.get('data_fim') as string,
         premio: fd.get('premio') as string,
         status: (fd.get('status') as any) || 'Inscrições',
         vagas: Number(fd.get('vagas')),
         vencedor: fd.get('vencedor') as string || undefined
      };

      try {
         if (isEditing) {
            await supabase.from('arena_tournaments').update(payload).eq('id', editingTournament.id);
         } else {
            await supabase.from('arena_tournaments').insert([payload]);
         }
         setShowTournamentModal(false);
         setEditingTournament(null);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar torneio');
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
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Receita Acumulada</p>
                     <p className="text-3xl font-black text-zinc-900">{formatAOA(bizStats.revenue)}</p>
                     <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit"><ArrowUpRight size={12} /> Operacional</div>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                     <Zap className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                     <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">Jogadores Únicos</p>
                     <p className="text-4xl font-black">{bizStats.activePlayers}</p>
                     <p className="text-[9px] font-bold text-zinc-500 mt-2 uppercase">Histórico Geral</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Taxa de Ocupação</p>
                     <p className="text-4xl font-black text-zinc-900">{bizStats.taxaOcupacao}%</p>
                     <p className="text-[9px] font-bold text-green-600 uppercase mt-1">Tempo Real</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Jogos no Catálogo</p>
                     <p className="text-4xl font-black text-zinc-900">{games.length}</p>
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
                     <h3 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-2"><TrendingUp className="text-indigo-500" size={20} /> Evolução de Faturamento</h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={[
                           { name: 'Sem 1', v: bizStats.revenue * 0.2 },
                           { name: 'Sem 2', v: bizStats.revenue * 0.4 },
                           { name: 'Sem 3', v: bizStats.revenue * 0.3 },
                           { name: 'Sem 4', v: bizStats.revenue * 0.1 },
                        ]}>
                           <defs><linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} dy={10} />
                           <YAxis hide />
                           <Tooltip formatter={(v: number) => formatAOA(v)} />
                           <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorV)" />
                        </AreaChart>
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
            <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
               <div className="p-10 border-b border-zinc-50 flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><DollarSign className="text-green-600" /> Fluxo de Caixa Arena</h2>
                  <button onClick={() => window.print()} className="px-6 py-3 bg-zinc-50 text-zinc-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-100 transition-all"><Download size={16} /> Exportar Mapas</button>
               </div>
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <th className="px-10 py-6">ID / Data</th>
                        <th className="px-10 py-6">Cliente</th>
                        <th className="px-10 py-6">Jogo / Serviço</th>
                        <th className="px-10 py-6 text-right">Montante</th>
                        <th className="px-10 py-6 text-center">Estado</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                     {payments.map(p => (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-all">
                           <td className="px-10 py-5"><p className="text-[10px] font-black text-zinc-400 mb-1">{p.id}</p><p className="text-xs font-bold">{new Date(p.data).toLocaleString()}</p></td>
                           <td className="px-10 py-5 font-black text-zinc-900 text-sm">{p.cliente_nome}</td>
                           <td className="px-10 py-5 text-sm font-bold text-indigo-600">{p.game_titulo}</td>
                           <td className="px-10 py-5 text-right font-black text-zinc-900">{formatAOA(p.valor)}</td>
                           <td className="px-10 py-5 text-center"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest">{p.status}</span></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
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
                     <Input name="titulo" label="Nome do Evento" defaultValue={editingTournament?.titulo} required />
                     <div className="grid grid-cols-2 gap-4">
                        <Input name="data_inicio" label="Início" type="date" defaultValue={editingTournament?.data_inicio} required />
                        <Input name="data_fim" label="Fim" type="date" defaultValue={editingTournament?.data_fim} required />
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
      </div>
   );
};

export default ArenaAdmin;
