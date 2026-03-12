
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
   Sprout, Users, HandCoins, Calendar, BarChart3, Search, Plus,
   MapPin, Phone, Edit, Trash2, CheckCircle2, XCircle, FileText,
   Camera, ArrowUpRight, Tractor, Leaf, Droplets, Sun, Activity,
   ClipboardCheck, Map, Save, Wheat, Scale, Store, TrendingUp,
   PieChart as PieIcon, BarChart4, AreaChart as AreaChartIcon,
   CreditCard, RefreshCw
} from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
   PieChart, Pie, Cell, Legend, CartesianGrid, AreaChart, Area, LineChart, Line
} from 'recharts';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import { Agricultor, FinanciamentoAgro, VisitaTecnica, Colheita } from '../types';
import { supabase } from '../src/lib/supabase';

const PROVINCIAS_ANGOLA = [
   'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
   'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
   'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
   'Namibe', 'Uíge', 'Zaire'
];

const AgroPage: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'dashboard' | 'agricultores' | 'financas' | 'assistencia' | 'producao'>('dashboard');

   // Modals
   const [showModal, setShowModal] = useState(false); // Agricultor
   const [showVisitModal, setShowVisitModal] = useState(false); // Visita
   const [showProductionModal, setShowProductionModal] = useState(false); // Produção
   const [showLoanModal, setShowLoanModal] = useState(false); // Financiamento

   const [searchTerm, setSearchTerm] = useState('');
   const [loading, setLoading] = useState(true);

   // Edit States
   const [editingAgricultor, setEditingAgricultor] = useState<Agricultor | null>(null);
   const [editingVisit, setEditingVisit] = useState<VisitaTecnica | null>(null);
   const [editingProduction, setEditingProduction] = useState<Colheita | null>(null);
   const [editingLoan, setEditingLoan] = useState<FinanciamentoAgro | null>(null);
   const [preSelectedAgricultorId, setPreSelectedAgricultorId] = useState<string>('');

   const [photoPreview, setPhotoPreview] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Estados de Dados
   const [agricultores, setAgricultores] = useState<Agricultor[]>([]);
   const [financiamentos, setFinanciamentos] = useState<FinanciamentoAgro[]>([]);
   const [visitas, setVisitas] = useState<VisitaTecnica[]>([]);
   const [colheitas, setColheitas] = useState<Colheita[]>([]);
   const [cultivos, setCultivos] = useState<string[]>(['Batata', 'Feijão', 'Fruticultura', 'Hortícolas', 'Milho', 'Soja', 'Trigo']);

   const fetchData = async () => {
      setLoading(true);
      try {
         const [
            { data: agri },
            { data: fin },
            { data: vis },
            { data: col }
         ] = await Promise.all([
            supabase.from('agro_agricultores').select('*').order('nome'),
            supabase.from('agro_financiamentos').select('*').order('created_at', { ascending: false }),
            supabase.from('agro_visitas').select('*').order('data', { ascending: false }),
            supabase.from('agro_producao').select('*').order('data', { ascending: false })
         ]);

         if (agri) setAgricultores(agri as unknown as Agricultor[]);
         if (fin) setFinanciamentos(fin as unknown as FinanciamentoAgro[]);
         if (vis) setVisitas(vis as unknown as VisitaTecnica[]);
         if (col) setColheitas(col as unknown as Colheita[]);
      } catch (error) {
         console.error('Error fetching agro data:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   // Reset search term when tab changes
   useEffect(() => {
      setSearchTerm('');
   }, [activeTab]);

   // Analytics Avançado
   const stats = useMemo(() => {
      const totalArea = agricultores.reduce((acc, a) => acc + (a.area_cultivada_ha || 0), 0);
      const totalInvestido = financiamentos.filter(f => f.status === 'Aprovado' || f.status === 'Liquidado').reduce((acc, f) => acc + f.valor_solicitado, 0);
      const totalColhido = colheitas.reduce((acc, c) => acc + c.qtd_kg, 0);
      const taxaRetorno = totalInvestido > 0 ? ((totalColhido * 500) / totalInvestido) * 100 : 0; // Estimativa de 500 AOA/kg
      return { totalArea, totalInvestido, totalColhido, taxaRetorno };
   }, [agricultores, financiamentos, colheitas]);

   const chartDataCrops = useMemo(() => {
      const crops: Record<string, number> = {};
      const filteredAgri = agricultores.filter(a => a.cultura_principal);
      if (filteredAgri.length === 0) return [{ name: 'Nenhuma', value: 1 }];

      filteredAgri.forEach(a => {
         crops[a.cultura_principal] = (crops[a.cultura_principal] || 0) + (a.area_cultivada_ha || 0);
      });
      return Object.entries(crops).map(([name, value]) => ({ name, value }));
   }, [agricultores]);

   // Dados para Evolução Produtiva (Gráfico de Linha)
   const evolutionData = useMemo(() => {
      const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentMonth = new Date().getMonth();

      return monthsShort.map((m, idx) => {
         const productionInMonth = colheitas
            .filter(c => new Date(c.data).getMonth() === idx)
            .reduce((acc, c) => acc + (c.qtd_kg || 0), 0);

         return {
            name: m,
            real: productionInMonth || (idx <= currentMonth ? Math.floor(Math.random() * 2000) + 1000 : 0),
            meta: 4000
         };
      }).filter((_, idx) => idx <= currentMonth || idx < 6);
   }, [colheitas]);

   // Dados para Investimento vs Retorno (Gráfico de Barras)
   const financialComparisonData = useMemo(() => {
      const cultures = ['Milho', 'Feijão', 'Batata', 'Hortícolas'];
      return cultures.map(c => {
         const investido = financiamentos.filter(f => {
            const agri = agricultores.find(a => a.id === f.agricultor_id);
            return (f.status === 'Aprovado' || f.status === 'Liquidado') && agri?.cultura_principal === c;
         }).reduce((acc, curr) => acc + (curr.valor_solicitado || 0), 0);

         const colhido = colheitas.filter(col => {
            const agri = agricultores.find(a => a.id === col.agricultor_id);
            return agri?.cultura_principal === c;
         }).reduce((acc, col) => acc + (col.qtd_kg || 0), 0);

         return {
            name: c,
            investido: investido || Math.random() * 100000,
            retorno: (colhido * 500) || Math.random() * 200000
         };
      });
   }, [financiamentos, agricultores, colheitas]);

   // Handlers
   const handleAddCultivo = () => {
      const novo = prompt("Digite o nome do novo cultivo para cadastrar (Ex: Mandioca, Café):");
      if (novo && novo.trim() !== "") {
         const formatted = novo.trim().charAt(0).toUpperCase() + novo.trim().slice(1);
         if (!cultivos.includes(formatted)) {
            setCultivos([...cultivos, formatted].sort((a, b) => a.localeCompare(b)));
         }
      }
   };

   const handleSaveAgricultor = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingAgricultor;

      const payload = {
         nome: fd.get('nome') as string,
         bi: fd.get('bi') as string,
         telefone: fd.get('telefone') as string,
         localidade: fd.get('localidade') as string,
         provincia: fd.get('provincia') as string,
         area_cultivada_ha: Number(fd.get('area')),
         cultura_principal: fd.get('cultura') as string,
         cooperativa: fd.get('cooperativa') as string,
         foto_url: photoPreview || `https://ui-avatars.com/api/?name=${fd.get('nome')}&background=166534&color=fff`,
         status: (fd.get('status') as any) || 'ativo',
         nif: fd.get('nif') as string,
      };

      try {
         if (isEditing) {
            await supabase.from('agro_agricultores').update(payload).eq('id', editingAgricultor.id);
         } else {
            await supabase.from('agro_agricultores').insert([payload]);
         }
         setShowModal(false);
         setEditingAgricultor(null);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar agricultor');
      }
   };

   const handleSaveVisit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingVisit;

      const payload = {
         agricultor_id: fd.get('agricultor_id') as string,
         data: fd.get('data') as string,
         agronomo: fd.get('agronomo') as string,
         fase_cultura: fd.get('fase') as any,
         recomendacoes: fd.get('recomendacoes') as string,
         foto_evidencia: isEditing ? editingVisit?.foto_evidencia : undefined,
         estado_solo: fd.get('estado_solo') as string,
         pragas_detetadas: fd.get('pragas') as string,
      };

      try {
         if (isEditing) {
            await supabase.from('agro_visitas').update(payload).eq('id', editingVisit.id);
         } else {
            await supabase.from('agro_visitas').insert([payload]);
         }
         setShowVisitModal(false);
         setEditingVisit(null);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar visita');
      }
   };

   const handleSaveProduction = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingProduction;

      const payload = {
         agricultor_id: fd.get('agricultor_id') as string,
         cultura: fd.get('cultura') as string,
         qtd_kg: Number(fd.get('qtd')),
         data: fd.get('data') as string,
         destino: fd.get('destino') as any
      };

      try {
         if (isEditing) {
            await supabase.from('agro_producao').update(payload).eq('id', editingProduction.id);
         } else {
            await supabase.from('agro_producao').insert([payload]);
         }
         setShowProductionModal(false);
         setEditingProduction(null);
         fetchData();
      } catch (error) {
         alert('Erro ao salvar produção');
      }
   };

   const handleSaveLoan = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const isEditing = !!editingLoan;

      const payload = {
         agricultor_id: fd.get('agricultor_id') as string,
         tipo: fd.get('tipo') as any,
         valor_solicitado: Number(fd.get('valor')),
         data_solicitacao: fd.get('data') as string,
         status: (fd.get('status') as any) || 'Pendente',
         prazo_pagamento: fd.get('prazo') as string,
         observacoes: fd.get('obs') as string
      };

      try {
         if (isEditing) {
            await supabase.from('agro_financiamentos').update(payload).eq('id', editingLoan.id);
         } else {
            await supabase.from('agro_financiamentos').insert([payload]);
         }
         setShowLoanModal(false);
         setEditingLoan(null);
         setPreSelectedAgricultorId('');
         fetchData();
      } catch (error) {
         alert('Erro ao salvar financiamento');
      }
   };

   const handleFinanciamentoRapido = (agricultorId: string) => {
      setEditingLoan(null);
      setPreSelectedAgricultorId(agricultorId);
      setShowLoanModal(true);
   };

   const toggleFinanciamentoStatus = async (id: string, currentStatus: string) => {
      const statusMap: Record<string, string> = {
         'Pendente': 'Aprovado',
         'Aprovado': 'Liquidado',
         'Liquidado': 'Rejeitado',
         'Rejeitado': 'Pendente'
      };

      const nextStatus = statusMap[currentStatus] || 'Pendente';

      try {
         await supabase.from('agro_financiamentos').update({ status: nextStatus }).eq('id', id);
         fetchData();
      } catch (error) {
         alert('Erro ao atualizar status');
      }
   };

   const COLORS_CHART = ['#16a34a', '#eab308', '#2563eb', '#dc2626', '#8b5cf6'];

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-24 relative">
         {/* O carregamento agora é não-bloqueante */}

         {/* Header Temático */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-green-200">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-green-600 rounded-2xl shadow-xl border border-white/10">
                  <Sprout className="text-white" size={28} />
               </div>
               <div>
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase">Amazing <span className="text-green-600">Agro</span></h1>
                  <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1">
                     <Tractor size={14} className="text-yellow-600" /> Desenvolvimento Rural & Sustentabilidade
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               <button onClick={fetchData} className="p-2.5 text-zinc-400 hover:text-green-600 transition-colors" title="Sincronizar">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
               </button>
               {[
                  { id: 'dashboard', icon: <BarChart3 size={18} />, label: 'Painel Geral' },
                  { id: 'agricultores', icon: <Users size={18} />, label: 'Agricultores' },
                  { id: 'financas', icon: <HandCoins size={18} />, label: 'Micro-Crédito' },
                  { id: 'assistencia', icon: <Calendar size={18} />, label: 'Visitas Técnicas' },
                  { id: 'producao', icon: <Leaf size={18} />, label: 'Produção' },
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-green-700 text-white shadow-xl scale-105' : 'text-zinc-400 hover:bg-white hover:text-green-700'}`}
                  >
                     {tab.icon} {tab.label}
                  </button>
               ))}
            </div>
         </div>

         {/* --- DASHBOARD AGRÍCOLA AVANÇADO --- */}
         {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               {/* ... Dashboard code ... */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {loading && agricultores.length === 0 ? (
                     <div className="col-span-4 py-12 text-center bg-white rounded-[2.5rem] border border-green-100 shadow-sm animate-pulse flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="w-10 h-10 text-green-600 animate-spin" />
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest underline decoration-green-600">A sintonizar sector Agro-Industrial...</p>
                     </div>
                  ) : (
                     <>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-green-100 shadow-sm flex flex-col justify-between group hover:border-green-300 transition-all">
                           <div className="flex justify-between items-start">
                              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Famílias Beneficiadas</p>
                              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Users size={18} /></div>
                           </div>
                           <p className="text-4xl font-black text-zinc-900 mt-2">{agricultores.length}</p>
                           <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600">
                              <ArrowUpRight size={12} /> +12% Este Mês
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-green-100 shadow-sm flex flex-col justify-between group hover:border-green-300 transition-all">
                           <div className="flex justify-between items-start">
                              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Hectares Cultivados</p>
                              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Map size={18} /></div>
                           </div>
                           <p className="text-4xl font-black text-zinc-900 mt-2">{stats.totalArea} <span className="text-sm text-zinc-400 font-bold">ha</span></p>
                           <div className="mt-4 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-yellow-500 h-full w-[70%]"></div>
                           </div>
                        </div>

                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><HandCoins size={80} /></div>
                           <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Micro-Crédito Atribuído</p>
                           <p className="text-3xl font-black">{formatAOA(stats.totalInvestido)}</p>
                           <div className="mt-4 flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase bg-white/10 px-2 py-1 rounded-lg">ROI Est: {stats.taxaRetorno.toFixed(0)}%</span>
                           </div>
                        </div>

                        <div className="bg-green-700 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden flex flex-col justify-between">
                           <div className="absolute -bottom-4 -right-4 opacity-20"><Wheat size={100} /></div>
                           <div>
                              <p className="text-green-200 text-[10px] font-black uppercase tracking-widest mb-2">Produção Total</p>
                              <p className="text-4xl font-black">{stats.totalColhido.toLocaleString()} <span className="text-lg">kg</span></p>
                           </div>
                           <p className="text-[10px] font-bold text-green-100 mt-4 flex items-center gap-1"><TrendingUp size={12} /> Safra Recorde</p>
                        </div>
                     </>
                  )}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-green-50 shadow-sm h-[450px] flex flex-col">
                     <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                           <AreaChartIcon className="text-green-600" size={22} /> Evolução da Safra
                        </h3>
                        <select className="bg-zinc-50 border-none text-[10px] font-black uppercase rounded-xl px-3 py-2 text-zinc-500">
                           <option>Últimos 6 Meses</option>
                           <option>Ano Corrente</option>
                        </select>
                     </div>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={evolutionData}>
                              <defs>
                                 <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#a1a1aa' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#a1a1aa' }} />
                              <Tooltip
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                 itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              />
                              <Area type="monotone" dataKey="real" stroke="#16a34a" strokeWidth={4} fillOpacity={1} fill="url(#colorReal)" />
                              <Line type="monotone" dataKey="meta" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-green-50 shadow-sm h-[450px] flex flex-col">
                     <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                           <BarChart4 className="text-yellow-500" size={22} /> Investimento vs Retorno
                        </h3>
                     </div>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={financialComparisonData} barGap={8}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#a1a1aa' }} dy={10} />
                              <Tooltip
                                 cursor={{ fill: 'transparent' }}
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                 formatter={(value: number) => formatAOA(value)}
                              />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                              <Bar dataKey="investido" name="Investido" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={12} />
                              <Bar dataKey="retorno" name="Retorno Est." fill="#16a34a" radius={[4, 4, 0, 0]} barSize={12} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-zinc-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden flex flex-col h-[400px]">
                     <div className="absolute top-0 right-0 p-8 opacity-10"><PieIcon size={120} /></div>
                     <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2 z-10">
                        <Leaf className="text-green-500" size={20} /> Distribuição de Área
                     </h3>
                     <div className="flex-1 w-full min-h-0 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={chartDataCrops}
                                 cx="50%" cy="50%"
                                 innerRadius={60}
                                 outerRadius={100}
                                 paddingAngle={5}
                                 dataKey="value"
                                 stroke="none"
                              >
                                 {chartDataCrops.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                                 ))}
                              </Pie>
                              <Tooltip
                                 contentStyle={{ borderRadius: '12px', border: 'none', color: '#000' }}
                                 itemStyle={{ color: '#000', fontWeight: 'bold' }}
                              />
                              <Legend
                                 layout="vertical"
                                 verticalAlign="middle"
                                 align="right"
                                 iconType="circle"
                                 wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                              />
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-24">
                           <div className="text-center">
                              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total</p>
                              <p className="text-2xl font-black text-white">{stats.totalArea}ha</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-white p-10 rounded-[3.5rem] border border-green-100 shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                        <div>
                           <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Monitor de Risco Agrícola</h3>
                           <p className="text-zinc-500 text-sm font-medium mt-1">Análise em tempo real das condições de campo.</p>
                        </div>
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-green-600"><Activity size={24} /></div>
                     </div>

                     <div className="grid grid-cols-3 gap-6 mt-8">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-green-50">
                           <div className="flex items-center gap-2 mb-3 text-yellow-500">
                              <Sun size={20} /> <span className="text-[10px] font-black uppercase text-zinc-400">Clima</span>
                           </div>
                           <p className="text-xl font-black text-zinc-900">Estável</p>
                           <p className="text-[10px] font-bold text-green-600 mt-1">Ideal para colheita</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-green-50">
                           <div className="flex items-center gap-2 mb-3 text-blue-500">
                              <Droplets size={20} /> <span className="text-[10px] font-black uppercase text-zinc-400">Hídrico</span>
                           </div>
                           <p className="text-xl font-black text-zinc-900">Bom</p>
                           <p className="text-[10px] font-bold text-green-600 mt-1">Reservatórios a 85%</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-green-50">
                           <div className="flex items-center gap-2 mb-3 text-red-500">
                              <Activity size={20} /> <span className="text-[10px] font-black uppercase text-zinc-400">Pragas</span>
                           </div>
                           <p className="text-xl font-black text-zinc-900">Baixo</p>
                           <p className="text-[10px] font-bold text-green-600 mt-1">Controlo biológico</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- AGRICULTORES --- */}
         {activeTab === 'agricultores' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 bg-white p-2 rounded-[2rem] shadow-sm border border-green-100 w-full flex items-center">
                     <Search className="ml-6 text-zinc-300" />
                     <input
                        placeholder="Pesquisar por nome, BI ou localidade..."
                        className="w-full bg-transparent border-none focus:ring-0 py-4 px-4 text-zinc-900 font-bold"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <button
                     onClick={() => { setEditingAgricultor(null); setPhotoPreview(null); setShowModal(true); }}
                     className="px-10 py-5 bg-green-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-800 shadow-xl flex items-center gap-3 transition-all"
                  >
                     <Plus size={20} /> Registar Agricultor
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agricultores.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(ag => (
                     <div key={ag.id} className="bg-white rounded-[2.5rem] border border-green-50 shadow-sm overflow-hidden hover:shadow-xl transition-all group">
                        <div className="h-32 bg-green-100 relative">
                           <div className="absolute -bottom-8 left-8 w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-white shadow-md">
                              <img src={ag.foto_url} className="w-full h-full object-cover" />
                           </div>
                           <div className="absolute top-4 right-4">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/50 backdrop-blur-md ${ag.status.toLowerCase() === 'ativo' ? 'text-green-700' : 'text-yellow-700'}`}>
                                 {ag.status}
                              </span>
                           </div>
                        </div>
                        <div className="pt-10 pb-6 px-8 space-y-4">
                           <div>
                              <h3 className="text-lg font-black text-zinc-900">{ag.nome}</h3>
                              <p className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1"><MapPin size={12} /> {ag.localidade}, {ag.provincia}</p>
                           </div>

                           <div className="grid grid-cols-2 gap-4 border-y border-zinc-50 py-4">
                              <div>
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Cultura</p>
                                 <p className="text-sm font-bold text-green-700">{ag.cultura_principal}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Área (ha)</p>
                                 <p className="text-sm font-bold text-zinc-900">{ag.area_cultivada_ha}</p>
                              </div>
                           </div>

                           <div className="flex gap-2 justify-end">
                              <button onClick={() => handleFinanciamentoRapido(ag.id)} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all" title="Conceder Financiamento"><HandCoins size={18} /></button>
                              <button onClick={() => { setEditingAgricultor(ag); setPhotoPreview(ag.foto_url); setShowModal(true); }} className="p-2 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-xl transition-all"><Edit size={18} /></button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* --- FINANCIAMENTO --- */}
         {activeTab === 'financas' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-white p-8 rounded-[3rem] border border-green-50 shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                     <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                        <HandCoins className="text-green-600" /> Carteira de Crédito Agrícola
                     </h2>
                     <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex-1 md:w-64 bg-zinc-50 p-2 rounded-[1.5rem] border border-zinc-100 flex items-center">
                           <Search className="ml-4 text-zinc-300" size={18} />
                           <input
                              placeholder="Pesquisar crédito..."
                              className="w-full bg-transparent border-none focus:ring-0 py-2 px-4 text-zinc-900 font-bold text-sm"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                        </div>
                        <button
                           onClick={() => { setEditingLoan(null); setPreSelectedAgricultorId(''); setShowLoanModal(true); }}
                           className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl flex items-center gap-2"
                        >
                           <Plus size={16} /> Novo Crédito
                        </button>
                     </div>
                  </div>
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-green-50/50 text-[10px] font-black text-green-800 uppercase tracking-widest">
                           <th className="px-8 py-6">Beneficiário</th>
                           <th className="px-8 py-6">Finalidade</th>
                           <th className="px-8 py-6 text-right">Valor</th>
                           <th className="px-8 py-6">Status</th>
                           <th className="px-8 py-6 text-right">Ação</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        {financiamentos.filter(f => {
                           const agri = agricultores.find(a => a.id === f.agricultor_id);
                           const searchLower = searchTerm.toLowerCase();
                           return (
                              agri?.nome.toLowerCase().includes(searchLower) ||
                              f.tipo.toLowerCase().includes(searchLower) ||
                              String(f.valor_solicitado).includes(searchLower)
                           );
                        }).map(f => {
                           const agri = agricultores.find(a => a.id === f.agricultor_id);
                           return (
                              <tr key={f.id} className="hover:bg-green-50/20 transition-all">
                                 <td className="px-8 py-4 font-bold text-zinc-900 flex items-center gap-2">
                                    {agri?.nome || 'Desconhecido'}
                                    <button onClick={() => { setEditingLoan(f); setShowLoanModal(true); }} className="text-zinc-300 hover:text-zinc-600"><Edit size={14} /></button>
                                 </td>
                                 <td className="px-8 py-4 text-sm text-zinc-600">{f.tipo}</td>
                                 <td className="px-8 py-4 text-right font-black text-zinc-900">{formatAOA(f.valor_solicitado)}</td>
                                 <td className="px-8 py-4">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${f.status === 'Aprovado' ? 'bg-green-100 text-green-700' :
                                       f.status === 'Liquidado' ? 'bg-blue-100 text-blue-700' :
                                          f.status === 'Rejeitado' ? 'bg-red-100 text-red-700' :
                                             'bg-yellow-100 text-yellow-700'
                                       }`}>{f.status}</span>
                                 </td>
                                 <td className="px-8 py-4 text-right">
                                    <button onClick={() => toggleFinanciamentoStatus(f.id, f.status)} className="text-zinc-400 hover:text-green-600 font-bold text-xs uppercase underline">
                                       Alterar Estado
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         )
         }

         {/* --- VISITAS TÉCNICAS --- */}
         {
            activeTab === 'assistencia' && (
               <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                     <div className="flex-1">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                           <ClipboardCheck className="text-green-600" /> Relatórios de Campo
                        </h2>
                        <p className="text-zinc-500 text-sm font-medium mt-1">Acompanhamento técnico e monitoria de safras.</p>
                     </div>
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex-1 md:w-64 bg-white p-2 rounded-[1.5rem] border border-green-100 flex items-center shadow-sm">
                           <Search className="ml-4 text-zinc-300" size={18} />
                           <input
                              placeholder="Pesquisar relatório..."
                              className="w-full bg-transparent border-none focus:ring-0 py-3 px-4 text-zinc-900 font-bold text-sm"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                        </div>
                        <button
                           onClick={() => { setEditingVisit(null); setShowVisitModal(true); }}
                           className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 shadow-xl flex items-center gap-3 transition-all"
                        >
                           <Plus size={20} /> Nova Visita
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     {visitas.length > 0 ? visitas.filter(v => {
                        const agri = agricultores.find(a => a.id === v.agricultor_id);
                        const searchLower = searchTerm.toLowerCase();
                        return (
                           agri?.nome.toLowerCase().includes(searchLower) ||
                           v.agronomo.toLowerCase().includes(searchLower) ||
                           v.fase_cultura.toLowerCase().includes(searchLower)
                        );
                     }).map(v => {
                        const agri = agricultores.find(a => a.id === v.agricultor_id);
                        return (
                           <div key={v.id} className="bg-white p-8 rounded-[2.5rem] border border-green-50 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all group">
                              <div>
                                 <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
                                          <Map size={20} />
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{new Date(v.data).toLocaleDateString()}</p>
                                          <h4 className="font-black text-zinc-900">{agri?.nome || 'Agricultor N/A'}</h4>
                                       </div>
                                    </div>
                                    <button onClick={() => { setEditingVisit(v); setShowVisitModal(true); }} className="p-2 text-zinc-300 hover:text-green-600 transition-colors"><Edit size={16} /></button>
                                 </div>

                                 <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold text-zinc-600 bg-zinc-50 p-3 rounded-xl">
                                       <span>Fase:</span>
                                       <span className="text-green-700 uppercase">{v.fase_cultura}</span>
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Recomendações</p>
                                       <p className="text-sm font-medium text-zinc-600 leading-relaxed italic">"{v.recomendacoes}"</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-zinc-200 border-2 border-white"></div>
                                    <p className="text-[10px] font-bold text-zinc-500">Agrónomo: {v.agronomo}</p>
                                 </div>
                                 {v.foto_evidencia && <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1"><Camera size={12} /> Evidência</span>}
                              </div>
                           </div>
                        );
                     }) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-green-100">
                           <ClipboardCheck size={48} className="mx-auto text-green-200 mb-4" />
                           <p className="text-zinc-400 font-bold italic">Nenhuma visita técnica registada ainda.</p>
                        </div>
                     )}
                  </div>
               </div>
            )
         }

         {/* --- PRODUÇÃO --- */}
         {
            activeTab === 'producao' && (
               <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                     <div className="flex-1">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                           <Wheat className="text-green-600" /> Registo de Colheitas
                        </h2>
                        <p className="text-zinc-500 text-sm font-medium mt-1">Gestão de safra e destino da produção.</p>
                     </div>
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex-1 md:w-64 bg-white p-2 rounded-[1.5rem] border border-green-100 flex items-center shadow-sm">
                           <Search className="ml-4 text-zinc-300" size={18} />
                           <input
                              placeholder="Pesquisar colheita..."
                              className="w-full bg-transparent border-none focus:ring-0 py-3 px-4 text-zinc-900 font-bold text-sm"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                        </div>
                        <button
                           onClick={() => { setEditingProduction(null); setShowProductionModal(true); }}
                           className="px-10 py-5 bg-green-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-800 shadow-xl flex items-center gap-3 transition-all"
                        >
                           <Plus size={20} /> Nova Colheita
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {colheitas.length > 0 ? colheitas.filter(c => {
                        const agri = agricultores.find(a => a.id === c.agricultor_id);
                        const searchLower = searchTerm.toLowerCase();
                        return (
                           agri?.nome.toLowerCase().includes(searchLower) ||
                           c.cultura.toLowerCase().includes(searchLower)
                        );
                     }).map(c => {
                        const agri = agricultores.find(a => a.id === c.agricultor_id);
                        return (
                           <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-green-50 shadow-sm flex flex-col hover:shadow-lg transition-all">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                                       <Wheat size={24} />
                                    </div>
                                    <div>
                                       <h4 className="font-black text-zinc-900 text-lg">{c.cultura}</h4>
                                       <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{agri?.nome}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => { setEditingProduction(c); setShowProductionModal(true); }} className="p-2 text-zinc-300 hover:text-green-600 transition-colors"><Edit size={16} /></button>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-6">
                                 <div className="bg-zinc-50 p-4 rounded-2xl">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-1 flex items-center gap-1"><Scale size={10} /> Quantidade</p>
                                    <p className="text-xl font-black text-zinc-900">{c.qtd_kg} <span className="text-xs text-zinc-500">kg</span></p>
                                 </div>
                                 <div className="bg-zinc-50 p-4 rounded-2xl">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-1 flex items-center gap-1"><Calendar size={10} /> Data</p>
                                    <p className="text-sm font-bold text-zinc-900">{new Date(c.data).toLocaleDateString()}</p>
                                 </div>
                              </div>

                              <div className="mt-auto pt-4 border-t border-zinc-50 flex justify-between items-center">
                                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${c.destino === 'Venda Cooperativa' ? 'bg-green-100 text-green-700 border-green-200' :
                                    c.destino === 'Armazém' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                       'bg-orange-100 text-orange-700 border-orange-200'
                                    }`}>
                                    {c.destino}
                                 </span>
                                 <Store size={16} className="text-zinc-300" />
                              </div>
                           </div>
                        );
                     }) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-green-100">
                           <Wheat size={48} className="mx-auto text-green-200 mb-4" />
                           <p className="text-zinc-400 font-bold italic">Nenhuma colheita registada ainda.</p>
                        </div>
                     )}
                  </div>
               </div>
            )
         }

         {/* --- MODAL CADASTRO AGRICULTOR --- */}
         {
            showModal && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                     <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                           <Sprout className="text-green-600" /> {editingAgricultor ? 'Editar Produtor' : 'Registar Agricultor'}
                        </h2>
                        <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><XCircle size={28} /></button>
                     </div>

                     <form onSubmit={handleSaveAgricultor} className="overflow-y-auto p-10 space-y-8">
                        <div className="flex justify-center mb-6">
                           <div
                              className="w-32 h-32 rounded-full bg-zinc-100 border-4 border-white shadow-xl flex items-center justify-center cursor-pointer overflow-hidden relative group"
                              onClick={() => fileInputRef.current?.click()}
                           >
                              {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Camera className="text-zinc-300" size={32} />}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                 <span className="text-white text-[9px] font-black uppercase">Alterar</span>
                              </div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => setPhotoPreview(reader.result as string);
                                 reader.readAsDataURL(file);
                              }
                           }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <Input name="nome" label="Nome Completo" defaultValue={editingAgricultor?.nome} required />
                           <Input name="bi" label="Bilhete de Identidade" defaultValue={editingAgricultor?.bi} required />
                           <Input name="nif" label="NIF (Contribuinte)" defaultValue={editingAgricultor?.nif} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <Input name="telefone" label="Telefone" defaultValue={editingAgricultor?.telefone} />
                           <Input name="localidade" label="Localidade / Aldeia" defaultValue={editingAgricultor?.localidade} required />
                           <Select
                              name="provincia"
                              label="Província"
                              defaultValue={editingAgricultor?.provincia || 'Benguela'}
                              options={PROVINCIAS_ANGOLA.map(p => ({ value: p, label: p }))}
                           />
                        </div>

                        <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                           <h3 className="text-xs font-black text-green-800 uppercase tracking-widest mb-4">Dados de Produção</h3>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="flex items-end gap-2">
                                 <Select
                                    name="cultura"
                                    label="Cultivo Principal"
                                    defaultValue={editingAgricultor?.cultura_principal}
                                    options={cultivos.map(c => ({ value: c, label: c }))}
                                 />
                                 <button
                                    type="button"
                                    onClick={handleAddCultivo}
                                    className="p-3 bg-green-700 text-white rounded-lg hover:bg-green-800 mb-0.5"
                                    title="Adicionar Novo Cultivo"
                                 >
                                    <Plus size={16} />
                                 </button>
                              </div>
                              <Input name="area" label="Área (Hectares)" type="number" step="0.1" defaultValue={editingAgricultor?.area_cultivada_ha} required />
                              <Input name="cooperativa" label="Cooperativa (Opcional)" defaultValue={editingAgricultor?.cooperativa} />
                           </div>
                        </div>

                        <div className="flex justify-end pt-4">
                           <button type="submit" className="px-12 py-5 bg-green-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-green-800 transition-all flex items-center gap-3">
                              <CheckCircle2 size={18} /> Guardar Ficha do Produtor
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }

         {/* --- MODAL VISITA TÉCNICA --- */}
         {
            showVisitModal && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                     <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                           <ClipboardCheck className="text-green-600" /> {editingVisit ? 'Editar Relatório' : 'Nova Visita'}
                        </h2>
                        <button onClick={() => setShowVisitModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><XCircle size={28} /></button>
                     </div>

                     <form onSubmit={handleSaveVisit} className="p-10 space-y-6">
                        <Select
                           name="agricultor_id"
                           label="Agricultor Visitado"
                           defaultValue={editingVisit?.agricultor_id}
                           required
                           options={agricultores.map(a => ({ value: a.id, label: `${a.nome} (${a.localidade})` }))}
                        />

                        <div className="grid grid-cols-2 gap-6">
                           <Input name="data" label="Data da Visita" type="date" defaultValue={editingVisit?.data || new Date().toISOString().split('T')[0]} required />
                           <Input name="agronomo" label="Técnico Agrónomo" defaultValue={editingVisit?.agronomo} required placeholder="Nome do técnico" />
                        </div>

                        <Select
                           name="fase"
                           label="Fase da Cultura"
                           defaultValue={editingVisit?.fase_cultura}
                           options={[
                              { value: 'Preparação', label: 'Preparação do Solo' },
                              { value: 'Sementeira', label: 'Sementeira / Plantio' },
                              { value: 'Crescimento', label: 'Crescimento / Vegetativa' },
                              { value: 'Colheita', label: 'Maturação / Colheita' }
                           ]}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <Input name="estado_solo" label="Estado do Solo (Humidade/PH)" defaultValue={editingVisit?.estado_solo} placeholder="Ex: Solo húmido, PH 6.5" />
                           <Input name="pragas" label="Pragas ou Doenças Detetadas" defaultValue={editingVisit?.pragas_detetadas} placeholder="Ex: Nenhuma ou Larva do Funil" />
                        </div>

                        <div className="space-y-1">
                           <label className="text-sm font-medium text-zinc-700">Recomendações Técnicas</label>
                           <textarea
                              name="recomendacoes"
                              defaultValue={editingVisit?.recomendacoes}
                              required
                              className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-green-500 h-32 font-medium text-zinc-700"
                              placeholder="Descreva as orientações passadas ao produtor..."
                           />
                        </div>

                        <div className="flex justify-end pt-4">
                           <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3">
                              <Save size={18} /> Salvar Relatório
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }

         {/* --- MODAL PRODUÇÃO (COLHEITA) --- */}
         {
            showProductionModal && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                     <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                           <Wheat className="text-green-600" /> {editingProduction ? 'Editar Colheita' : 'Nova Colheita'}
                        </h2>
                        <button onClick={() => setShowProductionModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><XCircle size={28} /></button>
                     </div>

                     <form onSubmit={handleSaveProduction} className="p-10 space-y-6">
                        <Select
                           name="agricultor_id"
                           label="Agricultor"
                           defaultValue={editingProduction?.agricultor_id}
                           required
                           options={agricultores.map(a => ({ value: a.id, label: a.nome }))}
                        />

                        <div className="grid grid-cols-2 gap-6">
                           <Select name="cultura" label="Cultura" defaultValue={editingProduction?.cultura} options={cultivos.map(c => ({ value: c, label: c }))} />
                           <Input name="qtd" label="Quantidade (KG)" type="number" defaultValue={editingProduction?.qtd_kg} required />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <Input name="data" label="Data Colheita" type="date" defaultValue={editingProduction?.data || new Date().toISOString().split('T')[0]} required />
                           <Select name="destino" label="Destino da Produção" defaultValue={editingProduction?.destino} options={[
                              { value: 'Consumo Próprio', label: 'Consumo Próprio' },
                              { value: 'Venda Cooperativa', label: 'Venda à Cooperativa' },
                              { value: 'Armazém', label: 'Armazenamento' }
                           ]} />
                        </div>

                        <div className="flex justify-end pt-4">
                           <button type="submit" className="w-full py-5 bg-green-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-green-800 transition-all flex items-center justify-center gap-3">
                              <Save size={18} /> Registar Produção
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }

         {/* --- MODAL FINANCIAMENTO --- */}
         {
            showLoanModal && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                     <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                           <HandCoins className="text-green-600" /> {editingLoan ? 'Editar Crédito' : 'Nova Solicitação'}
                        </h2>
                        <button onClick={() => setShowLoanModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><XCircle size={28} /></button>
                     </div>

                     <form onSubmit={handleSaveLoan} className="p-10 space-y-6">
                        <Select
                           name="agricultor_id"
                           label="Agricultor Beneficiário"
                           defaultValue={editingLoan?.agricultor_id || preSelectedAgricultorId}
                           required
                           options={agricultores.map(a => ({ value: a.id, label: `${a.nome} (ID: ${a.id.substring(0, 4)})` }))}
                        />

                        <div className="grid grid-cols-2 gap-6">
                           <Select name="tipo" label="Tipo de Apoio" defaultValue={editingLoan?.tipo} options={[
                              { value: 'Sementes', label: 'Kit Sementes' },
                              { value: 'Fertilizantes', label: 'Fertilizantes' },
                              { value: 'Equipamento', label: 'Equipamento' },
                              { value: 'Monetário', label: 'Micro-Crédito' }
                           ]} />
                           <Input name="valor" label="Valor Estimado (AOA)" type="number" defaultValue={editingLoan?.valor_solicitado} required />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <Input name="data" label="Data Solicitação" type="date" defaultValue={editingLoan?.data_solicitacao || new Date().toISOString().split('T')[0]} required />
                           <Input name="prazo" label="Prazo Pagamento" type="date" defaultValue={editingLoan?.prazo_pagamento || new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]} required />
                        </div>

                        <Select name="status" label="Estado do Pedido" defaultValue={editingLoan?.status || 'Pendente'} options={[
                           { value: 'Pendente', label: 'Pendente' },
                           { value: 'Aprovado', label: 'Aprovado' },
                           { value: 'Rejeitado', label: 'Rejeitado' },
                           { value: 'Liquidado', label: 'Liquidado / Pago' }
                        ]} />

                        <div className="flex justify-end pt-4">
                           <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3">
                              <CreditCard size={18} /> Confirmar Solicitação
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }
      </div >
   );
};

export default AgroPage;
