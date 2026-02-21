import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
   Building2, Key, Hammer, BrainCircuit, BarChart3, Search, Plus,
   MapPin, DollarSign, Calendar, CheckCircle2, XCircle, Home,
   ArrowUpRight, AlertTriangle, Briefcase, Ruler, UserCheck,
   TrendingUp, Activity, Sparkles, RefreshCw, Layers, HardHat,
   PaintBucket, Wrench, PieChart as PieIcon, LineChart as LineChartIcon,
   ArrowRightLeft, Target, MoreVertical, Trash2, Edit
} from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
   PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
   ComposedChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../src/lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import { Imovel, ContratoImobiliario, ObraReabilitacao, ImovelStatus, ImovelTipo } from '../types';

// --- COMPONENTE PRINCIPAL ---
const RealEstatePage: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'imoveis' | 'contratos' | 'obras' | 'consultoria'>('dashboard');

   // Modals
   const [showImovelModal, setShowImovelModal] = useState(false);
   const [showContratoModal, setShowContratoModal] = useState(false);
   const [showObraModal, setShowObraModal] = useState(false);

   // States de Edição
   const [editingImovel, setEditingImovel] = useState<Imovel | null>(null);
   const [editingContrato, setEditingContrato] = useState<ContratoImobiliario | null>(null);
   const [editingObra, setEditingObra] = useState<ObraReabilitacao | null>(null);

   // States de Dados (Supabase)
   const [imoveis, setImoveis] = useState<Imovel[]>([]);
   const [contratos, setContratos] = useState<ContratoImobiliario[]>([]);
   const [obras, setObras] = useState<ObraReabilitacao[]>([]);
   const [loading, setLoading] = useState(true);

   // AI State
   const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);

   // Filtros
   const [searchTerm, setSearchTerm] = useState('');

   const fetchRealEstateData = async () => {
      setLoading(true);
      try {
         const [
            { data: imv },
            { data: cnt },
            { data: obr }
         ] = await Promise.all([
            supabase.from('real_imoveis').select('*').order('created_at', { ascending: false }),
            supabase.from('real_contratos').select('*').order('created_at', { ascending: false }),
            supabase.from('real_obras').select('*').order('created_at', { ascending: false })
         ]);

         if (imv) setImoveis(imv as unknown as Imovel[]);
         if (cnt) setContratos(cnt as unknown as ContratoImobiliario[]);
         if (obr) setObras(obr as unknown as ObraReabilitacao[]);
      } catch (error) {
         console.error('Error fetching real estate data:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchRealEstateData();
   }, []);

   // Limpar pesquisa ao trocar de aba para evitar confusão
   useEffect(() => {
      setSearchTerm('');
   }, [activeTab]);

   // --- ANALYTICS BÁSICO ---
   const stats = useMemo(() => {
      const totalImoveis = imoveis.length;
      const ocupados = imoveis.filter(i => i.status === 'Ocupado' || i.status === 'Reservado').length;
      const taxaOcupacao = totalImoveis > 0 ? (ocupados / totalImoveis) * 100 : 0;

      const receitaMensal = contratos
         .filter(c => c.status === 'Activo')
         .reduce((acc, c) => acc + (c.tipo === 'Arrendamento' ? c.valor_mensal : c.valor_mensal * 30), 0);

      const valorPatrimonial = imoveis.reduce((acc, i) => acc + (i.preco_venda || 0), 0);
      const obrasEmCurso = obras.filter(o => o.status === 'Em Execução').length;

      return { totalImoveis, ocupados, taxaOcupacao, receitaMensal, valorPatrimonial, obrasEmCurso };
   }, [imoveis, contratos, obras]);

   // --- ANALYTICS AVANÇADO (GRÁFICOS COMPARATIVOS) ---
   const comparativeData = useMemo(() => {
      // 1. Receita vs Despesas (Estimado) - Mês vs Mês
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const financialTrend = months.map((m, idx) => {
         const baseRevenue = stats.receitaMensal;
         const factor = 0.8 + (idx * 0.05);
         const revenue = baseRevenue * factor;
         const expenses = revenue * 0.35;
         return {
            name: m,
            Receita: revenue,
            Despesa: expenses,
            Lucro: revenue - expenses
         };
      });

      // 2. Performance por Região (Valor Patrimonial)
      const regionMap: Record<string, number> = {};
      imoveis.forEach(i => {
         regionMap[i.localizacao] = (regionMap[i.localizacao] || 0) + (i.preco_venda || 0);
      });
      const regionalData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

      // 3. Obras: Orçamento vs Real (Desempenho Financeiro de Obras)
      const obrasPerformance = obras.map(o => ({
         name: o.descricao.length > 15 ? o.descricao.substring(0, 15) + '...' : o.descricao,
         Previsto: o.orcamento_previsto,
         Real: o.custo_atual,
         Desvio: o.custo_atual - o.orcamento_previsto
      }));

      // 4. Rentabilidade Média por Tipo (ROI)
      const roiMap: Record<string, { totalRoi: number, count: number }> = {};
      imoveis.forEach(i => {
         if (!roiMap[i.tipo]) roiMap[i.tipo] = { totalRoi: 0, count: 0 };
         roiMap[i.tipo].totalRoi += i.rentabilidade_estimada || 0;
         roiMap[i.tipo].count += 1;
      });
      const roiData = Object.entries(roiMap).map(([name, data]) => ({
         name,
         ROI: parseFloat((data.totalRoi / data.count).toFixed(2))
      }));

      return { financialTrend, regionalData, obrasPerformance, roiData };
   }, [imoveis, contratos, obras, stats]);

   const chartDataTipos = useMemo(() => {
      const counts: Record<string, number> = {};
      imoveis.forEach(i => counts[i.tipo] = (counts[i.tipo] || 0) + 1);
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
   }, [imoveis]);

   const chartDataReceita = useMemo(() => {
      return [
         { name: 'Jan', receita: stats.receitaMensal * 0.9 },
         { name: 'Fev', receita: stats.receitaMensal * 0.95 },
         { name: 'Mar', receita: stats.receitaMensal },
         { name: 'Abr', receita: stats.receitaMensal * 1.05 },
         { name: 'Mai', receita: stats.receitaMensal * 1.1 },
         { name: 'Jun', receita: stats.receitaMensal * 1.12 },
      ];
   }, [stats.receitaMensal]);

   // --- AI HANDLER ---
   const handleConsultoriaAI = async () => {
      setIsAnalyzing(true);
      setAiAnalysis(null);
      try {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const prompt = `Atue como um Consultor Imobiliário Sênior da Amazing Imobiliário.
      
      Dados Comparativos:
      - Imóveis: ${stats.totalImoveis} (Valor Total: ${formatAOA(stats.valorPatrimonial)})
      - Taxa de Ocupação: ${stats.taxaOcupacao.toFixed(1)}%
      - Receita Mensal: ${formatAOA(stats.receitaMensal)}
      - Obras Ativas: ${stats.obrasEmCurso}
      
      Analise os dados e gere:
      1. Comparativo de desempenho entre Arrendamento vs Aluguer Diário (sugira o mix ideal).
      2. Análise de risco baseada na taxa de ocupação vs custos de manutenção.
      3. Previsão de valorização pós-obra para os projetos em curso.
      `;

         const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt
         });
         setAiAnalysis(response.text);
      } catch (error) {
         setAiAnalysis("Erro ao conectar com o consultor IA. Verifique sua conexão.");
      } finally {
         setIsAnalyzing(false);
      }
   };

   // --- CRUD HANDLERS ---
   const handleSaveImovel = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data: Imovel = {
         id: editingImovel ? editingImovel.id : Math.random().toString(36).substr(2, 9),
         titulo: fd.get('titulo') as string,
         tipo: fd.get('tipo') as ImovelTipo,
         localizacao: fd.get('localizacao') as string,
         area_m2: Number(fd.get('area')),
         quartos: Number(fd.get('quartos')),
         preco_venda: Number(fd.get('preco_venda')),
         preco_renda: Number(fd.get('preco_renda')),
         status: fd.get('status') as ImovelStatus,
         proprietario: fd.get('proprietario') as string,
         foto_principal: editingImovel?.foto_principal || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800',
         rentabilidade_estimada: Number(fd.get('rentabilidade')),
         custo_manutencao_mensal: Number(fd.get('custo_manutencao'))
      };

      try {
         const { error } = await supabase.from('real_imoveis').upsert([data]);
         if (error) throw error;
         fetchRealEstateData();
         setShowImovelModal(false);
         setEditingImovel(null);
      } catch (error) {
         alert('Erro ao salvar imóvel');
      }
   };

   const handleSaveContrato = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data: ContratoImobiliario = {
         id: editingContrato ? editingContrato.id : Math.random().toString(36).substr(2, 9),
         imovel_id: fd.get('imovel_id') as string,
         inquilino_nome: fd.get('inquilino') as string,
         inquilino_nif: fd.get('nif') as string,
         data_inicio: fd.get('inicio') as string,
         data_fim: fd.get('fim') as string,
         valor_mensal: Number(fd.get('valor')),
         periodicidade_pagamento: fd.get('periodo') as any,
         status: fd.get('status') as any,
         tipo: fd.get('tipo') as any
      };

      try {
         if (editingContrato) {
            const { error } = await supabase.from('real_contratos').update(data).eq('id', data.id);
            if (error) throw error;
         } else {
            const { error: cError } = await supabase.from('real_contratos').insert([data]);
            if (cError) throw cError;
            // Atualizar status do imóvel
            const { error: iError } = await supabase.from('real_imoveis').update({ status: 'Ocupado' }).eq('id', data.imovel_id);
            if (iError) throw iError;
         }
         fetchRealEstateData();
         setShowContratoModal(false);
         setEditingContrato(null);
      } catch (error) {
         alert('Erro ao salvar contrato');
      }
   };

   const handleSaveObra = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data: ObraReabilitacao = {
         id: editingObra ? editingObra.id : Math.random().toString(36).substr(2, 9),
         imovel_id: fd.get('imovel_id') as string,
         descricao: fd.get('descricao') as string,
         orcamento_previsto: Number(fd.get('orcamento')),
         custo_atual: Number(fd.get('custo_atual')),
         data_inicio: fd.get('inicio') as string,
         previsao_fim: fd.get('fim') as string,
         status: fd.get('status') as any,
         progresso: Number(fd.get('progresso'))
      };

      try {
         if (editingObra) {
            const { error } = await supabase.from('real_obras').update(data).eq('id', data.id);
            if (error) throw error;
         } else {
            const { error: oError } = await supabase.from('real_obras').insert([data]);
            if (oError) throw oError;
            // Atualizar status do imóvel para 'Manutenção'
            const { error: iError } = await supabase.from('real_imoveis').update({ status: 'Manutenção' }).eq('id', data.imovel_id);
            if (iError) throw iError;
         }
         fetchRealEstateData();
         setShowObraModal(false);
         setEditingObra(null);
      } catch (error) {
         alert('Erro ao salvar obra');
      }
   };

   const handleDeleteImovel = async (id: string, titulo: string) => {
      if (confirm(`Remover imóvel: ${titulo}?`)) {
         try {
            const { error } = await supabase.from('real_imoveis').delete().eq('id', id);
            if (error) throw error;
            fetchRealEstateData();
         } catch (error) {
            alert('Erro ao remover imóvel');
         }
      }
   };

   const handleDeleteContrato = async (id: string) => {
      if (confirm('Remover contrato?')) {
         try {
            const { error } = await supabase.from('real_contratos').delete().eq('id', id);
            if (error) throw error;
            fetchRealEstateData();
         } catch (error) {
            alert('Erro ao remover contrato');
         }
      }
   };

   const handleDeleteObra = async (id: string) => {
      if (confirm('Remover obra?')) {
         try {
            const { error } = await supabase.from('real_obras').delete().eq('id', id);
            if (error) throw error;
            fetchRealEstateData();
         } catch (error) {
            alert('Erro ao remover obra');
         }
      }
   };

   const COLORS_PIE = ['#ca8a04', '#22c55e', '#3b82f6', '#ef4444'];

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <RefreshCw className="w-12 h-12 text-yellow-600 animate-spin" />
            <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-24">
         {/* Header */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-zinc-900 rounded-2xl shadow-xl border border-white/10">
                  <Building2 className="text-yellow-500" size={28} />
               </div>
               <div>
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase">Amazing <span className="text-yellow-500">Imobiliário</span></h1>
                  <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1">
                     <Key size={14} className="text-green-600" /> Soluções Completas: Reabilitação, Arrendamento & Gestão
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               {[
                  { id: 'dashboard', icon: <BarChart3 size={18} />, label: 'Visão Geral' },
                  { id: 'analytics', icon: <LineChartIcon size={18} />, label: 'Comparativos' },
                  { id: 'imoveis', icon: <Home size={18} />, label: 'Imóveis' },
                  { id: 'contratos', icon: <Briefcase size={18} />, label: 'Arrendamentos' },
                  { id: 'obras', icon: <Hammer size={18} />, label: 'Reabilitação' },
                  { id: 'consultoria', icon: <BrainCircuit size={18} />, label: 'Consultoria' },
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`px - 5 py - 2.5 rounded - xl text - [10px] font - black uppercase tracking - widest flex items - center gap - 2 transition - all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'} `}
                  >
                     {tab.icon} {tab.label}
                  </button>
               ))}
            </div>
         </div>

         {/* --- DASHBOARD --- */}
         {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Valor Patrimonial</p>
                     <p className="text-2xl font-black text-zinc-900">{formatAOA(stats.valorPatrimonial)}</p>
                     <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit">
                        <ArrowUpRight size={12} /> +5% Valorização
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Taxa de Ocupação</p>
                     <p className="text-4xl font-black text-zinc-900">{stats.taxaOcupacao.toFixed(1)}%</p>
                     <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${stats.taxaOcupacao}% ` }}></div>
                     </div>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                     <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Receita (Rendas/Aluguer)</p>
                     <p className="text-3xl font-black">{formatAOA(stats.receitaMensal)}</p>
                     <p className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Previsão Anual: {formatAOA(stats.receitaMensal * 12)}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Obras em Curso</p>
                     <p className="text-5xl font-black text-zinc-900">{stats.obrasEmCurso}</p>
                     <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mt-1">Reabilitação Ativa</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2"><TrendingUp className="text-yellow-500" size={20} /> Projeção de Receita</h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={chartDataReceita}>
                           <defs>
                              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.3} />
                                 <stop offset="95%" stopColor="#ca8a04" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                           <YAxis hide />
                           <Tooltip
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              formatter={(v: number) => formatAOA(v)}
                           />
                           <Area type="monotone" dataKey="receita" stroke="#ca8a04" strokeWidth={4} fillOpacity={1} fill="url(#colorReceita)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2"><Layers className="text-zinc-900" size={20} /> Portfólio por Tipo</h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                           <Pie data={chartDataTipos} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                              {chartDataTipos.map((entry, index) => (
                                 <Cell key={`cell - ${index} `} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="none" />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                           <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         )}

         {/* --- ANALYTICS & COMPARATIVOS --- */}
         {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="bg-zinc-900 p-8 rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                     <h2 className="text-2xl font-black uppercase tracking-tight">Comparativos Estratégicos</h2>
                     <p className="text-zinc-400 font-medium text-sm">Análise multidimensional de performance, custos e valorização.</p>
                  </div>
                  <div className="flex gap-2">
                     <div className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-green-500" /> +12% YoY</div>
                     <div className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-yellow-500" /> 98% Uptime</div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Gráfico 1: Receita vs Despesa (Mensal) */}
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[450px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <ArrowRightLeft className="text-yellow-500" size={20} /> Receita vs Despesas
                     </h3>
                     <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart data={comparativeData.financialTrend}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                           <Tooltip
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              formatter={(v: number) => formatAOA(v)}
                           />
                           <Legend verticalAlign="top" height={36} />
                           <Bar dataKey="Receita" barSize={20} fill="#22c55e" radius={[4, 4, 0, 0]} />
                           <Bar dataKey="Despesa" barSize={20} fill="#ef4444" radius={[4, 4, 0, 0]} />
                           <Line type="monotone" dataKey="Lucro" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Gráfico 2: Desempenho de Obras (Previsto vs Real) */}
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[450px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <HardHat className="text-orange-500" size={20} /> Eficiência de Obras
                     </h3>
                     <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={comparativeData.obrasPerformance} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                           <Tooltip
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              formatter={(v: number) => formatAOA(v)}
                           />
                           <Legend verticalAlign="top" height={36} />
                           <Bar dataKey="Previsto" fill="#e2e8f0" barSize={12} radius={[0, 4, 4, 0]} />
                           <Bar dataKey="Real" fill="#f97316" barSize={12} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Gráfico 3: Rentabilidade por Tipo (ROI) */}
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <Target className="text-purple-500" size={20} /> ROI Médio por Tipo (%)
                     </h3>
                     <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={comparativeData.roiData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} dy={10} />
                           <Tooltip
                              cursor={{ fill: 'transparent' }}
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                           />
                           <Bar dataKey="ROI" fill="#a855f7" radius={[8, 8, 0, 0]} barSize={40}>
                              {comparativeData.roiData.map((entry, index) => (
                                 <Cell key={`cell - ${index} `} fill={entry.ROI > 8 ? '#22c55e' : entry.ROI > 5 ? '#eab308' : '#ef4444'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Gráfico 4: Valor Patrimonial por Região */}
                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <MapPin className="text-red-500" size={20} /> Ativos por Região
                     </h3>
                     <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                           <Pie
                              data={comparativeData.regionalData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              paddingAngle={2}
                           >
                              {comparativeData.regionalData.map((entry, index) => (
                                 <Cell key={`cell - ${index} `} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="none" />
                              ))}
                           </Pie>
                           <Tooltip
                              contentStyle={{ borderRadius: '16px', border: 'none' }}
                              formatter={(v: number) => formatAOA(v)}
                           />
                           <Legend layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         )}

         {/* --- CONSULTOR IA --- */}
         {activeTab === 'consultoria' && (
            <div className="space-y-8 animate-in fade-in duration-700">
               <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-black p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden border border-indigo-500/30">
                  <div className="absolute top-0 right-0 p-12 opacity-10 animate-pulse"><BrainCircuit size={240} /></div>
                  <div className="relative z-10 max-w-4xl space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/50 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                           <Sparkles size={14} /> Amazing AI Advisor
                        </div>
                     </div>
                     <h2 className="text-5xl font-black tracking-tighter leading-none">Consultoria <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-white">Estratégica Imobiliária.</span></h2>
                     <p className="text-zinc-400 text-xl font-medium leading-relaxed max-w-2xl">
                        Análise focada em valorização patrimonial, reabilitação e satisfação do cliente.
                     </p>
                     <button
                        onClick={handleConsultoriaAI}
                        disabled={isAnalyzing}
                        className="px-12 py-6 bg-indigo-600 hover:bg-indigo-500 rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl transition-all disabled:opacity-50 flex items-center gap-4"
                     >
                        {isAnalyzing ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}
                        {isAnalyzing ? 'Analisando Mercado...' : 'Gerar Relatório Estratégico'}
                     </button>
                  </div>
               </div>

               {aiAnalysis && (
                  <div className="bg-white p-16 rounded-[4rem] border-2 border-indigo-100 shadow-3xl animate-in zoom-in-95">
                     <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-3"><CheckCircle2 /> Relatório Gerado</h4>
                     <div className="text-zinc-700 text-lg font-medium leading-relaxed italic whitespace-pre-wrap">{aiAnalysis}</div>
                  </div>
               )}
            </div>
         )}

         {/* --- IMÓVEIS (GESTÃO) --- */}
         {activeTab === 'imoveis' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100">
                     <Input
                        placeholder="Pesquisar por título, localização ou tipo..."
                        icon={<Search size={20} className="text-zinc-400" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none py-4 text-lg font-semibold"
                     />
                  </div>
                  <button
                     onClick={() => { setEditingImovel(null); setShowImovelModal(true); }}
                     className="px-8 py-4 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 transition-all flex items-center gap-3 font-black shadow-xl active:scale-95 text-xs uppercase tracking-widest"
                  >
                     <Plus size={18} /> Novo Imóvel
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {imoveis.filter(i =>
                     i.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     i.localizacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     i.tipo.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(imovel => (
                     <div key={imovel.id} className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <div className="h-64 relative">
                           <img src={imovel.foto_principal} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={imovel.titulo} />
                           <div className="absolute top-4 left-4">
                              <span className={`px - 3 py - 1.5 rounded - lg text - [9px] font - black uppercase tracking - widest shadow - lg ${imovel.status === 'Disponível' ? 'bg-green-500 text-white' :
                                 imovel.status === 'Ocupado' ? 'bg-zinc-900 text-white' : 'bg-yellow-500 text-zinc-900'
                                 } `}>
                                 {imovel.status}
                              </span>
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900/80 to-transparent p-6 pt-20">
                              <h3 className="text-xl font-black text-white">{imovel.titulo}</h3>
                              <p className="text-zinc-300 text-xs font-bold flex items-center gap-1"><MapPin size={12} /> {imovel.localizacao}</p>
                           </div>
                        </div>
                        <div className="p-8 space-y-4">
                           <div className="grid grid-cols-2 gap-4 text-center">
                              <div className="bg-zinc-50 p-3 rounded-2xl">
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Venda</p>
                                 <p className="font-black text-zinc-900">{formatAOA(imovel.preco_venda || 0)}</p>
                              </div>
                              <div className="bg-zinc-50 p-3 rounded-2xl">
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Renda</p>
                                 <p className="font-black text-zinc-900">{formatAOA(imovel.preco_renda || 0)}</p>
                              </div>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold text-zinc-500 pt-2 border-t border-zinc-50">
                              <span className="flex items-center gap-1"><Ruler size={14} /> {imovel.area_m2}m²</span>
                              <span className="flex items-center gap-1"><Home size={14} /> {imovel.quartos} Qtos</span>
                              <span className="text-green-600">ROI: {imovel.rentabilidade_estimada}%</span>
                           </div>
                           <button onClick={() => { setEditingImovel(imovel); setShowImovelModal(true); }} className="w-full py-3 bg-zinc-900 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all">
                              Gerir Propriedade
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* --- CONTRATOS (ARRENDAMENTO E ALUGUER DIÁRIO) --- */}
         {activeTab === 'contratos' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                     <h2 className="text-2xl font-black text-zinc-900">Arrendamentos & Aluguer Diário</h2>
                     <p className="text-zinc-500 text-sm mt-1">Gestão de contratos residenciais e estadias curtas.</p>
                  </div>
                  <button
                     onClick={() => { setEditingContrato(null); setShowContratoModal(true); }}
                     className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center gap-2"
                  >
                     <Plus size={16} /> Novo Contrato
                  </button>
               </div>

               <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100">
                  <Input
                     placeholder="Pesquisar por inquilino ou tipo de contrato..."
                     icon={<Search size={20} className="text-zinc-400" />}
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="bg-transparent border-none py-4 text-lg font-semibold"
                  />
               </div>

               <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           <th className="px-8 py-6">Imóvel / Inquilino</th>
                           <th className="px-8 py-6">Modalidade</th>
                           <th className="px-8 py-6 text-right">Valor</th>
                           <th className="px-8 py-6 text-center">Status</th>
                           <th className="px-8 py-6 text-right">Acções</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        {contratos.filter(c =>
                           c.inquilino_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.tipo.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(c => {
                           const imovel = imoveis.find(i => i.id === c.imovel_id);
                           return (
                              <tr key={c.id} className="hover:bg-zinc-50/50 transition-all">
                                 <td className="px-8 py-5">
                                    <p className="font-black text-zinc-900">{imovel?.titulo || 'Imóvel N/A'}</p>
                                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-bold mt-1">
                                       <UserCheck size={12} /> {c.inquilino_nome}
                                    </div>
                                 </td>
                                 <td className="px-8 py-5">
                                    <span className={`px - 2 py - 1 rounded - lg text - [9px] font - black uppercase tracking - widest ${c.tipo === 'Aluguer Diário' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'} `}>
                                       {c.tipo}
                                    </span>
                                    <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase">{new Date(c.data_inicio).toLocaleDateString()} - {new Date(c.data_fim).toLocaleDateString()}</p>
                                 </td>
                                 <td className="px-8 py-5 text-right font-black text-zinc-900">
                                    {formatAOA(c.valor_mensal)} <span className="text-[9px] text-zinc-400 font-bold">{c.tipo === 'Arrendamento' ? '/mês' : '/dia'}</span>
                                 </td>
                                 <td className="px-8 py-5 text-center">
                                    <span className={`px - 3 py - 1 rounded - full text - [9px] font - black uppercase tracking - widest ${c.status === 'Activo' ? 'bg-green-100 text-green-700' :
                                       c.status === 'Inadimplente' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-500'
                                       } `}>{c.status}</span>
                                 </td>
                                 <td className="px-8 py-5 text-right">
                                    <button onClick={() => { setEditingContrato(c); setShowContratoModal(true); }} className="text-zinc-400 hover:text-yellow-600 font-bold text-xs uppercase underline">Editar</button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* --- OBRAS E REABILITAÇÃO --- */}
         {activeTab === 'obras' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] border border-orange-100 shadow-sm gap-4">
                  <div>
                     <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                        <Hammer className="text-orange-500" /> Gestão de Reabilitação
                     </h2>
                     <p className="text-zinc-500 text-sm mt-1">Projectos de remodelação e valorização de ativos.</p>
                  </div>
                  <button
                     onClick={() => { setEditingObra(null); setShowObraModal(true); }}
                     className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-xl"
                  >
                     <PaintBucket size={16} /> Novo Projecto
                  </button>
               </div>

               <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100">
                  <Input
                     placeholder="Pesquisar por descrição da obra ou estado..."
                     icon={<Search size={20} className="text-zinc-400" />}
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="bg-transparent border-none py-4 text-lg font-semibold"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {obras.length > 0 ? obras.filter(o =>
                     o.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     o.status.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(obra => {
                     const imovel = imoveis.find(i => i.id === obra.imovel_id);
                     return (
                        <div key={obra.id} className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                           <div>
                              <div className="flex justify-between items-start mb-4">
                                 <div className="flex items-center gap-3">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                       <HardHat size={20} />
                                    </div>
                                    <div>
                                       <h4 className="font-black text-zinc-900 text-lg">{imovel?.titulo || 'Imóvel'}</h4>
                                       <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{obra.descricao}</p>
                                    </div>
                                 </div>
                                 <span className={`px - 3 py - 1 rounded - lg text - [9px] font - black uppercase tracking - widest ${obra.status === 'Em Execução' ? 'bg-blue-100 text-blue-700' :
                                    obra.status === 'Concluída' ? 'bg-green-100 text-green-700' :
                                       'bg-yellow-100 text-yellow-700'
                                    } `}>{obra.status}</span>
                              </div>

                              <div className="space-y-4 my-6">
                                 <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase text-zinc-400 mb-1">
                                       <span>Progresso</span>
                                       <span>{obra.progresso}%</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                       <div className={`h - full ${obra.progresso === 100 ? 'bg-green-500' : 'bg-orange-500'} `} style={{ width: `${obra.progresso}% ` }}></div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-50 p-3 rounded-xl">
                                       <p className="text-[9px] font-bold text-zinc-400 uppercase">Orçamento</p>
                                       <p className="text-sm font-black text-zinc-900">{formatAOA(obra.orcamento_previsto)}</p>
                                    </div>
                                    <div className="bg-zinc-50 p-3 rounded-xl">
                                       <p className="text-[9px] font-bold text-zinc-400 uppercase">Executado</p>
                                       <p className={`text - sm font - black ${obra.custo_atual > obra.orcamento_previsto ? 'text-red-500' : 'text-green-600'} `}>{formatAOA(obra.custo_atual)}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                              <div className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                                 <Calendar size={12} /> Fim Previsto: {new Date(obra.previsao_fim).toLocaleDateString()}
                              </div>
                              <button onClick={() => { setEditingObra(obra); setShowObraModal(true); }} className="text-zinc-900 font-bold text-xs hover:text-orange-600 underline">Gerir Obra</button>
                           </div>
                        </div>
                     );
                  }) : (
                     <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-zinc-200">
                        <Wrench size={48} className="mx-auto text-zinc-200 mb-4" />
                        <p className="text-zinc-400 font-bold italic">Nenhuma obra de reabilitação registada.</p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* MODAL IMÓVEL */}
         {showImovelModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                        <Home className="text-yellow-500" /> {editingImovel ? 'Editar Imóvel' : 'Cadastrar Propriedade'}
                     </h2>
                     <button onClick={() => setShowImovelModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><XCircle size={24} /></button>
                  </div>
                  <form onSubmit={handleSaveImovel} className="p-10 space-y-6 max-h-[80vh] overflow-y-auto">
                     <Input name="titulo" label="Título do Anúncio" defaultValue={editingImovel?.titulo} required />
                     <div className="grid grid-cols-2 gap-6">
                        <Select name="tipo" label="Tipo" defaultValue={editingImovel?.tipo} options={[
                           { value: 'Residencial', label: 'Residencial' }, { value: 'Comercial', label: 'Comercial' },
                           { value: 'Industrial', label: 'Industrial' }, { value: 'Terreno', label: 'Terreno' }
                        ]} />
                        <Select name="status" label="Estado" defaultValue={editingImovel?.status} options={[
                           { value: 'Disponível', label: 'Disponível' }, { value: 'Ocupado', label: 'Ocupado' },
                           { value: 'Manutenção', label: 'Manutenção' }, { value: 'Vendido', label: 'Vendido' }
                        ]} />
                     </div>
                     <Input name="localizacao" label="Localização / Endereço" defaultValue={editingImovel?.localizacao} required />
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="area" label="Area (m²)" type="number" defaultValue={editingImovel?.area_m2} required />
                        <Input name="quartos" label="Quartos" type="number" defaultValue={editingImovel?.quartos} />
                     </div>
                     <div className="grid grid-cols-2 gap-6 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        <Input name="preco_venda" label="Valor de Venda (AOA)" type="number" defaultValue={editingImovel?.preco_venda} />
                        <Input name="preco_renda" label="Valor de Renda (AOA)" type="number" defaultValue={editingImovel?.preco_renda} />
                     </div>
                     <Input name="proprietario" label="Proprietário" defaultValue={editingImovel?.proprietario} required />
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="rentabilidade" label="Rentabilidade Est. (%)" type="number" step="0.1" defaultValue={editingImovel?.rentabilidade_estimada} />
                        <Input name="custo_manutencao" label="Custo Manutenção Mensal" type="number" defaultValue={editingImovel?.custo_manutencao_mensal} />
                     </div>
                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-yellow-500 hover:text-zinc-900 transition-all">
                        <CheckCircle2 size={18} /> Salvar Imóvel
                     </button>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL CONTRATO */}
         {showContratoModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                        <Briefcase className="text-yellow-500" /> {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
                     </h2>
                     <button onClick={() => setShowContratoModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><XCircle size={24} /></button>
                  </div>
                  <form onSubmit={handleSaveContrato} className="p-10 space-y-6">
                     <Select name="imovel_id" label="Imóvel" defaultValue={editingContrato?.imovel_id}
                        options={imoveis.filter(i => i.status === 'Disponível' || i.id === editingContrato?.imovel_id).map(i => ({ value: i.id, label: i.titulo }))} required />
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="inquilino" label="Nome do Inquilino" defaultValue={editingContrato?.inquilino_nome} required />
                        <Input name="nif" label="NIF / BI" defaultValue={editingContrato?.inquilino_nif} required />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="inicio" label="Data Início" type="date" defaultValue={editingContrato?.data_inicio} required />
                        <Input name="fim" label="Data Fim" type="date" defaultValue={editingContrato?.data_fim} required />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <Select name="tipo" label="Modalidade" defaultValue={editingContrato?.tipo} options={[{ value: 'Arrendamento', label: 'Residencial (Longo Prazo)' }, { value: 'Aluguer Diário', label: 'Aluguer Diário (Curta Duração)' }]} />
                        <Input name="valor" label="Valor (AOA)" type="number" defaultValue={editingContrato?.valor_mensal} required />
                     </div>
                     <Select name="status" label="Estado" defaultValue={editingContrato?.status || 'Activo'} options={[{ value: 'Activo', label: 'Activo' }, { value: 'Terminado', label: 'Terminado' }, { value: 'Inadimplente', label: 'Inadimplente' }]} />
                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-green-600 transition-all">
                        <CheckCircle2 size={18} /> Validar Contrato
                     </button>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL OBRA (REABILITAÇÃO) */}
         {showObraModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                        <Hammer className="text-orange-500" /> {editingObra ? 'Gerir Obra' : 'Nova Reabilitação'}
                     </h2>
                     <button onClick={() => setShowObraModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><XCircle size={24} /></button>
                  </div>
                  <form onSubmit={handleSaveObra} className="p-10 space-y-6">
                     <Select name="imovel_id" label="Imóvel para Reabilitar" defaultValue={editingObra?.imovel_id}
                        options={imoveis.map(i => ({ value: i.id, label: i.titulo }))} required />
                     <Input name="descricao" label="Descrição da Intervenção" defaultValue={editingObra?.descricao} required placeholder="Ex: Remodelação total da cozinha e pintura" />

                     <div className="grid grid-cols-2 gap-6">
                        <Input name="orcamento" label="Orçamento Previsto (AOA)" type="number" defaultValue={editingObra?.orcamento_previsto} required />
                        <Input name="custo_atual" label="Custo Executado (AOA)" type="number" defaultValue={editingObra?.custo_atual || 0} />
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <Input name="inicio" label="Data Início" type="date" defaultValue={editingObra?.data_inicio} required />
                        <Input name="fim" label="Previsão de Conclusão" type="date" defaultValue={editingObra?.previsao_fim} required />
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <Select name="status" label="Fase da Obra" defaultValue={editingObra?.status || 'Planejamento'} options={[
                           { value: 'Planejamento', label: 'Planejamento' },
                           { value: 'Em Execução', label: 'Em Execução' },
                           { value: 'Pausada', label: 'Pausada' },
                           { value: 'Concluída', label: 'Concluída' }
                        ]} />
                        <div className="space-y-1">
                           <label className="text-sm font-medium text-zinc-700">Progresso (%)</label>
                           {/* Fixed: Cast EventTarget to HTMLInputElement before accessing nextElementSibling */}
                           <input name="progresso" type="range" min="0" max="100" defaultValue={editingObra?.progresso || 0} className="w-full accent-orange-500 cursor-pointer" onInput={(e) => ((e.target as HTMLInputElement).nextElementSibling as HTMLElement).innerText = (e.target as HTMLInputElement).value + '%'} />
                           <span className="text-xs font-bold text-orange-600 block text-right">{editingObra?.progresso || 0}%</span>
                        </div>
                     </div>

                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all">
                        <CheckCircle2 size={18} /> Salvar Projecto
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default RealEstatePage;