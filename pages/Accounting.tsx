
import React, { useState, useMemo, useEffect } from 'react';
import {
   Calculator, BarChart3, Receipt, Users, Landmark, Scale,
   Calendar, FilePieChart, Sparkles, BrainCircuit, ArrowUpRight,
   ArrowDownLeft, History, CheckCircle2, AlertTriangle, Printer,
   RefreshCw, DollarSign, Building2, Wallet, Plus, Search,
   Download, Filter, ShieldCheck, MoreVertical, CreditCard,
   FileText, Upload, PieChart as PieChartIcon, TrendingUp, Briefcase, FileCheck,
   BookOpen, Lock, ShieldAlert, FileSearch, HelpCircle, X, ChevronDown, ListFilter, Save,
   BarChart4, Share2
} from 'lucide-react';
import {
   ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
   Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import {
   LancamentoContabil, FolhaPagamento, ObrigacaoFiscal,
   EmpresaAfiliada, Funcionario, DocumentoDigital, MovimentoBancario, PlanoConta, LancamentoItem
} from '../types';
import { supabase } from '../src/lib/supabase';
import { formatAOA } from '../constants';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Logo from '../components/Logo';

// --- PLANO DE CONTAS SIMPLIFICADO ANGOLANO ---
const PLANO_CONTAS: PlanoConta[] = [
   { codigo: '1.1', nome: 'Caixa e Bancos', tipo: 'Ativo', natureza: 'Devedora' },
   { codigo: '1.2', nome: 'Clientes', tipo: 'Ativo', natureza: 'Devedora' },
   { codigo: '2.1', nome: 'Fornecedores', tipo: 'Passivo', natureza: 'Credora' },
   { codigo: '2.4', nome: 'Estado (Impostos)', tipo: 'Passivo', natureza: 'Credora' },
   { codigo: '5.1', nome: 'Capital Social', tipo: 'Capital', natureza: 'Credora' },
   { codigo: '6.1', nome: 'Vendas e Serviços', tipo: 'Receita', natureza: 'Credora' },
   { codigo: '7.1', nome: 'Custo das Mercadorias', tipo: 'Despesa', natureza: 'Devedora' },
   { codigo: '7.2', nome: 'Gastos com Pessoal', tipo: 'Despesa', natureza: 'Devedora' },
   { codigo: '7.3', nome: 'Manutenção e Reparos', tipo: 'Despesa', natureza: 'Devedora' },
   { codigo: '7.5', nome: 'Serviços de Terceiros', tipo: 'Despesa', natureza: 'Devedora' },
];

const COLORS_PIE = ['#eab308', '#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#f97316'];

const AccountingPage: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'dashboard' | 'diario' | 'folha' | 'fiscal' | 'demonstracoes' | 'ia'>('dashboard');
   const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
   const [loading, setLoading] = useState(true);

   // Modals States
   const [showEntryModal, setShowEntryModal] = useState(false);
   const [showReportModal, setShowReportModal] = useState(false);

   // Loading States
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
   const [isExportingFiscal, setIsExportingFiscal] = useState(false);

   const [iaResponse, setIaResponse] = useState<string | null>(null);

   // Form State para Novo Lançamento
   const [newEntry, setNewEntry] = useState({
      descricao: '',
      contaDebito: '7.5',
      contaCredito: '1.1',
      valor: 0,
      data: new Date().toISOString().split('T')[0]
   });

   // --- ESTADOS DE DADOS (SUPABASE) ---
   const [lancamentos, setLancamentos] = useState<LancamentoContabil[]>([]);
   const [folhas, setFolhas] = useState<FolhaPagamento[]>([]);
   const [obligacoes, setObligacoes] = useState<ObrigacaoFiscal[]>([]);
   const [empresas, setEmpresas] = useState<EmpresaAfiliada[]>([]);
   const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

   const fetchAccountingData = async () => {
      setLoading(true);
      try {
         const [
            { data: emps },
            { data: funcs },
            { data: lnc },
            { data: flh },
            { data: obl }
         ] = await Promise.all([
            supabase.from('acc_empresas').select('*').order('nome'),
            supabase.from('hr_employees').select('*').order('nome'),
            supabase.from('acc_lancamentos').select('*, itens:acc_lancamento_itens(*)').order('data', { ascending: false }),
            supabase.from('acc_folhas').select('*').order('mes_referencia', { ascending: false }),
            supabase.from('acc_obrigacoes').select('*').order('data_limite')
         ]);

         if (emps) setEmpresas(emps as any);
         if (funcs) setFuncionarios(funcs as any);
         if (lnc) setLancamentos(lnc as any);
         if (flh) setFolhas(flh as any);
         if (obl) setObligacoes(obl as any);

         if (emps && emps.length > 0 && !selectedEmpresaId) {
            setSelectedEmpresaId(emps[0].id);
         }
      } catch (error) {
         console.error('Error fetching accounting data:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchAccountingData();
   }, []);

   const currentEmpresa = empresas.find(e => e.id === selectedEmpresaId) || empresas[0];

   // --- LÓGICA DE GRÁFICOS E RELATÓRIOS ---
   const chartData = useMemo(() => {
      const filterEmp = (arr: LancamentoContabil[]) => arr.filter(l => l.empresa_id === selectedEmpresaId);
      const empLancamentos = filterEmp(lancamentos);

      // 1. Dados para Gráfico de Barras (Mensal: Receita vs Despesa)
      const monthlyStats: Record<string, { receita: number, despesa: number }> = {};
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      meses.forEach(m => monthlyStats[m] = { receita: 0, despesa: 0 });

      empLancamentos.forEach(l => {
         const mesIndex = new Date(l.data).getMonth();
         const mesNome = meses[mesIndex];

         l.itens?.forEach(it => {
            if (it.conta_codigo.startsWith('6')) {
               monthlyStats[mesNome].receita += it.valor;
            }
            if (it.conta_codigo.startsWith('7')) {
               monthlyStats[mesNome].despesa += it.valor;
            }
         });
      });

      const barChartData = meses.map(m => ({
         name: m,
         Receita: monthlyStats[m].receita,
         Despesa: monthlyStats[m].despesa
      }));

      const hasData = barChartData.some(d => d.Receita > 0 || d.Despesa > 0);
      const finalBarData = hasData ? barChartData : [
         { name: 'Jan', Receita: 400000, Despesa: 250000 },
         { name: 'Fev', Receita: 300000, Despesa: 280000 },
         { name: 'Mar', Receita: 550000, Despesa: 320000 },
         { name: 'Abr', Receita: 600000, Despesa: 400000 },
      ];

      const expenseCategories: Record<string, number> = {};
      empLancamentos.forEach(l => {
         l.itens?.forEach(it => {
            if (it.conta_codigo.startsWith('7')) {
               expenseCategories[it.conta_nome] = (expenseCategories[it.conta_nome] || 0) + it.valor;
            }
         });
      });

      const pieChartData = Object.keys(expenseCategories).map(k => ({
         name: k,
         value: expenseCategories[k]
      }));

      const finalPieData = pieChartData.length > 0 ? pieChartData : [
         { name: 'Pessoal', value: 450000 },
         { name: 'Manutenção', value: 120000 },
         { name: 'Serviços Terceiros', value: 80000 },
         { name: 'Impostos', value: 50000 },
      ];

      return { barChartData: finalBarData, pieChartData: finalPieData };
   }, [selectedEmpresaId, lancamentos]);

   // --- LÓGICA DE BALANÇO E DRE (TOTAIS) ---
   const financeReports = useMemo(() => {
      const filterEmp = (arr: LancamentoContabil[]) => arr.filter(l => l.empresa_id === selectedEmpresaId);
      const empLancamentos = filterEmp(lancamentos);

      const saldos: Record<string, number> = {};
      PLANO_CONTAS.forEach(c => saldos[c.codigo] = 0);

      empLancamentos.forEach(l => {
         l.itens?.forEach(it => {
            const conta = PLANO_CONTAS.find(c => c.codigo === it.conta_codigo);
            if (!conta) return;
            let valorImpacto = Number(it.valor);
            if (conta.natureza === 'Devedora') {
               valorImpacto = it.tipo === 'D' ? it.valor : -it.valor;
            } else {
               valorImpacto = it.tipo === 'C' ? it.valor : -it.valor;
            }
            saldos[it.conta_codigo] = (saldos[it.conta_codigo] || 0) + Number(valorImpacto);
         });
      });

      const receitaTotal = Object.keys(saldos).filter(k => k.startsWith('6')).reduce((acc, k) => acc + saldos[k], 0);
      const despesaTotal = Object.keys(saldos).filter(k => k.startsWith('7')).reduce((acc, k) => acc + saldos[k], 0);
      const lucroLiquido = receitaTotal - despesaTotal;
      const ativos = Object.keys(saldos).filter(k => k.startsWith('1')).reduce((acc, k) => acc + saldos[k], 0);
      const passivos = Object.keys(saldos).filter(k => k.startsWith('2')).reduce((acc, k) => acc + saldos[k], 0);
      const capital = Object.keys(saldos).filter(k => k.startsWith('5')).reduce((acc, k) => acc + saldos[k], 0);

      return { receitaTotal, despesaTotal, lucroLiquido, ativos, passivos, capital };
   }, [selectedEmpresaId, lancamentos]);

   // --- LÓGICA DE IA ---
   const handleAIAnalysis = async () => {
      setIsAnalyzing(true);
      setIaResponse(null);
      try {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const prompt = `Analise os dados financeiros da empresa ${currentEmpresa?.nome} em Angola:
      - Receita: ${formatAOA(financeReports.receitaTotal)}
      - Despesa: ${formatAOA(financeReports.despesaTotal)}
      - Lucro: ${formatAOA(financeReports.lucroLiquido)}
      - Património Líquido: ${formatAOA(financeReports.ativos - financeReports.passivos)}
      
      Forneça 3 sugestões estratégicas para redução de custos e 1 alerta sobre conformidade fiscal (IVA/IRT).`;

         const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt
         });

         setIaResponse(response.text);
      } catch (error) {
         setIaResponse("A IA está processando auditorias externas. Tente novamente em instantes.");
      } finally {
         setIsAnalyzing(false);
      }
   };

   // --- LÓGICA DE PAYROLL ---
   const runPayroll = async () => {
      const funcionariosAtivos = funcionarios.filter(f => f.status === 'Ativo');
      if (funcionariosAtivos.length === 0) {
         alert("Não há funcionários ativos para processar.");
         return;
      }
      if (!confirm(`Confirmar processamento da folha para ${funcionariosAtivos.length} colaboradores na empresa ${currentEmpresa.nome}?`)) return;
      setIsProcessingPayroll(true);

      try {
         const payrollBatch = funcionariosAtivos.map(f => {
            const base = Number(f.salario_base);
            const inss_t = base * 0.03;
            const inss_e = base * 0.08;
            let irt = 0;
            if (base > 100000) irt = (base - 100000) * 0.10;

            return {
               funcionario_id: f.id,
               funcionario_nome: f.nome,
               mes_referencia: new Date().toLocaleString('pt-PT', { month: 'long', year: 'numeric' }),
               salario_base: base,
               subsidios: Number(f.subsidio_alimentacao) + Number(f.subsidio_transporte),
               inss_trabalhador: inss_t,
               inss_empresa: inss_e,
               irt,
               seguro_trabalho: base * 0.01,
               salario_liquido: (base + Number(f.subsidio_alimentacao) + Number(f.subsidio_transporte)) - (inss_t + irt),
               status: 'Processado',
               empresa_id: selectedEmpresaId
            };
         });

         // 1. Inserir Folhas
         const { error: fError } = await supabase.from('acc_folhas').insert(payrollBatch);
         if (fError) throw fError;

         // 2. Criar Lançamento Contábil Correspondente
         const totalLiquido = payrollBatch.reduce((acc, f) => acc + f.salario_liquido, 0);
         const totalImpostos = payrollBatch.reduce((acc, f) => acc + f.irt + f.inss_trabalhador + f.inss_empresa, 0);

         const { data: head, error: hError } = await supabase.from('acc_lancamentos').insert([{
            data: new Date().toISOString(),
            periodo: new Date().toISOString().slice(0, 7),
            descricao: `Processamento Salarial - ${new Date().toLocaleString('pt-PT', { month: 'long' })}`,
            empresa_id: selectedEmpresaId,
            usuario_id: null,
            status: 'Postado',
            tipo_transacao: 'Folha'
         }]).select().single();

         if (hError) throw hError;

         await supabase.from('acc_lancamento_itens').insert([
            { lancamento_id: head.id, conta_codigo: '7.2', conta_nome: 'Gastos com Pessoal (Salários + Encargos)', tipo: 'D', valor: totalLiquido + totalImpostos },
            { lancamento_id: head.id, conta_codigo: '1.1', conta_nome: 'Caixa e Bancos', tipo: 'C', valor: totalLiquido },
            { lancamento_id: head.id, conta_codigo: '2.4', conta_nome: 'Estado (IRT/INSS a Pagar)', tipo: 'C', valor: totalImpostos }
         ]);

         fetchAccountingData();
         alert('Folha processada com sucesso!');
      } catch (error) {
         console.error('Payroll error:', error);
         alert('Erro ao processar folha de pagamento');
      } finally {
         setIsProcessingPayroll(false);
      }
   };

   // --- LÓGICA NOVO LANÇAMENTO ---
   const handleNewEntry = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newEntry.valor <= 0) {
         alert("O valor deve ser maior que zero.");
         return;
      }
      const debito = PLANO_CONTAS.find(c => c.codigo === newEntry.contaDebito);
      const credito = PLANO_CONTAS.find(c => c.codigo === newEntry.contaCredito);

      try {
         // 1. Inserir cabeçalho
         const { data: head, error: hError } = await supabase.from('acc_lancamentos').insert([{
            data: newEntry.data,
            periodo: newEntry.data.slice(0, 7),
            descricao: newEntry.descricao,
            empresa_id: selectedEmpresaId,
            usuario_id: null,
            status: 'Postado',
            tipo_transacao: 'Manual'
         }]).select().single();

         if (hError) throw hError;

         // 2. Inserir itens
         await supabase.from('acc_lancamento_itens').insert([
            { lancamento_id: head.id, conta_codigo: debito!.codigo, conta_nome: debito!.nome, tipo: 'D', valor: Number(newEntry.valor) },
            { lancamento_id: head.id, conta_codigo: credito!.codigo, conta_nome: credito!.nome, tipo: 'C', valor: Number(newEntry.valor) }
         ]);

         fetchAccountingData();
         setShowEntryModal(false);
         setNewEntry({ ...newEntry, descricao: '', valor: 0 });
      } catch (error) {
         alert('Erro ao salvar lançamento');
      }
   };

   const handleExportChart = () => {
      alert("Exportação de gráfico iniciada. (Funcionalidade simulada)");
   };

   const handleExportFiscal = () => {
      setIsExportingFiscal(true);
      setTimeout(() => {
         setIsExportingFiscal(false);
         window.print();
      }, 2000);
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-24">
         {/* Header Profissional com Seletor de Empresa */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200 print:hidden">
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-zinc-900 rounded-2xl shadow-xl border border-white/10">
                     <Scale className="text-yellow-500" size={28} />
                  </div>
                  <div>
                     <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase">Amazing <span className="text-yellow-500">ContábilExpert</span></h1>
                     <p className="text-zinc-500 font-bold flex items-center gap-2">
                        <ShieldCheck size={14} className="text-green-600" /> Amazing Corporate Group S.A.
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-sky-100 shadow-sm w-fit">
                  <Building2 size={18} className="ml-2 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase mr-2">Entidade:</span>
                  <select
                     value={selectedEmpresaId}
                     onChange={(e) => setSelectedEmpresaId(e.target.value)}
                     className="bg-transparent border-none focus:ring-0 text-sm font-black uppercase text-zinc-800 pr-10 cursor-pointer outline-none"
                  >
                     {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                     ))}
                  </select>
               </div>
            </div>

            <div className="flex flex-wrap gap-1 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               {[
                  { id: 'dashboard', icon: <BarChart3 size={18} />, label: 'Resumo' },
                  { id: 'diario', icon: <BookOpen size={18} />, label: 'Diário' },
                  { id: 'demonstracoes', icon: <FilePieChart size={18} />, label: 'Balanço & DRE' },
                  { id: 'folha', icon: <Briefcase size={18} />, label: 'Payroll' },
                  { id: 'fiscal', icon: <Landmark size={18} />, label: 'Fiscal' },
                  { id: 'ia', icon: <BrainCircuit size={18} />, label: 'Amazing IA' }
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400 hover:bg-white'}`}
                  >
                     {tab.icon} {tab.label}
                  </button>
               ))}
            </div>
         </div>

         {/* --- DASHBOARD --- */}
         {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Receita Acumulada</p>
                     <p className="text-3xl font-black text-zinc-900">{formatAOA(financeReports.receitaTotal)}</p>
                     <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit">
                        <ArrowUpRight size={12} /> Operacional
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Custos Totais</p>
                     <p className="text-3xl font-black text-red-600">{formatAOA(financeReports.despesaTotal)}</p>
                     <p className="text-[9px] text-zinc-400 font-medium mt-2">Incluindo taxas e pessoal</p>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                     <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Lucro Líquido</p>
                     <p className="text-3xl font-black">{formatAOA(financeReports.lucroLiquido)}</p>
                     <div className="mt-4 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, Math.max(0, (financeReports.lucroLiquido / (financeReports.receitaTotal || 1)) * 100))}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black">Margem</span>
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Saúde Financeira</p>
                     <p className="text-4xl font-black text-zinc-900">8.5</p>
                     <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Excelência</p>
                  </div>
               </div>

               {/* GRÁFICOS AVANÇADOS */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* GRÁFICO 1: COLUNAS - RECEITA vs DESPESA (MENSAL) */}
                  <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm h-[500px] flex flex-col">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                              <BarChart4 className="text-yellow-500" size={20} /> Comparativo Financeiro
                           </h3>
                           <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-widest">Análise Anual {currentEmpresa.nome}</p>
                        </div>
                        <div className="flex gap-2">
                           <select className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-zinc-500 outline-none">
                              <option>Últimos 12 Meses</option>
                              <option>Trimestral</option>
                           </select>
                           <button onClick={handleExportChart} className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-colors" title="Exportar Gráfico">
                              <Download size={16} />
                           </button>
                        </div>
                     </div>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData.barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }} />
                              <Tooltip
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                                 formatter={(value: number) => formatAOA(value)}
                                 itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                              <Bar dataKey="Receita" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={12} />
                              <Bar dataKey="Despesa" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={12} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* GRÁFICO 2: PIZZA - DESPESAS POR CATEGORIA */}
                  <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm h-[500px] flex flex-col">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                              <PieChartIcon className="text-yellow-500" size={20} /> Distribuição de Despesas
                           </h3>
                           <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-widest">Alocação de Custos Operacionais</p>
                        </div>
                        <div className="flex gap-2">
                           <select className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-zinc-500 outline-none">
                              <option>Por Categoria</option>
                              <option>Por Centro de Custo</option>
                           </select>
                           <button onClick={handleExportChart} className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-colors" title="Exportar Gráfico">
                              <Share2 size={16} />
                           </button>
                        </div>
                     </div>
                     <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={chartData.pieChartData}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={80}
                                 outerRadius={140}
                                 paddingAngle={5}
                                 dataKey="value"
                              >
                                 {chartData.pieChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="none" />
                                 ))}
                              </Pie>
                              <Tooltip
                                 formatter={(value: number) => formatAOA(value)}
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                                 itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              />
                              <Legend
                                 layout="vertical"
                                 verticalAlign="middle"
                                 align="right"
                                 wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                              />
                           </PieChart>
                        </ResponsiveContainer>
                        {/* Centro do Donut */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-28">
                           <div className="text-center">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total</p>
                              <p className="text-lg font-black text-zinc-900">{formatAOA(chartData.pieChartData.reduce((a, b) => a + b.value, 0))}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Seção Alertas e Botão Relatório (Mantida da versão anterior, ajustada layout) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-zinc-900 p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl">
                     <div className="space-y-6">
                        <h3 className="text-xl font-black uppercase tracking-tight text-yellow-500">Alertas de Risco</h3>
                        <div className="space-y-4">
                           <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                              <AlertTriangle className="text-red-500 shrink-0" size={20} />
                              <div>
                                 <p className="text-sm font-bold">IVA Pendente</p>
                                 <p className="text-xs text-zinc-400">Vencimento em 5 dias.</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                              <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                              <div>
                                 <p className="text-sm font-bold">Payroll Postada</p>
                                 <p className="text-xs text-zinc-400">Março processado com sucesso.</p>
                              </div>
                           </div>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowReportModal(true)}
                        className="w-full mt-8 py-4 bg-yellow-500 text-zinc-900 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-xl"
                     >
                        Ver Relatório Detalhado
                     </button>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm flex flex-col justify-center">
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black uppercase tracking-tight">Evolução de Fluxo (Área)</h3>
                     </div>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={[
                              { name: 'Sem 1', val: 400000 },
                              { name: 'Sem 2', val: 300000 },
                              { name: 'Sem 3', val: 550000 },
                              { name: 'Sem 4', val: 900000 },
                           ]}>
                              <defs>
                                 <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.3} /><stop offset="95%" stopColor="#eab308" stopOpacity={0} /></linearGradient>
                              </defs>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                              <YAxis hide />
                              <Tooltip />
                              <Area type="monotone" dataKey="val" stroke="#eab308" fillOpacity={1} fill="url(#colorVal)" strokeWidth={4} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- DIARIO --- */}
         {activeTab === 'diario' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-sky-100">
                  <div className="flex justify-between items-center mb-10">
                     <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                        <Receipt className="text-yellow-500" /> Livro Diário - {currentEmpresa.nome}
                     </h2>
                     <button
                        onClick={() => setShowEntryModal(true)}
                        className="px-8 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 shadow-xl"
                     >
                        <Plus size={16} /> Novo Lançamento
                     </button>
                  </div>

                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              <th className="px-8 py-5">Data</th>
                              <th className="px-8 py-5">Descrição</th>
                              <th className="px-8 py-5">Contas (Débito/Crédito)</th>
                              <th className="px-8 py-5 text-right">Valor Consolidado</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                           {lancamentos.filter(l => l.empresa_id === selectedEmpresaId).length > 0 ? (
                              lancamentos.filter(l => l.empresa_id === selectedEmpresaId).map(l => (
                                 <tr key={l.id} className="hover:bg-zinc-50/50 transition-all">
                                    <td className="px-8 py-5 text-xs font-bold text-zinc-500">{new Date(l.data).toLocaleDateString()}</td>
                                    <td className="px-8 py-5 font-black text-zinc-900 text-sm">{l.descricao}</td>
                                    <td className="px-8 py-5">
                                       <div className="space-y-1">
                                          {l.itens.map((it, idx) => (
                                             <div key={idx} className="flex gap-4 items-center">
                                                <span className={`w-3 h-3 rounded-full ${it.tipo === 'D' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className="text-[10px] font-black text-zinc-500 w-10">{it.tipo}</span>
                                                <span className="text-xs font-bold text-zinc-700">{it.conta_nome}</span>
                                             </div>
                                          ))}
                                       </div>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-zinc-900">
                                       {formatAOA(l.itens.filter(i => i.tipo === 'D').reduce((a, b) => a + b.valor, 0))}
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr><td colSpan={4} className="text-center py-10 text-zinc-400 font-bold italic">Nenhum lançamento registado para {currentEmpresa.nome}.</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* --- DEMONSTRAÇÕES FINANCEIRAS --- */}
         {activeTab === 'demonstracoes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
               {/* Balanço Patrimonial */}
               <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-sky-100">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className="text-2xl font-black uppercase tracking-tight">Balanço Patrimonial - {currentEmpresa.nome}</h3>
                     <button className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-900"><Printer size={20} /></button>
                  </div>
                  <div className="space-y-8">
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2">Ativo (Devedora)</p>
                        <div className="flex justify-between text-sm"><span className="font-bold">Total do Ativo Circulante</span><span className="font-black">{formatAOA(financeReports.ativos)}</span></div>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2">Passivo (Credora)</p>
                        <div className="flex justify-between text-sm"><span className="font-bold">Obrigações a Curto Prazo</span><span className="font-black text-red-600">{formatAOA(financeReports.passivos)}</span></div>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2">Capital Próprio</p>
                        <div className="flex justify-between text-sm"><span className="font-bold">Reservas e Capital Social</span><span className="font-black">{formatAOA(financeReports.capital)}</span></div>
                     </div>
                     <div className="pt-6 border-t-2 border-zinc-900 flex justify-between">
                        <span className="text-lg font-black uppercase">Património Líquido</span>
                        <span className="text-2xl font-black text-zinc-900">{formatAOA(financeReports.ativos - financeReports.passivos)}</span>
                     </div>
                  </div>
               </div>

               {/* DRE */}
               <div className="bg-zinc-900 p-12 rounded-[4rem] shadow-2xl text-white">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className="text-2xl font-black uppercase tracking-tight text-yellow-500">DRE (Resultado)</h3>
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Exercício 2024</span>
                  </div>
                  <div className="space-y-8">
                     <div className="flex justify-between border-b border-white/10 pb-4">
                        <span className="font-bold text-zinc-400 uppercase text-xs">Proveitos Operacionais</span>
                        <span className="font-black text-xl">{formatAOA(financeReports.receitaTotal)}</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-4">
                        <span className="font-bold text-zinc-400 uppercase text-xs">Custos com Pessoal</span>
                        <span className="font-black text-lg text-red-400">({formatAOA(folhas.reduce((a, b) => a + b.salario_base, 0))})</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-4">
                        <span className="font-bold text-zinc-400 uppercase text-xs">Custos de Manutenção</span>
                        <span className="font-black text-lg text-red-400">({formatAOA(financeReports.despesaTotal * 0.3)})</span>
                     </div>
                     <div className="bg-white/5 p-8 rounded-3xl mt-12">
                        <div className="flex justify-between items-center">
                           <div>
                              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Resultado Líquido do Período</p>
                              <p className="text-3xl font-black">{formatAOA(financeReports.lucroLiquido)}</p>
                           </div>
                           <div className={`p-4 rounded-2xl ${financeReports.lucroLiquido >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                              {financeReports.lucroLiquido >= 0 ? <ArrowUpRight size={32} /> : <ArrowDownLeft size={32} />}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- IA CONSULTOR --- */}
         {activeTab === 'ia' && (
            <div className="space-y-8 animate-in fade-in duration-700">
               <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-black p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden border border-indigo-500/30">
                  <div className="absolute top-0 right-0 p-12 opacity-10 animate-pulse"><BrainCircuit size={240} /></div>
                  <div className="relative z-10 max-w-4xl space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/50 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                           <Sparkles size={14} /> Cognitive Auditor
                        </div>
                     </div>
                     <h2 className="text-6xl font-black tracking-tighter leading-none">Auditoria <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-white">Inteligente Amazing.</span></h2>
                     <p className="text-zinc-400 text-xl font-medium leading-relaxed max-w-2xl">Analise anomalias, otimize impostos e tome decisões baseadas em padrões de alto nível processados em tempo real.</p>
                     <button
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                        className="px-12 py-6 bg-indigo-600 hover:bg-indigo-500 rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl transition-all disabled:opacity-50 flex items-center gap-4"
                     >
                        {isAnalyzing ? <RefreshCw className="animate-spin" /> : <ShieldAlert />}
                        {isAnalyzing ? 'Processando Balancetes...' : 'Gerar Relatório de Auditoria IA'}
                     </button>
                  </div>
               </div>

               {iaResponse && (
                  <div className="bg-white p-16 rounded-[4rem] border-2 border-indigo-100 shadow-3xl animate-in zoom-in-95">
                     <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-3"><CheckCircle2 /> Insights Gerados</h4>
                     <div className="text-zinc-700 text-xl font-medium leading-relaxed italic whitespace-pre-wrap">{iaResponse}</div>
                  </div>
               )}
            </div>
         )}

         {/* --- PAYROLL --- */}
         {activeTab === 'folha' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900 p-12 rounded-[4rem] text-white shadow-3xl">
                  <div>
                     <h2 className="text-3xl font-black uppercase tracking-tight">Processamento de Salários</h2>
                     <p className="text-zinc-400 text-lg font-medium">Ciclo: {new Date().toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}</p>
                     <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest mt-2">Empresa: {currentEmpresa.nome}</p>
                  </div>
                  <button
                     onClick={runPayroll}
                     disabled={isProcessingPayroll}
                     className="px-10 py-5 bg-yellow-500 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-3 shadow-xl shadow-yellow-500/20 disabled:opacity-50"
                  >
                     {isProcessingPayroll ? <RefreshCw className="animate-spin" /> : <RefreshCw size={20} />}
                     {isProcessingPayroll ? 'Processando Lote...' : 'Executar Lote Completo'}
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {folhas.map(f => (
                     <div key={f.id} className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                              <Users size={28} />
                           </div>
                           <div>
                              <h4 className="font-black text-zinc-900 text-lg leading-none mb-1">{f.funcionario_nome}</h4>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base: {formatAOA(f.salario_base)}</p>
                           </div>
                        </div>
                        <div className="hidden lg:grid grid-cols-3 gap-12 text-center border-x border-zinc-50 px-12 mx-8">
                           <div>
                              <p className="text-[9px] font-black text-zinc-300 uppercase mb-1">INSS (3%)</p>
                              <p className="text-sm font-bold text-red-400">-{formatAOA(f.inss_trabalhador)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-300 uppercase mb-1">IRT / Tax</p>
                              <p className="text-sm font-bold text-red-400">-{formatAOA(f.irt)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Empresa (8%)</p>
                              <p className="text-sm font-bold text-zinc-400">{formatAOA(f.inss_empresa)}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Líquido a Receber</p>
                           <p className="text-2xl font-black text-zinc-900">{formatAOA(f.salario_liquido)}</p>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-3 text-zinc-300 hover:text-zinc-600 transition-colors"><Printer size={20} /></button>
                           <button className="p-3 text-zinc-300 hover:text-sky-600 transition-colors"><FileCheck size={20} /></button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* --- FISCAL --- */}
         {activeTab === 'fiscal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
               <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-sky-100">
                  <h3 className="text-xl font-black text-zinc-900 mb-10 uppercase tracking-tight flex items-center gap-3">
                     <Calendar className="text-yellow-500" /> Agenda Fiscal Março
                  </h3>
                  <div className="space-y-4">
                     {[
                        { t: 'IVA - Declaração Periódica', d: '2024-03-25', v: financeReports.receitaTotal * 0.14 },
                        { t: 'INSS - Guia de Pagamento', d: '2024-03-10', v: folhas.reduce((a, b) => a + b.inss_trabalhador + b.inss_empresa, 0) },
                        { t: 'IRT - Retenções na Fonte', d: '2024-03-30', v: folhas.reduce((a, b) => a + b.irt, 0) },
                     ].map((o, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Landmark size={20} /></div>
                              <div><p className="font-black text-sm text-zinc-900">{o.t}</p><p className="text-[10px] font-black text-zinc-400 uppercase">Vence: {new Date(o.d).toLocaleDateString()}</p></div>
                           </div>
                           <p className="font-black text-zinc-900">{formatAOA(o.v)}</p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-zinc-900 p-12 rounded-[4rem] text-white shadow-2xl flex flex-col justify-between overflow-hidden relative print-hidden">
                  <FileText size={180} className="absolute -right-4 -bottom-4 opacity-5" />
                  <div className="space-y-6">
                     <h3 className="text-xl font-black uppercase tracking-tight">Carga Tributária Estimada</h3>
                     <div className="space-y-8">
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase"><span>IVA (14%)</span><span>{formatAOA(financeReports.receitaTotal * 0.14)}</span></div>
                           <div className="h-2 bg-white/10 rounded-full"><div className="h-full bg-yellow-500 w-[60%]"></div></div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase"><span>INSS Total</span><span>{formatAOA(folhas.reduce((a, b) => a + b.inss_empresa + b.inss_trabalhador, 0))}</span></div>
                           <div className="h-2 bg-white/10 rounded-full"><div className="h-full bg-sky-400 w-[45%]"></div></div>
                        </div>
                     </div>
                  </div>
                  <button
                     onClick={handleExportFiscal}
                     disabled={isExportingFiscal}
                     className="w-full mt-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                     {isExportingFiscal ? <RefreshCw className="animate-spin" /> : <Download size={20} />}
                     {isExportingFiscal ? 'Gerando Mapas...' : 'Exportar Mapas Fiscais (PDF)'}
                  </button>
               </div>
            </div>
         )}

         {/* --- MODAL RELATÓRIO COMPLETO --- */}
         {showReportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                        <FileText className="text-yellow-500" /> Relatório Financeiro Detalhado
                     </h2>
                     <button onClick={() => setShowReportModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-10 space-y-8">
                     <div className="grid grid-cols-2 gap-8">
                        <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                           <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Activo Total</p>
                           <p className="text-2xl font-black text-green-900">{formatAOA(financeReports.ativos)}</p>
                        </div>
                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                           <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Passivo Total</p>
                           <p className="text-2xl font-black text-red-900">{formatAOA(financeReports.passivos)}</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h3 className="text-sm font-black text-zinc-900 uppercase">Indicadores de Liquidez</h3>
                        <div className="space-y-2">
                           <div className="flex justify-between text-sm">
                              <span className="text-zinc-500 font-bold">Liquidez Geral</span>
                              <span className="font-black text-zinc-900">1.45</span>
                           </div>
                           <div className="w-full bg-zinc-100 rounded-full h-2">
                              <div className="bg-sky-500 h-2 rounded-full w-[60%]"></div>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-sm">
                              <span className="text-zinc-500 font-bold">Solvência</span>
                              <span className="font-black text-zinc-900">2.10</span>
                           </div>
                           <div className="w-full bg-zinc-100 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full w-[80%]"></div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-zinc-900 text-white p-6 rounded-3xl flex justify-between items-center">
                        <div>
                           <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Capital Próprio</p>
                           <p className="text-xl font-bold mt-1">Reservas: {formatAOA(financeReports.capital)}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resultado Líquido</p>
                           <p className={`text-2xl font-black ${financeReports.lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatAOA(financeReports.lucroLiquido)}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- MODAL NOVO LANÇAMENTO (DIÁRIO) --- */}
         {showEntryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                        <BookOpen className="text-yellow-500" /> Novo Lançamento Contábil
                     </h2>
                     <button onClick={() => setShowEntryModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleNewEntry} className="p-8 space-y-6">
                     <Input name="descricao" label="Histórico / Descrição" required
                        value={newEntry.descricao} onChange={e => setNewEntry({ ...newEntry, descricao: e.target.value })}
                        placeholder="Ex: Pagamento de Fornecedor X"
                     />
                     <div className="grid grid-cols-2 gap-6">
                        <Select name="contaDebito" label="Conta a Debitar"
                           value={newEntry.contaDebito} onChange={e => setNewEntry({ ...newEntry, contaDebito: e.target.value })}
                           options={PLANO_CONTAS.filter(c => c.natureza === 'Devedora' || c.tipo === 'Despesa').map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nome}` }))}
                        />
                        <Select name="contaCredito" label="Conta a Creditar"
                           value={newEntry.contaCredito} onChange={e => setNewEntry({ ...newEntry, contaCredito: e.target.value })}
                           options={PLANO_CONTAS.filter(c => c.natureza === 'Credora' || c.codigo === '1.1').map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nome}` }))}
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="valor" label="Valor (AOA)" type="number" required
                           value={newEntry.valor} onChange={e => setNewEntry({ ...newEntry, valor: Number(e.target.value) })}
                        />
                        <Input name="data" label="Data" type="date" required
                           value={newEntry.data} onChange={e => setNewEntry({ ...newEntry, data: e.target.value })}
                        />
                     </div>
                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all">
                        <Save size={18} /> Confirmar Lançamento
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default AccountingPage;
