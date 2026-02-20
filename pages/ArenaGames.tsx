
import React, { useState, useEffect, useMemo } from 'react';
import {
   Gamepad2, Rocket, Zap, Star, Clock, CreditCard,
   CheckCircle2, X, Search, Globe, Play, Trophy,
   TrendingUp, Calendar, Award, Target, Save,
   Smartphone, Wallet, ShieldCheck, ArrowRight,
   RefreshCw, QrCode, Mail, History, Info, Medal, MapPin, Map, Navigation
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/ui/Input';
import { supabase } from '../src/lib/supabase';
import { Game, GamePayment, ArenaTournament, ArenaRanking, PaymentMethod } from '../types';
import { formatAOA } from '../constants';

const ArenaGames: React.FC = () => {
   const [activeStep, setActiveStep] = useState<'catalog' | 'tournaments' | 'ranking'>('catalog');
   const [searchTerm, setSearchTerm] = useState('');
   const [loading, setLoading] = useState(true);

   // Fluxo de Solicitação e Pagamento
   const [selectedItem, setSelectedItem] = useState<{ id: string, titulo: string, preco: number, tipo: 'jogo' | 'torneio', imagem_url?: string } | null>(null);
   const [isRequesting, setIsRequesting] = useState(false);
   const [paymentStep, setPaymentStep] = useState<'details' | 'method' | 'processing' | 'success'>('details');
   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Multicaixa');
   const [clientData, setClientData] = useState({ nome: '', tel: '', email: '' });

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
      setIsRequesting(true);
   };

   const processPayment = async (e: React.FormEvent) => {
      e.preventDefault();
      setPaymentStep('processing');

      try {
         const paymentPayload = {
            game_id: selectedItem?.tipo === 'jogo' ? selectedItem.id : null,
            game_titulo: selectedItem!.titulo,
            valor: selectedItem!.preco,
            metodo: paymentMethod,
            status: 'Confirmado',
            cliente_nome: clientData.nome,
            cliente_telefone: clientData.tel,
            data: new Date().toISOString()
         };

         // 1. Inserir pagamento
         const { error: pError } = await supabase.from('arena_payments').insert([paymentPayload]);
         if (pError) throw pError;

         // 2. Atualizar vagas
         if (selectedItem?.tipo === 'jogo') {
            const game = games.find(g => g.id === selectedItem.id);
            if (game) {
               await supabase.from('arena_games')
                  .update({ vagas_disponiveis: Math.max(0, game.vagas_disponiveis - 1) })
                  .eq('id', selectedItem.id);
            }
         } else {
            const tourney = tournaments.find(t => t.id === selectedItem?.id);
            if (tourney) {
               await supabase.from('arena_tournaments')
                  .update({ vagas: Math.max(0, tourney.vagas - 1) })
                  .eq('id', selectedItem.id);
            }
         }

         await fetchArenaData();
         setPaymentStep('success');
      } catch (error) {
         console.error('Payment error:', error);
         alert('Erro ao processar pagamento. Tente novamente.');
         setPaymentStep('method');
      }
   };

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
                                 <button onClick={() => handleOpenRequest(game, 'jogo')} className="px-8 py-5 bg-white text-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3">
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

         {/* MODAL DE CHECKOUT */}
         {isRequesting && selectedItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-[#111216] w-full max-w-4xl rounded-[4rem] shadow-3xl overflow-hidden border border-white/10 flex flex-col md:flex-row">
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
                     </div>
                     <div className="pt-10 flex items-center gap-3 opacity-30">
                        <ShieldCheck size={20} />
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Amazing Security Protocol</p>
                     </div>
                  </div>

                  <div className="md:w-3/5 p-12 relative flex flex-col justify-center">
                     <button onClick={() => setIsRequesting(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-all"><X size={28} /></button>

                     {paymentStep === 'details' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                           <h2 className="text-4xl font-black uppercase tracking-tighter">Identificação</h2>
                           <form onSubmit={(e) => { e.preventDefault(); setPaymentStep('method'); }} className="space-y-4">
                              <Input label="Seu Gamer Tag / Nome" required className="bg-white/5 border-white/10 text-white" value={clientData.nome} onChange={e => setClientData({ ...clientData, nome: e.target.value })} />
                              <Input label="Telemóvel" required placeholder="+244" className="bg-white/5 border-white/10 text-white" value={clientData.tel} onChange={e => setClientData({ ...clientData, tel: e.target.value })} />
                              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3">Escolher Pagamento <ArrowRight size={16} /></button>
                           </form>
                        </div>
                     )}

                     {paymentStep === 'method' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                           <h2 className="text-4xl font-black uppercase tracking-tighter">Pagamento</h2>
                           <div className="grid grid-cols-2 gap-4">
                              {[
                                 { id: 'Multicaixa', label: 'MCX Express', icon: <Smartphone /> },
                                 { id: 'PayPal', label: 'PayPal', icon: <Globe /> },
                                 { id: 'Visa/Mastercard', label: 'Cartão Int.', icon: <CreditCard /> },
                                 { id: 'Unitel Money', label: 'Unitel Money', icon: <Wallet /> }
                              ].map(m => (
                                 <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`p-6 rounded-3xl border flex flex-col items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-white text-zinc-900 border-white shadow-xl' : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10'}`}>
                                    {m.icon} <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                                 </button>
                              ))}
                           </div>
                           {paymentMethod === 'Multicaixa' && (
                              <div className="bg-zinc-900 p-6 rounded-3xl border-l-4 border-indigo-500 animate-in fade-in">
                                 <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Conta de Envio Arena</p>
                                 <p className="text-xl font-black text-white">929 882 067</p>
                              </div>
                           )}
                           <button onClick={processPayment} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl">Finalizar e Receber Ticket</button>
                        </div>
                     )}

                     {paymentStep === 'processing' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95">
                           <RefreshCw size={80} className="text-indigo-500 animate-spin" />
                           <div className="text-center space-y-2">
                              <h2 className="text-2xl font-black uppercase">Sincronizando...</h2>
                              <p className="text-zinc-500 text-sm font-medium">Validando transação com a Rede Amazing.</p>
                           </div>
                        </div>
                     )}

                     {paymentStep === 'success' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95">
                           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20"><CheckCircle2 size={48} className="text-white" /></div>
                           <div className="text-center space-y-2">
                              <h2 className="text-4xl font-black uppercase tracking-tight">Sucesso!</h2>
                              <p className="text-zinc-500 font-medium">O seu acesso foi reservado com sucesso.</p>
                           </div>
                           <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl relative"><QrCode size={180} className="text-zinc-900" /></div>
                           <button onClick={() => setIsRequesting(false)} className="w-full py-5 bg-white text-zinc-900 font-black rounded-2xl uppercase text-[10px] tracking-widest">Fechar e Jogar</button>
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
