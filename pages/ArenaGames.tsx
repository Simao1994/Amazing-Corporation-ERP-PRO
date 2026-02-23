
import React, { useState, useEffect, useMemo } from 'react';
import {
   Gamepad2, Zap, Star, Clock, CreditCard,
   CheckCircle2, X, Search, Globe, Play, Trophy,
   TrendingUp, Calendar, Award, Target,
   Smartphone, ShieldCheck, ArrowRight,
   RefreshCw, History, Medal, MapPin, Navigation,
   AlertCircle, Copy, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/ui/Input';
import { supabase } from '../src/lib/supabase';
import { Game, ArenaTournament, ArenaRanking, PaymentMethod } from '../types';
import { formatAOA } from '../constants';

// Gera referência de pagamento única: ARENA-YYMMDD-XXXX
const gerarReferencia = () => {
   const now = new Date();
   const yy = String(now.getFullYear()).slice(2);
   const mm = String(now.getMonth() + 1).padStart(2, '0');
   const dd = String(now.getDate()).padStart(2, '0');
   const rand = Math.floor(1000 + Math.random() * 9000);
   return `ARENA-${yy}${mm}${dd}-${rand}`;
};

const NUMERO_ARENA = '929 882 067';
const SUPABASE_FUNCTIONS_URL = 'https://jgktemwegesmmomlftgt.supabase.co/functions/v1';

const ArenaGames: React.FC = () => {
   const [activeStep, setActiveStep] = useState<'catalog' | 'tournaments' | 'ranking'>('catalog');
   const [searchTerm, setSearchTerm] = useState('');
   const [loading, setLoading] = useState(true);

   // Fluxo de Solicitação e Pagamento
   const [selectedItem, setSelectedItem] = useState<{ id: string, titulo: string, preco: number, tipo: 'jogo' | 'torneio', imagem_url?: string } | null>(null);
   const [isRequesting, setIsRequesting] = useState(false);
   const [paymentStep, setPaymentStep] = useState<'details' | 'method' | 'processing' | 'pending' | 'failed'>('details');
   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Multicaixa');
   const [clientData, setClientData] = useState({ nome: '', tel: '', email: '' });
   const [referencia, setReferencia] = useState('');
   const [copied, setCopied] = useState(false);

   // --- ESTADOS DE DADOS ---
   const [games, setGames] = useState<Game[]>([]);
   const [tournaments, setTournaments] = useState<ArenaTournament[]>([]);
   const [rankings, setRankings] = useState<ArenaRanking[]>([]);

   const fetchArenaData = async () => {
      setLoading(true);
      try {
         const [
            { data: gms },
            { data: trns },
            { data: rnks }
         ] = await Promise.all([
            supabase.from('arena_games').select('*').eq('status', 'Ativo').order('popularidade', { ascending: false }),
            supabase.from('arena_tournaments').select('*').order('data_inicio', { ascending: true }),
            supabase.from('arena_ranking').select('*').order('rank', { ascending: true })
         ]);

         if (gms) setGames(gms as unknown as Game[]);
         if (trns) setTournaments(trns as unknown as ArenaTournament[]);
         if (rnks) setRankings(rnks as unknown as ArenaRanking[]);
      } catch (error) {
         console.error('Error fetching arena data:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchArenaData();
   }, []);

   const filteredGames = useMemo(() =>
      games.filter(g => g.titulo.toLowerCase().includes(searchTerm.toLowerCase())), [games, searchTerm]);

   const handleOpenRequest = (item: any, tipo: 'jogo' | 'torneio') => {
      setSelectedItem({
         id: item.id,
         titulo: item.titulo,
         preco: tipo === 'jogo' ? item.preco_sessao : 2500,
         tipo: tipo,
         imagem_url: tipo === 'jogo' ? item.imagem_url : undefined
      });
      setPaymentStep('details');
      setReferencia('');
      setCopied(false);
      setClientData({ nome: '', tel: '', email: '' });
      setIsRequesting(true);
   };

   const handleCloseModal = () => {
      setIsRequesting(false);
      setPaymentStep('details');
      setReferencia('');
   };

   const copyReferencia = () => {
      navigator.clipboard.writeText(referencia).then(() => {
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      });
   };

   const processPayment = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setPaymentStep('processing');

      try {
         const ref = gerarReferencia();
         setReferencia(ref);

         const paymentPayload = {
            game_id: selectedItem!.id,
            game_titulo: selectedItem!.titulo,
            tipo: selectedItem!.tipo,
            valor: selectedItem!.preco,
            metodo_pagamento: paymentMethod,
            referencia_transacao: ref,
            status: 'Pendente',  // ← SEMPRE começa como Pendente
            cliente_nome: clientData.nome,
            cliente_telefone: clientData.tel,
            criado_em: new Date().toISOString()
         };

         const { error: pError } = await supabase.from('arena_pagamentos').insert([paymentPayload]);
         if (pError) throw pError;

         // NÃO decrementamos vagas aqui — só após confirmação do admin
         setPaymentStep('pending');

      } catch (error) {
         console.error('Payment error:', error);
         setPaymentStep('failed');
      }
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-[#07080a] flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#07080a] text-white font-sans selection:bg-indigo-500">
         {/* NAV FIXA */}
         <nav className="fixed top-0 left-0 right-0 z-50 bg-[#07080a]/90 backdrop-blur-2xl border-b border-white/5 px-8 py-5 flex items-center justify-between">
            <Logo light className="h-10" />
            <div className="hidden lg:flex items-center gap-12 text-[14px] font-black uppercase tracking-[0.3em]">
               <button onClick={() => setActiveStep('catalog')} className={`transition-all ${activeStep === 'catalog' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-1' : 'text-zinc-500 hover:text-white'}`}>Catálogo de Jogos</button>
               <button onClick={() => setActiveStep('tournaments')} className={`transition-all ${activeStep === 'tournaments' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-1' : 'text-zinc-500 hover:text-white'}`}>Torneios</button>
               <button onClick={() => setActiveStep('ranking')} className={`transition-all ${activeStep === 'ranking' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-1' : 'text-zinc-500 hover:text-white'}`}>Ranking</button>
            </div>
            <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-2 transition-all">
               <Globe size={14} /> Voltar ao ERP
            </Link>
         </nav>

         <div className="pt-32 pb-24 px-8 max-w-7xl mx-auto">

            {/* --- ABA: CATÁLOGO --- */}
            {activeStep === 'catalog' && (
               <div className="animate-in fade-in duration-1000 space-y-16">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                     <div className="space-y-6 flex-1">
                        <div className="space-y-2">
                           <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">AMAZING ARENA <span className="text-indigo-500">GAMER</span></h1>
                           <p className="text-zinc-500 text-lg font-medium max-w-xl italic">"Excelência em entretenimento digital no coração de Benguela."</p>
                        </div>

                        {/* BARRA DE INFO: HORÁRIO E LOCALIZAÇÃO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="flex items-center gap-4 bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-md">
                              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                 <Clock size={20} />
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Horário de Funcionamento</p>
                                 <p className="text-sm font-bold text-zinc-200">Segunda à Domingo: 09h — 22h</p>
                              </div>
                           </div>
                           <div className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-md group">
                              <div className="flex items-center gap-4">
                                 <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform">
                                    <MapPin size={20} />
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Onde Estamos</p>
                                    <p className="text-xs font-bold text-zinc-200 leading-tight">Navegantes, Benguela<br /><span className="text-[10px] text-zinc-400">Arredores do CRM</span></p>
                                 </div>
                              </div>
                              <a
                                 href="https://www.google.com/maps/search/Navegantes+Benguela+Angola"
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-2"
                                 title="Abrir GPS"
                              >
                                 <Navigation size={18} fill="currentColor" />
                                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">GPS</span>
                              </a>
                           </div>
                        </div>
                     </div>

                     <div className="flex bg-white/5 p-2 rounded-2xl border border-white/10 w-full lg:w-96 backdrop-blur-md h-fit">
                        <Search className="ml-4 text-zinc-500" />
                        <input placeholder="Pesquisar título no catálogo..." className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 font-bold text-white placeholder:text-zinc-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                     {filteredGames.map(game => (
                        <div key={game.id} className="group bg-[#111216] rounded-[3.5rem] border border-white/5 hover:border-indigo-500/50 transition-all duration-700 overflow-hidden flex flex-col relative shadow-2xl">
                           <div className="h-80 relative overflow-hidden">
                              <img src={game.imagem_url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 opacity-80" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#111216] via-transparent to-transparent"></div>
                              <div className="absolute top-6 left-6 flex gap-2">
                                 <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg shadow-xl">{game.categoria}</span>
                                 <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-[9px] font-black uppercase rounded-lg border border-white/10">{game.tempo_minutos} MINUTOS</span>
                              </div>
                              <div className="absolute top-6 right-6">
                                 <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase leading-none mb-1">Vagas</p>
                                    <p className={`text-sm font-black leading-none ${game.vagas_disponiveis > 0 ? 'text-green-500' : 'text-red-500'}`}>{game.vagas_disponiveis}</p>
                                 </div>
                              </div>
                              <div className="absolute bottom-6 left-8 right-8">
                                 <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                    <Star size={14} fill="currentColor" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{game.popularidade}% Popularidade</span>
                                 </div>
                                 <h3 className="text-3xl font-black tracking-tight">{game.titulo}</h3>
                              </div>
                           </div>

                           <div className="p-10 flex-1 flex flex-col justify-between space-y-8">
                              <div className="space-y-4">
                                 <p className="text-zinc-400 text-sm font-medium leading-relaxed line-clamp-2">"{game.descricao}"</p>
                                 <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 group-hover:bg-indigo-50/5 transition-colors">
                                    <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><History size={12} /> Breve Histórico</h4>
                                    <p className="text-[11px] text-zinc-500 leading-relaxed italic">{game.historico}</p>
                                 </div>
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Preço da Sessão</p>
                                    <p className="text-2xl font-black text-white">{formatAOA(game.preco_sessao)}</p>
                                 </div>
                                 <button
                                    onClick={() => handleOpenRequest(game, 'jogo')}
                                    disabled={game.vagas_disponiveis === 0}
                                    className="px-8 py-5 bg-white text-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                 >
                                    <Zap size={18} fill="currentColor" /> Solicitar Jogo
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* --- ABA: TORNEIOS --- */}
            {activeStep === 'tournaments' && (
               <div className="animate-in slide-in-from-bottom-6 duration-700 space-y-16">
                  <div className="text-center space-y-4">
                     <Trophy className="text-yellow-500 mx-auto animate-bounce" size={64} />
                     <h2 className="text-6xl font-black uppercase tracking-tighter">Arena <span className="text-indigo-500">Championship</span></h2>
                     <p className="text-zinc-500 max-w-xl mx-auto text-lg font-medium">As maiores competições de eSports de Benguela acontecem aqui.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
                     {tournaments.map(t => (
                        <div key={t.id} className="bg-[#111216] p-10 rounded-[4rem] border border-white/5 flex flex-col md:flex-row gap-10 group hover:border-yellow-500/30 transition-all shadow-2xl relative overflow-hidden">
                           {t.status === 'Finalizado' && <div className="absolute top-0 right-0 p-8 bg-zinc-900/80 backdrop-blur-md flex items-center gap-2"><Medal className="text-yellow-500" size={16} /> <span className="text-[10px] font-black uppercase">Concluído</span></div>}
                           <div className="md:w-1/2 space-y-8">
                              <div className="space-y-2">
                                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.status === 'Inscrições' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>{t.status}</span>
                                 <h3 className="text-3xl font-black leading-tight tracking-tight">{t.titulo}</h3>
                              </div>
                              <div className="space-y-4">
                                 <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs"><Calendar size={18} className="text-indigo-500" /> {new Date(t.data_inicio).toLocaleDateString()}</div>
                                 <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs"><Target size={18} className="text-indigo-500" /> {t.vagas} Vagas Disponíveis</div>
                              </div>
                           </div>
                           <div className="md:w-1/2 flex flex-col justify-between bg-zinc-900/50 p-8 rounded-[3rem] border border-white/5">
                              <div>
                                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Grande Prémio</p>
                                 <p className="text-2xl font-black text-yellow-500 tracking-tight">{t.premio}</p>
                              </div>
                              {t.status === 'Inscrições' ? (
                                 <button onClick={() => handleOpenRequest(t, 'torneio')} className="w-full mt-8 py-5 bg-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl">Garantir Vaga <ArrowRight size={16} /></button>
                              ) : t.vencedor ? (
                                 <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center">
                                    <p className="text-[8px] font-black text-yellow-500 uppercase mb-1">Vencedor Oficial</p>
                                    <p className="text-sm font-black text-white">{t.vencedor}</p>
                                 </div>
                              ) : (
                                 <div className="mt-8 p-4 bg-zinc-800 rounded-2xl text-center text-[10px] font-black uppercase text-zinc-500">Competição em curso</div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* --- ABA: RANKING --- */}
            {activeStep === 'ranking' && (
               <div className="animate-in fade-in duration-700 max-w-4xl mx-auto space-y-16">
                  <div className="text-center space-y-4">
                     <TrendingUp className="text-indigo-400 mx-auto" size={56} />
                     <h2 className="text-5xl font-black uppercase tracking-tighter">Ranking <span className="text-indigo-400">Geral</span></h2>
                     <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.4em]">Os Maiores Atletas da Amazing Arena</p>
                  </div>

                  <div className="bg-[#111216] rounded-[4rem] border border-white/5 overflow-hidden shadow-3xl">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                              <th className="px-12 py-10">Posição</th>
                              <th className="px-12 py-10">Atleta</th>
                              <th className="px-12 py-10">Main Game</th>
                              <th className="px-12 py-10 text-right">Pontuação</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {rankings.map(r => (
                              <tr key={r.id} className="hover:bg-white/5 transition-all group">
                                 <td className="px-12 py-8">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${r.rank === 1 ? 'bg-yellow-500 text-zinc-900 shadow-2xl shadow-yellow-500/20 scale-110' : 'bg-white/5 text-zinc-400'}`}>
                                       {r.rank === 1 ? <Medal size={20} /> : `#0${r.rank}`}
                                    </div>
                                 </td>
                                 <td className="px-12 py-8 font-black text-zinc-100 text-lg">{r.player_name}</td>
                                 <td className="px-12 py-8 text-xs text-zinc-500 font-bold uppercase tracking-widest italic">{r.last_game}</td>
                                 <td className="px-12 py-8 text-right font-black text-indigo-400 text-xl tracking-tighter">{r.score.toLocaleString()} PTS</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}
         </div>

         {/* ============================================================ */}
         {/* MODAL DE CHECKOUT COMPLETO                                   */}
         {/* ============================================================ */}
         {isRequesting && selectedItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-[#111216] w-full max-w-4xl rounded-[4rem] shadow-3xl overflow-hidden border border-white/10 flex flex-col md:flex-row max-h-[95vh]">

                  {/* PAINEL ESQUERDO — RESUMO DO PEDIDO */}
                  <div className="md:w-2/5 bg-zinc-900 p-12 flex flex-col justify-between border-r border-white/5">
                     <div className="space-y-10">
                        <div>
                           <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[8px] font-black uppercase tracking-[0.2em]">{selectedItem.tipo === 'jogo' ? 'Reserva de Sessão' : 'Inscrição de Torneio'}</span>
                           <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mt-8 mb-4">Seu Pedido</h3>
                           <div className="space-y-6">
                              {selectedItem.imagem_url && <img src={selectedItem.imagem_url} className="w-full h-32 object-cover rounded-3xl" />}
                              <p className="text-3xl font-black text-white leading-tight">{selectedItem.titulo}</p>
                              <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">A Liquidar</span>
                                 <span className="text-4xl font-black text-yellow-500">{formatAOA(selectedItem.preco)}</span>
                              </div>
                           </div>
                        </div>

                        {/* Status do processo */}
                        <div className="space-y-3">
                           {[
                              { label: 'Identificação', done: ['method', 'processing', 'pending', 'failed'].includes(paymentStep) },
                              { label: 'Método de Pagamento', done: ['processing', 'pending', 'failed'].includes(paymentStep) },
                              { label: 'Confirmação', done: paymentStep === 'pending' },
                           ].map((step, i) => (
                              <div key={i} className="flex items-center gap-3">
                                 <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${step.done ? 'bg-green-500 text-white' : 'bg-white/10 text-zinc-500'}`}>
                                    {step.done ? '✓' : i + 1}
                                 </div>
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${step.done ? 'text-zinc-300' : 'text-zinc-600'}`}>{step.label}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="pt-10 flex items-center gap-3 opacity-30">
                        <ShieldCheck size={20} />
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Amazing Security Protocol</p>
                     </div>
                  </div>

                  {/* PAINEL DIREITO — STEPS */}
                  <div className="md:w-3/5 p-12 relative flex flex-col justify-center overflow-y-auto">
                     <button onClick={handleCloseModal} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-all z-10"><X size={28} /></button>

                     {/* STEP 1: IDENTIFICAÇÃO */}
                     {paymentStep === 'details' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                           <div>
                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Passo 1 de 2</p>
                              <h2 className="text-4xl font-black uppercase tracking-tighter">Identificação</h2>
                           </div>
                           <form onSubmit={(e) => { e.preventDefault(); setPaymentStep('method'); }} className="space-y-4">
                              <Input label="Gamer Tag / Nome Completo" required className="bg-white/5 border-white/10 text-white" value={clientData.nome} onChange={e => setClientData({ ...clientData, nome: e.target.value })} />
                              <Input label="Telemóvel" required placeholder="+244 9XX XXX XXX" className="bg-white/5 border-white/10 text-white" value={clientData.tel} onChange={e => setClientData({ ...clientData, tel: e.target.value })} />
                              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all">Escolher Pagamento <ArrowRight size={16} /></button>
                           </form>
                        </div>
                     )}

                     {/* STEP 2: MÉTODO DE PAGAMENTO */}
                     {paymentStep === 'method' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                           <div>
                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Passo 2 de 2</p>
                              <h2 className="text-4xl font-black uppercase tracking-tighter">Pagamento</h2>
                           </div>
                           <div className="grid grid-cols-3 gap-4">
                              {[
                                 { id: 'Multicaixa', label: 'MCX Express', icon: <Smartphone size={28} /> },
                                 { id: 'PayPal', label: 'PayPal', icon: <Globe size={28} /> },
                                 { id: 'Stripe', label: 'Stripe', icon: <CreditCard size={28} /> },
                              ].map(m => (
                                 <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`p-6 rounded-3xl border flex flex-col items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-white text-zinc-900 border-white shadow-xl' : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10'}`}>
                                    {m.icon} <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                                 </button>
                              ))}
                           </div>

                           {/* Instruções de pagamento por método */}
                           {paymentMethod === 'Multicaixa' && (
                              <div className="bg-zinc-900 p-6 rounded-3xl border-l-4 border-green-500 animate-in fade-in space-y-3">
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instruções — Multicaixa Express</p>
                                 <p className="text-sm text-zinc-300 font-medium">Envie o valor para o número abaixo e use a referência gerada como comprovativo.</p>
                                 <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-2xl">
                                    <div>
                                       <p className="text-[8px] text-zinc-500 uppercase font-black">Número MCX — Arena</p>
                                       <p className="text-xl font-black text-white">{NUMERO_ARENA}</p>
                                    </div>
                                    <Smartphone className="text-green-400" size={24} />
                                 </div>
                              </div>
                           )}
                           {paymentMethod === 'Stripe' && (
                              <div className="bg-zinc-900 p-6 rounded-3xl border-l-4 border-indigo-500 animate-in fade-in space-y-3">
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instruções — Stripe</p>
                                 <p className="text-sm text-zinc-300 font-medium">Transferência via Stripe. Contacte-nos com a referência para receber o link de pagamento.</p>
                                 <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-2xl">
                                    <div>
                                       <p className="text-[8px] text-zinc-500 uppercase font-black">Contacto Arena</p>
                                       <p className="text-xl font-black text-white">{NUMERO_ARENA}</p>
                                    </div>
                                    <CreditCard className="text-indigo-400" size={24} />
                                 </div>
                              </div>
                           )}
                           {paymentMethod === 'PayPal' && (
                              <div className="bg-zinc-900 p-6 rounded-3xl border-l-4 border-blue-500 animate-in fade-in space-y-3">
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instruções — PayPal</p>
                                 <p className="text-sm text-zinc-300 font-medium">Contacte-nos com a referência gerada para receber o link de pagamento PayPal.</p>
                                 <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-2xl">
                                    <div>
                                       <p className="text-[8px] text-zinc-500 uppercase font-black">Contacto Arena</p>
                                       <p className="text-xl font-black text-white">{NUMERO_ARENA}</p>
                                    </div>
                                    <Globe className="text-blue-400" size={24} />
                                 </div>
                              </div>
                           )}

                           <button
                              onClick={processPayment}
                              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
                           >
                              <ShieldCheck size={16} /> Gerar Referência e Confirmar
                           </button>
                        </div>
                     )}

                     {/* PROCESSANDO */}
                     {paymentStep === 'processing' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 py-20">
                           <RefreshCw size={80} className="text-indigo-500 animate-spin" />
                           <div className="text-center space-y-2">
                              <h2 className="text-2xl font-black uppercase">A registar...</h2>
                              <p className="text-zinc-500 text-sm font-medium">A gerar referência e registar pedido.</p>
                           </div>
                        </div>
                     )}

                     {/* PENDENTE — Sucesso com referência */}
                     {paymentStep === 'pending' && (
                        <div className="space-y-8 animate-in zoom-in-95 py-4">
                           <div className="text-center space-y-3">
                              <div className="w-20 h-20 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-yellow-500/10">
                                 <Clock size={36} className="text-yellow-400" />
                              </div>
                              <h2 className="text-3xl font-black uppercase tracking-tight">Pedido Registado</h2>
                              <p className="text-zinc-400 font-medium text-sm max-w-xs mx-auto">O seu pedido foi registado com sucesso. Efectue o pagamento e aguarde confirmação.</p>
                           </div>

                           {/* Caixa de referência */}
                           <div className="bg-zinc-900 p-6 rounded-3xl border border-yellow-500/30 space-y-4">
                              <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">Referência do Pagamento</p>
                              <div className="flex items-center justify-between bg-black/50 p-4 rounded-2xl border border-white/10">
                                 <span className="text-2xl font-black text-white tracking-wider font-mono">{referencia}</span>
                                 <button onClick={copyReferencia} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-zinc-400 hover:text-white">
                                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                 </button>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-medium">Use este código como referência ao efectuar o pagamento.</p>
                           </div>

                           {/* Instruções */}
                           <div className="bg-zinc-900 p-6 rounded-3xl border border-white/5 space-y-4">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instruções de Pagamento</p>
                              <div className="space-y-3">
                                 <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">1</span>
                                    <p className="text-sm text-zinc-300">Efectue o pagamento de <strong className="text-white">{formatAOA(selectedItem.preco)}</strong> via {paymentMethod}</p>
                                 </div>
                                 {paymentMethod === 'Multicaixa' && (
                                    <div className="flex items-start gap-3">
                                       <span className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">2</span>
                                       <p className="text-sm text-zinc-300">Envie para o número MCX <strong className="text-white">{NUMERO_ARENA}</strong></p>
                                    </div>
                                 )}
                                 {(paymentMethod === 'PayPal' || paymentMethod === 'Stripe') && (
                                    <div className="flex items-start gap-3">
                                       <span className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">2</span>
                                       <p className="text-sm text-zinc-300">Contacte-nos pelo <strong className="text-white">{NUMERO_ARENA}</strong> para receber o link de pagamento</p>
                                    </div>
                                 )}
                                 <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">3</span>
                                    <p className="text-sm text-zinc-300">A sua vaga será <strong className="text-white">confirmada em até 30 minutos</strong> após o pagamento</p>
                                 </div>
                              </div>
                           </div>

                           {/* Status */}
                           <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              <p className="text-[11px] font-black text-yellow-400 uppercase tracking-widest">Aguardando Confirmação de Pagamento</p>
                           </div>

                           <button onClick={handleCloseModal} className="w-full py-5 bg-white text-zinc-900 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-zinc-100 transition-all">
                              Fechar — Obrigado!
                           </button>
                        </div>
                     )}

                     {/* FALHADO */}
                     {paymentStep === 'failed' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 py-20">
                           <div className="w-24 h-24 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center">
                              <AlertCircle size={48} className="text-red-400" />
                           </div>
                           <div className="text-center space-y-2">
                              <h2 className="text-3xl font-black uppercase tracking-tight text-red-400">Erro no Pedido</h2>
                              <p className="text-zinc-500 font-medium text-sm">Ocorreu um erro ao registar o seu pedido. Por favor tente novamente.</p>
                           </div>
                           <div className="flex flex-col gap-3 w-full">
                              <button onClick={() => setPaymentStep('method')} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">
                                 Tentar Novamente
                              </button>
                              <button onClick={handleCloseModal} className="w-full py-5 bg-white/5 text-zinc-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                 Cancelar
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default ArenaGames;
