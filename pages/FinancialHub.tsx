
import React, { useState, useMemo, useEffect } from 'react';
import {
   Plus, Search, Filter, PieChart, BarChart3, TrendingUp, TrendingDown,
   Wallet, DollarSign, ArrowUpRight, ArrowDownLeft, Calendar, FileText,
   CheckCircle2, AlertTriangle, X, Save, Upload, Download, History,
   ShieldCheck, BrainCircuit, Sparkles, RefreshCw, Layers, Trash2, Printer,
   ChevronRight, Gauge, Lightbulb, Zap, ArrowRight, BarChart4,
   Banknote, CreditCard, Landmark, Tag, Briefcase, Activity, ShoppingCart,
   Construction, Shield, Mail, FileCheck, Globe, Info
} from 'lucide-react';
import {
   ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
   CartesianGrid, PieChart as RePieChart, Pie, Cell, BarChart, Bar, Legend,
   ComposedChart, Line
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import { TransacaoFinanceira, TransacaoTipo, TransacaoStatus, User } from '../types';
import { formatAOA } from '../constants';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const CATEGORIAS_TESOURARIA = [
   { name: 'Vendas de Serviços', icon: <Globe size={14} /> },
   { name: 'Manutenção Frota', icon: <Construction size={14} /> },
   { name: 'Combustível', icon: <Zap size={14} /> },
   { name: 'Salários', icon: <Briefcase size={14} /> },
   { name: 'Impostos', icon: <Shield size={14} /> },
   { name: 'Marketing', icon: <Sparkles size={14} /> },
   { name: 'Aluguer', icon: <Landmark size={14} /> },
   { name: 'Material de Escritório', icon: <ShoppingCart size={14} /> },
   { name: 'Seguros', icon: <ShieldCheck size={14} /> },
   { name: 'Outros', icon: <Info size={14} /> }
];

const FinancialHubPage: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'dashboard' | 'comparativo' | 'historico' | 'novo' | 'simulador'>('dashboard');
   const [searchTerm, setSearchTerm] = useState('');
   const [filterType, setFilterType] = useState<string>('Todas');
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

   // Estados de Simulação (Innovation)
   const [simCenario, setSimCenario] = useState({ revBoost: 0, costCut: 0 });

   // Estados de Dados
   const [transactions, setTransactions] = useState<TransacaoFinanceira[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchTransactions = async () => {
      setLoading(true);
      try {
         const { data, error } = await supabase
            .from('fin_transacoes')
            .select('*')
            .order('data', { ascending: false });
         if (error) throw error;
         if (data) {
            const mapped = data.map((t: any) => ({
               ...t,
               id: t.short_id
            }));
            setTransactions(mapped as unknown as TransacaoFinanceira[]);
         }
      } catch (error) {
         console.error('Error fetching transactions:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchTransactions();
   }, []);

   const [currentUser, setCurrentUser] = useState<User | null>(null);

   useEffect(() => {
      const loadProfile = async () => {
         const { data: { session } } = await supabase.auth.getSession();
         if (session?.user) {
            setCurrentUser({
               id: session.user.id,
               nome: session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Utilizador',
               role: 'admin', // Default or fetch from profile table if needed
               email: session.user.email || ''
            });
         }
      };
      loadProfile();
   }, []);


   // --- MÓDULO DE INTELIGÊNCIA DE DADOS ---
   const analysisData = useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      const filterByMonth = (t: TransacaoFinanceira, m: number, y: number) => {
         const d = new Date(t.data);
         return d.getMonth() === m && d.getFullYear() === y && t.status === 'Aprovado';
      };

      const curMonthTransactions = transactions.filter(t => filterByMonth(t, currentMonth, currentYear));
      const lastMonthTransactions = transactions.filter(t => filterByMonth(t, lastMonth, currentYear));

      const curRec = curMonthTransactions.filter(t => t.tipo === 'Receita').reduce((a, b) => a + (isNaN(b.valor) ? 0 : b.valor), 0);
      const curDes = curMonthTransactions.filter(t => t.tipo === 'Despesa').reduce((a, b) => a + (isNaN(b.valor) ? 0 : b.valor), 0);

      const lastRec = lastMonthTransactions.filter(t => t.tipo === 'Receita').reduce((a, b) => a + (isNaN(b.valor) ? 0 : b.valor), 0);
      const lastDes = lastMonthTransactions.filter(t => t.tipo === 'Despesa').reduce((a, b) => a + (isNaN(b.valor) ? 0 : b.valor), 0);

      // Previsão Automática (Linear Baseada em Dias Passados)
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const projectedRec = (curRec / dayOfMonth) * daysInMonth;
      const projectedDes = (curDes / dayOfMonth) * daysInMonth;

      // Alertas de Gastos (Anomalias por Categoria)
      const alertas: { categoria: string, excesso: number, media: number }[] = [];
      CATEGORIAS_TESOURARIA.forEach(cat => {
         const catSpentCur = curMonthTransactions.filter(t => t.categoria === cat.name && t.tipo === 'Despesa').reduce((a, b) => a + (isNaN(b.valor) ? 0 : b.valor), 0);
         const catSpentLast = lastMonthTransactions.filter(t => t.categoria === cat.name && t.tipo === 'Despesa').reduce((a, b) => a + (isNaN(b.valor) ? 0 : b.valor), 0);

         if (catSpentCur > catSpentLast * 1.2 && catSpentLast > 0) {
            alertas.push({ categoria: cat.name, excesso: ((catSpentCur / catSpentLast) - 1) * 100, media: catSpentLast });
         }
      });

      return {
         curRec, curDes, lastRec, lastDes,
         projectedRec: isFinite(projectedRec) ? projectedRec : 0,
         projectedDes: isFinite(projectedDes) ? projectedDes : 0,
         projectedBalance: (isFinite(projectedRec) ? projectedRec : 0) - (isFinite(projectedDes) ? projectedDes : 0),
         alertas
      };
   }, [transactions]);

   // --- HANDLERS ---
   const handleAIAnalysis = async () => {
      const apiKey = process.env.API_KEY || (window as any).VITE_GEMINI_API_KEY;
      if (!apiKey) {
         setAiAnalysis("Configuração de IA ausente. Contacte o administrador.");
         return;
      }

      setIsAnalyzing(true);
      try {
         const ai = new GoogleGenAI({ apiKey });
         const prompt = `Como Auditor Financeiro, analise estes dados de Angola:
      Mês Atual: Receita ${formatAOA(analysisData.curRec)}, Despesa ${formatAOA(analysisData.curDes)}.
      Mês Anterior: Receita ${formatAOA(analysisData.lastRec)}, Despesa ${formatAOA(analysisData.lastDes)}.
      Alertas: ${analysisData.alertas.map(a => `${a.categoria} subiu ${a.excesso.toFixed(0)}%`).join(', ')}.
      Previsão de Fechamento: ${formatAOA(analysisData.projectedBalance)}.
      Forneça 2 ações imediatas para conter custos e 1 previsão de risco para o próximo trimestre.`;

         const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
         });
         setAiAnalysis(response.text);
      } catch (e) {
         console.error('AI Error:', e);
         setAiAnalysis("Erro na rede neural. Verifique a ligação ou tente novamente.");
      } finally {
         setIsAnalyzing(false);
      }
   };

   // Helper for Category Icons
   const getCategoryIcon = (categoryName: string) => {
      const cat = CATEGORIAS_TESOURARIA.find(c => c.name === categoryName);
      return cat ? cat.icon : <Tag size={14} />;
   };

   const [previewTipo, setPreviewTipo] = useState<TransacaoTipo>('Despesa');
   const [previewValor, setPreviewValor] = useState(0);

   // Robust Variation Calculation
   const calculateVariation = (current: number, last: number) => {
      if (!last || last === 0) {
         return current > 0 ? '+100' : '0';
      }
      const variation = ((current / last) - 1) * 100;
      return isFinite(variation) ? variation.toFixed(1) : (variation > 0 ? '+100' : '0');
   };

   const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const tipo = formData.get('tipo') as TransacaoTipo;
      const shortId = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const dbData = {
         short_id: shortId,
         tipo,
         data: formData.get('data') as string,
         categoria: formData.get('categoria') as string,
         descricao: formData.get('descricao') as string,
         valor: Number(formData.get('valor')),
         moeda: 'AOA',
         forma_pagamento: formData.get('forma_pagamento') as any,
         entidade: formData.get('entidade') as string,
         documento_ref: formData.get('documento_ref') as string,
         centro_custo: formData.get('centro_custo') as string,
         status: (tipo === 'Reembolso' || tipo === 'Orçamento') ? 'Pendente' : 'Aprovado',
         usuario_id: currentUser?.id || 'sys',
         usuario_nome: currentUser?.nome || 'Sistema',
         data_criacao: new Date().toISOString(),
         historico_alteracoes: [{ data: new Date().toISOString(), usuario: currentUser?.nome || 'Sistema', acao: 'Registo inicial' }]
      };

      try {
         const { error } = await supabase.from('fin_transacoes').insert([dbData]);
         if (error) throw error;

         fetchTransactions();
         setActiveTab('historico');
         AmazingStorage.logAction('Transação Financeira', 'Tesouraria', `Lançamento de ${formatAOA(dbData.valor)} (${dbData.tipo}) efectuado.`);
      } catch (error) {
         alert('Erro ao registrar transação');
      }
   };

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <RefreshCw className="w-12 h-12 text-yellow-600 animate-spin" />
            <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">A processar dados financeiros...</p>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-24">
         {/* Header com Navegação Integrada */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200">
            <div>
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-zinc-900 rounded-2xl shadow-xl border border-white/10">
                     <BarChart4 className="text-yellow-500" size={28} />
                  </div>
                  <div>
                     <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase leading-none">Financial <span className="text-yellow-500">Intelligent</span> Hub</h1>
                     <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1">
                        <ShieldCheck size={14} className="text-green-600" /> Analítica Preditiva v3.1 • Amazing Group
                     </p>
                  </div>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               {[
                  { id: 'dashboard', icon: <Gauge size={18} />, label: 'Resumo' },
                  { id: 'comparativo', icon: <Layers size={18} />, label: 'Comparativo' },
                  { id: 'simulador', icon: <Zap size={18} />, label: 'Simulador' },
                  { id: 'historico', icon: <History size={18} />, label: 'Livro' },
                  { id: 'novo', icon: <Plus size={18} />, label: 'Lançar' }
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'}`}
                  >
                     {tab.icon} {tab.label}
                  </button>
               ))}
            </div>
         </div>

         {/* --- DASHBOARD: INSIGHTS & FORECAST --- */}
         {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">

               {/* Cards Preditivos */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm relative overflow-hidden group">
                     <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={120} /></div>
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Previsão Fim do Mês</p>
                     <p className="text-3xl font-black text-zinc-900">{formatAOA(analysisData.projectedBalance)}</p>
                     <div className={`mt-4 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg w-fit ${analysisData.projectedBalance >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {analysisData.projectedBalance >= 0 ? 'Lucro Projectado' : 'Atenção: Défice Projectado'}
                     </div>
                  </div>

                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-10"><Zap size={80} /></div>
                     <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Média de Gasto Diário</p>
                     <p className="text-3xl font-black">{formatAOA(analysisData.curDes / (new Date().getDate()))}</p>
                     <div className="mt-4 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, (analysisData.curDes / analysisData.curRec) * 100)}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black uppercase">Consumo de Receita</span>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3">Eficiência Operacional</p>
                     <div className="flex items-end gap-3">
                        <p className="text-5xl font-black text-zinc-900">88%</p>
                        <div className="flex flex-col pb-1">
                           <span className="text-[9px] font-black text-green-600 uppercase">+4% vs Méd.</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Alertas Inteligentes */}
               {analysisData.alertas.length > 0 && (
                  <div className="bg-red-50 border border-red-100 p-8 rounded-[3rem] animate-in zoom-in-95">
                     <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="text-red-600" size={24} />
                        <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Detectamos Anomalias de Gastos</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analysisData.alertas.map((a, i) => (
                           <div key={i} className="bg-white p-6 rounded-[2rem] border border-red-100 shadow-sm flex items-center justify-between">
                              <div>
                                 <p className="text-xs font-black text-zinc-900">{a.categoria}</p>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase">Média anterior: {formatAOA(a.media)}</p>
                              </div>
                              <div className="text-right">
                                 <span className="text-lg font-black text-red-600">+{a.excesso.toFixed(0)}%</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[450px]">
                     <h3 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
                        <TrendingUp size={22} className="text-yellow-500" /> Fluxo de Caixa Preditivo
                     </h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={[
                           { name: 'Sem 1', real: 4000, proj: 4000 },
                           { name: 'Sem 2', real: 3000, proj: 3200 },
                           { name: 'Sem 3', real: 5500, proj: 5800 },
                           { name: 'Sem 4', real: null, proj: 7200 },
                        ]}>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                           <YAxis hide />
                           <Tooltip />
                           <Area type="monotone" dataKey="real" stroke="#eab308" fill="#fef9c3" strokeWidth={4} />
                           <Area type="monotone" dataKey="proj" stroke="#18181b" fill="transparent" strokeWidth={2} strokeDasharray="10 10" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-black p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden border border-indigo-500/30 flex flex-col justify-center">
                     <div className="absolute top-0 right-0 p-12 opacity-10 animate-pulse"><BrainCircuit size={200} /></div>
                     <h2 className="text-4xl font-black tracking-tighter leading-none mb-6">Diagnóstico <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-white">Cognitivo do Mês.</span></h2>
                     <p className="text-zinc-400 text-lg font-medium leading-relaxed max-w-sm mb-8">Nossa IA analisa cada lançamento para garantir conformidade e detectar fraude em tempo real.</p>
                     <button
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                        className="w-fit px-12 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl transition-all disabled:opacity-50 flex items-center gap-4 active:scale-95"
                     >
                        {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                        {isAnalyzing ? 'Processando...' : 'Pedir Auditoria IA'}
                     </button>
                  </div>
               </div>

               {aiAnalysis && (
                  <div className="bg-white p-12 rounded-[3.5rem] border-2 border-indigo-100 shadow-3xl animate-in zoom-in-95">
                     <div className="text-zinc-700 text-xl font-medium leading-relaxed italic whitespace-pre-wrap">{aiAnalysis}</div>
                  </div>
               )}
            </div>
         )}

         {/* --- SIMULADOR DE CENÁRIOS (INNOVATION) --- */}
         {activeTab === 'simulador' && (
            <div className="animate-in slide-in-from-bottom-6 space-y-10">
               <div className="bg-white p-12 rounded-[4rem] border border-sky-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="space-y-10">
                     <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">O Motor de <span className="text-yellow-500">Cenários</span></h2>
                        <p className="text-zinc-500 font-medium mt-2">Ajuste os controles para simular o impacto no seu resultado final.</p>
                     </div>

                     <div className="space-y-8">
                        <div className="space-y-4">
                           <div className="flex justify-between font-black text-[10px] uppercase tracking-widest text-zinc-400">
                              <span>Impulso na Receita</span>
                              <span className="text-green-600">+{simCenario.revBoost}%</span>
                           </div>
                           <input
                              type="range" min="0" max="100" value={simCenario.revBoost}
                              onChange={e => setSimCenario({ ...simCenario, revBoost: Number(e.target.value) })}
                              className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-green-500"
                           />
                        </div>

                        <div className="space-y-4">
                           <div className="flex justify-between font-black text-[10px] uppercase tracking-widest text-zinc-400">
                              <span>Corte de Custos Operacionais</span>
                              <span className="text-yellow-600">-{simCenario.costCut}%</span>
                           </div>
                           <input
                              type="range" min="0" max="50" value={simCenario.costCut}
                              onChange={e => setSimCenario({ ...simCenario, costCut: Number(e.target.value) })}
                              className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="bg-zinc-900 rounded-[3rem] p-10 text-white flex flex-col justify-center items-center text-center shadow-3xl">
                     <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.4em] mb-6">Resultado Simulado</p>
                     <p className="text-6xl font-black text-yellow-500 mb-4">
                        {formatAOA(
                           (analysisData.curRec * (1 + simCenario.revBoost / 100)) -
                           (analysisData.curDes * (1 - simCenario.costCut / 100))
                        )}
                     </p>
                     <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-10">Lucro Líquido Estimado</p>
                     <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                           <p className="text-[9px] font-black text-zinc-500 uppercase">Margem Nova</p>
                           <p className="text-lg font-black text-white">32.5%</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                           <p className="text-[9px] font-black text-zinc-500 uppercase">ROI Projectado</p>
                           <p className="text-lg font-black text-white">2.4x</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- COMPARATIVO MENSAL (MoM) --- */}
         {activeTab === 'comparativo' && (
            <div className="space-y-8 animate-in fade-in">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm">
                     <h3 className="text-xl font-black uppercase tracking-tight mb-8">Receita: Este vs Anterior</h3>
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <p className="text-[10px] font-black text-zinc-400 uppercase">Variação Percentual</p>
                           <p className={`text-4xl font-black ${analysisData.curRec >= analysisData.lastRec ? 'text-green-600' : 'text-red-600'}`}>
                              {calculateVariation(analysisData.curRec, analysisData.lastRec)}%
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-zinc-700">Mês Actual: {formatAOA(analysisData.curRec)}</p>
                           <p className="text-sm font-bold text-zinc-400">Mês Passado: {formatAOA(analysisData.lastRec)}</p>
                        </div>
                     </div>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={[{ name: 'Receita', cur: analysisData.curRec, last: analysisData.lastRec }]}>
                              <Bar dataKey="last" fill="#e2e8f0" radius={[10, 10, 0, 0]} />
                              <Bar dataKey="cur" fill="#eab308" radius={[10, 10, 0, 0]} />
                              <Tooltip cursor={{ fill: 'transparent' }} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm">
                     <h3 className="text-xl font-black uppercase tracking-tight mb-8">Custos: Este vs Anterior</h3>
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <p className="text-[10px] font-black text-zinc-400 uppercase">Variação Percentual</p>
                           <p className={`text-4xl font-black ${analysisData.curDes <= analysisData.lastDes ? 'text-green-600' : 'text-red-600'}`}>
                              {calculateVariation(analysisData.curDes, analysisData.lastDes)}%
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-zinc-700">Mês Actual: {formatAOA(analysisData.curDes)}</p>
                           <p className="text-sm font-bold text-zinc-400">Mês Passado: {formatAOA(analysisData.lastDes)}</p>
                        </div>
                     </div>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={[{ name: 'Custos', cur: analysisData.curDes, last: analysisData.lastDes }]}>
                              <Bar dataKey="last" fill="#e2e8f0" radius={[10, 10, 0, 0]} />
                              <Bar dataKey="cur" fill="#ef4444" radius={[10, 10, 0, 0]} />
                              <Tooltip cursor={{ fill: 'transparent' }} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- MÓDULO DE LANÇAMENTO (LAPIDADO) --- */}
         {activeTab === 'novo' && (
            <div className="max-w-6xl mx-auto animate-in fade-in-up duration-700">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Formulário Principal */}
                  <div className="lg:col-span-2">
                     <form onSubmit={handleCreateTransaction} className="bg-white p-12 rounded-[3.5rem] shadow-3xl border border-sky-100 space-y-12 relative overflow-hidden">
                        {/* Indicador de Tipo de Transação Dinâmico */}
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 -mr-16 -mt-16 rounded-full transition-all duration-500 ${previewTipo === 'Receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                        <div className="flex justify-between items-center border-b border-zinc-100 pb-8">
                           <div>
                              <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Efectivar <span className={previewTipo === 'Receita' ? 'text-green-600' : 'text-red-600'}>Lançamento</span></h2>
                              <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Registo Oficial de Tesouraria • Amazing Group</p>
                           </div>
                           <div className={`p-4 rounded-2xl shadow-lg border transition-all ${previewTipo === 'Receita' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                              {previewTipo === 'Receita' ? <ArrowUpRight size={28} /> : <ArrowDownLeft size={28} />}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                 <Tag size={12} /> Identificação Básica
                              </h4>
                              <Select
                                 name="tipo"
                                 label="Natureza da Operação"
                                 required
                                 value={previewTipo}
                                 onChange={(e) => setPreviewTipo(e.target.value as any)}
                                 options={[
                                    { value: 'Despesa', label: 'Despesa / Pagamento' },
                                    { value: 'Receita', label: 'Receita / Venda' },
                                    { value: 'Reembolso', label: 'Pedido de Reembolso' },
                                    { value: 'Orçamento', label: 'Proposta Orçamental' }
                                 ]}
                              />
                              <Input name="data" label="Data do Evento" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                           </div>

                           <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                 <Layers size={12} /> Classificação Contábil
                              </h4>
                              <Select name="categoria" label="Rubrica Financeira" options={CATEGORIAS_TESOURARIA.map(c => ({ value: c.name, label: c.name }))} />
                              <Input name="documento_ref" label="Nº de Referência / DOC" required placeholder="Ex: FT/2026/001" />
                           </div>
                        </div>

                        <div className="space-y-6">
                           <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                              <Landmark size={12} /> Entidade Envolvida
                           </h4>
                           <Input name="entidade" label="Fornecedor, Beneficiário ou Cliente" required placeholder="Ex: Unitel S.A. | Cliente X" />
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-zinc-700 uppercase tracking-widest ml-1">Descrição Detalhada</label>
                              <span className="text-[9px] font-bold text-zinc-400 uppercase">Auditável por Auditoria IA</span>
                           </div>
                           <textarea name="descricao" required className="w-full bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 font-medium transition-all h-32 text-sm" placeholder="Descreva o motivo claro deste lançamento para efeitos de auditoria..." />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                           <div className="space-y-2">
                              <label className="text-[11px] font-black text-zinc-700 uppercase tracking-widest ml-1">Montante (AOA)</label>
                              <div className="relative">
                                 <input
                                    name="valor"
                                    type="number"
                                    step="0.01"
                                    required
                                    onChange={(e) => setPreviewValor(Number(e.target.value))}
                                    className="w-full bg-white border-2 border-zinc-900 rounded-2xl px-6 py-4 text-2xl font-black focus:ring-4 focus:ring-yellow-500/20 transition-all outline-none"
                                    placeholder="0,00"
                                 />
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-400">AOA</div>
                              </div>
                           </div>
                           <Select name="forma_pagamento" label="Meio de Liquidação" options={[{ value: 'Transferência', label: 'Transferência' }, { value: 'Multicaixa', label: 'TPA' }, { value: 'Cash', label: 'Cash' }, { value: 'Cheque', label: 'Cheque' }]} />
                           <Input name="centro_custo" label="Centro de Custo" required placeholder="Sede / Divisão X" />
                        </div>

                        <div className="pt-10 border-t border-zinc-100 flex justify-end gap-6">
                           <button type="button" onClick={() => setActiveTab('dashboard')} className="px-10 py-5 text-[11px] font-black uppercase text-zinc-400 hover:text-zinc-600 transition-colors">Cancelar</button>
                           <button type="submit" className="px-16 py-5 bg-zinc-900 text-white font-black rounded-3xl uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-zinc-800 transition-all flex items-center gap-4 group">
                              <Save size={20} className="group-hover:scale-110 transition-transform" /> Confirmar Registo
                           </button>
                        </div>
                     </form>
                  </div>

                  {/* Sidebar de Contexto / Mini-Resumo */}
                  <div className="space-y-6">
                     <div className="bg-zinc-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><RefreshCw size={100} /></div>
                        <h3 className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mb-8">Estado do Mês</h3>

                        <div className="space-y-8">
                           <div className="flex justify-between items-end border-b border-white/10 pb-4">
                              <span className="text-zinc-400 text-[10px] uppercase font-black">Receita Total</span>
                              <span className="text-xl font-black text-green-400">{formatAOA(analysisData.curRec)}</span>
                           </div>
                           <div className="flex justify-between items-end border-b border-white/10 pb-4">
                              <span className="text-zinc-400 text-[10px] uppercase font-black">Despesa Total</span>
                              <span className="text-xl font-black text-red-400">{formatAOA(analysisData.curDes)}</span>
                           </div>

                           <div className="pt-4">
                              <p className="text-zinc-500 text-[9px] uppercase font-black mb-1">Saldo Remanescente</p>
                              <p className={`text-4xl font-black ${analysisData.curRec - analysisData.curDes >= 0 ? 'text-white' : 'text-red-500'}`}>
                                 {formatAOA(analysisData.curRec - analysisData.curDes)}
                              </p>
                           </div>

                           {previewValor > 0 && (
                              <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/10 animate-in zoom-in-95">
                                 <p className="text-yellow-500 text-[9px] uppercase font-black mb-2">Simulação de Lançamento</p>
                                 <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold">Novo Saldo</span>
                                    <span className="text-sm font-black">
                                       {formatAOA((analysisData.curRec - analysisData.curDes) + (previewTipo === 'Receita' ? previewValor : -previewValor))}
                                    </span>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-zinc-900 font-black text-xs uppercase tracking-widest">
                           <Info size={16} className="text-yellow-500" /> Notas de Auditoria
                        </div>
                        <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
                           Todos os lançamentos efectuados neste hub são sincronizados encriptados para a cloud. Certifique-se de anexar a referência documental correcta para conformidade fiscal angolana.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- LISTAGEM (LAPIDADA) --- */}
         {activeTab === 'historico' && (
            <div className="space-y-6 animate-in fade-in-up duration-700">
               <div className="bg-white p-4 rounded-3xl shadow-sm border border-sky-100 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 w-full px-4 flex items-center gap-4 group">
                     <Search className="text-zinc-300 group-focus-within:text-yellow-500 transition-colors" />
                     <input
                        placeholder="Pesquisar por entidade, descrição ou ID..."
                        className="w-full bg-transparent border-none focus:ring-0 text-zinc-900 font-bold placeholder:text-zinc-300"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-2 pr-4">
                     {['Todas', 'Receita', 'Despesa'].map(type => (
                        <button
                           key={type}
                           onClick={() => setFilterType(type)}
                           className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-100'}`}
                        >
                           {type}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] shadow-xl border border-sky-50 overflow-hidden relative">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-900 border-b border-white/5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                           <th className="px-10 py-10">Data / Registo</th>
                           <th className="px-10 py-10">Entidade & Detalhes</th>
                           <th className="px-10 py-10 text-center">Classificação</th>
                           <th className="px-10 py-10 text-right">Valor Líquido</th>
                           <th className="px-10 py-10 text-right">Acções / Estado</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        {transactions
                           .filter(t =>
                              (filterType === 'Todas' || t.tipo === filterType) &&
                              (t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.entidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.id.toLowerCase().includes(searchTerm.toLowerCase()))
                           )
                           .map(t => (
                              <tr key={t.id} className="group hover:bg-zinc-50/80 transition-all duration-300">
                                 <td className="px-10 py-8">
                                    <span className="font-black text-zinc-300 block text-[9px] mb-1 tracking-widest group-hover:text-yellow-600 transition-colors">{t.id}</span>
                                    <div className="flex items-center gap-2 text-zinc-900 font-black text-sm">
                                       <Calendar size={14} className="text-zinc-400" /> {new Date(t.data).toLocaleDateString()}
                                    </div>
                                 </td>
                                 <td className="px-10 py-8">
                                    <span className="font-black text-zinc-900 text-base block mb-1 uppercase tracking-tight">{t.entidade}</span>
                                    <p className="text-zinc-400 font-bold text-[10px] line-clamp-1 max-w-[200px] uppercase">{t.descricao}</p>
                                 </td>
                                 <td className="px-10 py-8">
                                    <div className="flex flex-col items-center gap-2">
                                       <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-sm flex items-center gap-2 ${t.tipo === 'Receita' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                          {t.tipo === 'Receita' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />} {t.tipo}
                                       </div>
                                       <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase">
                                          {getCategoryIcon(t.categoria)}
                                          {t.categoria}
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-10 py-8 text-right">
                                    <span className={`text-lg font-black tracking-tighter ${t.tipo === 'Receita' ? 'text-green-600' : 'text-zinc-900'}`}>
                                       {t.tipo === 'Receita' ? '+' : '-'} {formatAOA(t.valor)}
                                    </span>
                                    <span className="block text-[10px] font-bold text-zinc-300 uppercase mt-1">{t.forma_pagamento} • AOA</span>
                                 </td>
                                 <td className="px-10 py-8">
                                    <div className="flex items-center justify-end gap-3">
                                       <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${t.status === 'Aprovado' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Aprovado' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                                          <span className="text-[9px] font-black uppercase tracking-widest">{t.status}</span>
                                       </div>
                                       <button className="p-2 bg-zinc-100 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all">
                                          <Info size={16} />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                     </tbody>
                  </table>
                  {loading && (
                     <div className="absolute inset-x-0 bottom-0 p-8 bg-white/80 backdrop-blur-md flex justify-center">
                        <RefreshCw className="animate-spin text-yellow-500" />
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>
   );
};

export default FinancialHubPage;
