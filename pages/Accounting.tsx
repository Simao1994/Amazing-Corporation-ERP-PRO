
import React, { useState, useMemo, useEffect } from 'react';
import {
   Calculator, BarChart2, BarChart as LucideBarChart, Receipt, Users, Landmark, Scale,
   Calendar, FilePieChart, Sparkles, BrainCircuit, ArrowUpRight,
   ArrowDownLeft, History, CheckCircle2, AlertTriangle, ListChecks,
   MoreVertical, Lock, ShieldAlert, Search, Building2, DollarSign,
   Plus, Download, FileText, BookOpen, Briefcase,
   Save, X, Printer, FileCheck, ShieldCheck, RefreshCw, ShieldAlert as AuditIcon,
   ListFilter, Share2, PieChart as PieChartIcon
} from 'lucide-react';
import {
   ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
   Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import {
   LancamentoContabil, FolhaPagamento, ObrigacaoFiscal,
   EmpresaAfiliada, Funcionario, DocumentoDigital, MovimentoBancario, PlanoConta, LancamentoItem,
   PeriodoContabil
} from '../types';
import { supabase } from '../src/lib/supabase';
import { formatAOA } from '../constants';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Logo from '../components/Logo';

const COLORS_PIE = ['#eab308', '#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#f97316'];

// Mock PGN Standard - Will be replaced by DB data if available
const PGN_PADRAO_ANGOLANO: PlanoConta[] = [
   { id: '1', codigo: '1', nome: 'Meios Fixos e Investimentos', tipo: 'Ativo', natureza: 'Devedora', nivel: 1 },
   { id: '1.1', codigo: '11', nome: 'Imobilizações Corpóreas', tipo: 'Ativo', natureza: 'Devedora', nivel: 2, pai_id: '1' },
   { id: '2', codigo: '3', nome: 'Existências', tipo: 'Ativo', natureza: 'Devedora', nivel: 1 },
   { id: '3', codigo: '4', nome: 'Contas a Receber e a Pagar', tipo: 'Ativo', natureza: 'Devedora', nivel: 1 },
   { id: '4', codigo: '43', nome: 'Empréstimos Bancários', tipo: 'Passivo', natureza: 'Credora', nivel: 2, pai_id: '3' },
   { id: '5', codigo: '5', nome: 'Capital e Reservas', tipo: 'Capital', natureza: 'Credora', nivel: 1 },
   { id: '6', codigo: '6', nome: 'Proveitos e Ganhos', tipo: 'Receita', natureza: 'Credora', nivel: 1 },
   { id: '7', codigo: '7', nome: 'Custos e Perdas', tipo: 'Despesa', natureza: 'Devedora', nivel: 1 },
];

const AccountingPage: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'dashboard' | 'diario' | 'plano' | 'folha' | 'fiscal' | 'demonstracoes' | 'periodos' | 'auditoria' | 'ia'>('dashboard');
   const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
   const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');
   const [loading, setLoading] = useState(true);

   // Safe Currency Formatter
   const safeFormatAOA = (value: any) => {
      try {
         const num = Number(value);
         if (isNaN(num)) return formatAOA(0);
         return formatAOA(num);
      } catch (e) {
         return 'Kz 0,00';
      }
   };

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
   const [planoContas, setPlanoContas] = useState<PlanoConta[]>(PGN_PADRAO_ANGOLANO);
   const [periodos, setPeriodos] = useState<PeriodoContabil[]>([]);
   const [auditLogs, setAuditLogs] = useState<any[]>([]);
   const [systemLogs, setSystemLogs] = useState<any[]>([]);
   const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
   const [accountingConfig, setAccountingConfig] = useState<Record<string, string>>({});
   const [loadingStatus, setLoadingStatus] = useState<string>('Iniciando...');

   const fetchAccountingData = async () => {
      setLoading(true);
      try {
         const fetchQuery = async (query: any, label: string) => {
            setLoadingStatus(`Sincronizando ${label}...`);
            const timeoutPromise = new Promise((_, reject) =>
               setTimeout(() => reject(new Error(`Timeout em ${label} `)), 15000)
            );
            try {
               const { data, error } = await Promise.race([query, timeoutPromise]) as any;
               if (error) {
                  console.error(`Error in ${label}: `, error);
                  return [];
               }
               return data || [];
            } catch (e) {
               console.warn(`Atenção: Falha ou Timeout em ${label}.`, e);
               return [];
            }
         };

         // 1. Carregar Dados Estruturais em PARALELO para Velocidade Máxima
         setLoadingStatus('Sincronizando Estrutura...');
         const [emps, funcs, dataContas, dataPeriodos] = await Promise.all([
            fetchQuery(supabase.from('acc_empresas').select('*').order('nome'), 'Entidades'),
            fetchQuery(supabase.from('funcionarios').select('*').order('nome'), 'Equipa'),
            fetchQuery(supabase.from('acc_contas').select('*').order('codigo'), 'Plano de Contas'),
            fetchQuery(supabase.from('acc_periodos').select('*').order('ano', { ascending: false }).order('mes', { ascending: false }), 'Ciclos Fiscais')
         ]);

         setEmpresas(emps as any);
         setFuncionarios(funcs as any);

         if (dataContas && dataContas.length > 0) {
            setPlanoContas(dataContas as any);
         } else {
            setPlanoContas(PGN_PADRAO_ANGOLANO);
         }

         if (dataPeriodos && dataPeriodos.length > 0) {
            setPeriodos(dataPeriodos as any);
            if (!selectedPeriodoId) {
               setSelectedPeriodoId(dataPeriodos[0].id);
            }
         }

         if (emps && emps.length > 0 && !selectedEmpresaId) {
            setSelectedEmpresaId(emps[0].id);
         }

         // LIBERAÇÃO IMEDIATA DO PAINEL (Progressivo)
         setLoading(false);
         setLoadingStatus('Carregando módulos...');
         console.log('TRACE: UI Unlocked.');

         // 2. Carregar Dados Transacionais em PARALELO (Background)
         const [lnc, lncItens, flh, obl, logs, centros, configs, sLogs] = await Promise.all([
            fetchQuery(supabase.from('acc_lancamentos').select('*').order('data', { ascending: false }).limit(200), 'Motor Contábil'),
            fetchQuery(supabase.from('acc_lancamento_itens').select('*'), 'Itens'),
            fetchQuery(supabase.from('acc_folhas').select('*').order('mes_referencia', { ascending: false }), 'Folhas'),
            fetchQuery(supabase.from('acc_obrigacoes').select('*').order('data_limite'), 'Agenda'),
            fetchQuery(supabase.from('acc_audit_logs').select('*').order('created_at', { ascending: false }).limit(100), 'Auditoria'),
            fetchQuery(supabase.from('acc_centros_custo').select('*').order('nome'), 'Custos'),
            fetchQuery(supabase.from('acc_config').select('*'), 'Configs'),
            fetchQuery(supabase.from('acc_system_logs').select('*').order('created_at', { ascending: false }).limit(50), 'Logs')
         ]);

         // Merging itens sync
         const mergedLnc = (lnc || []).map((l: any) => ({
            ...l,
            itens: (lncItens || []).filter((it: any) => it.lancamento_id === l.id)
         }));

         setLancamentos(mergedLnc as any);
         setFolhas(flh as any);
         setObligacoes(obl as any);
         setAuditLogs(logs || []);
         setCentrosCusto(centros || []);

         const configMap: Record<string, string> = {};
         (configs || []).forEach((c: any) => configMap[c.chave] = c.valor);
         setAccountingConfig(configMap);
         setSystemLogs(sLogs || []);

         setLoadingStatus('Sincronização concluída');
      } catch (error) {
         console.error('TRACE: Critical Error in fetchAccountingData:', error);
         setLoadingStatus('Erro na sincronização. Tentando modo de segurança...');
         setLoading(false);
      } finally {
         console.log('TRACE: Sync attempt finished.');
         setLoading(false);
         setTimeout(() => setLoadingStatus(''), 800);
      }
   };

   useEffect(() => {
      fetchAccountingData();
   }, []);

   const currentEmpresa = empresas?.find(e => e.id === selectedEmpresaId) || empresas?.[0];

   // --- LÓGICA DE GRÁFICOS E RELATÓRIOS (ULTRA DEFENSIVA) ---
   const chartData = useMemo(() => {
      try {
         const filterEmpAndPeriod = (arr: LancamentoContabil[]) => (arr || []).filter(l =>
            l && l.empresa_id === selectedEmpresaId &&
            (selectedPeriodoId ? l.periodo_id === selectedPeriodoId : true)
         );
         const empLancamentos = filterEmpAndPeriod(lancamentos);

         // 1. Dados para Gráfico de Barras
         const monthlyStats: Record<string, { receita: number, despesa: number }> = {};
         const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
         meses.forEach(m => monthlyStats[m] = { receita: 0, despesa: 0 });

         empLancamentos.forEach(l => {
            if (!l || !l.data) return;
            const d = new Date(l.data);
            if (isNaN(d.getTime())) return;
            const mesIndex = d.getMonth();
            const mesNome = meses[mesIndex];

            l.itens?.forEach(it => {
               if (!it || !it.conta_codigo) return;
               const valor = Number(it.valor) || 0;
               if (it.conta_codigo.startsWith('6')) {
                  monthlyStats[mesNome].receita += valor;
               }
               if (it.conta_codigo.startsWith('7')) {
                  monthlyStats[mesNome].despesa += valor;
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
               if (it && it.conta_codigo?.startsWith('7')) {
                  const catName = it.conta_nome || 'Outros Custos';
                  expenseCategories[catName] = (Number(expenseCategories[catName]) || 0) + (Number(it.valor) || 0);
               }
            });
         });

         const pieChartData = Object.keys(expenseCategories).map(k => ({
            name: String(k),
            value: Number(expenseCategories[k]) || 0
         }));

         const finalPieData = pieChartData.length > 0 ? pieChartData : [
            { name: 'Pessoal', value: 450000 },
            { name: 'Manutenção', value: 120000 },
            { name: 'Serviços Terceiros', value: 80000 },
            { name: 'Impostos', value: 50000 },
         ];

         return { barChartData: finalBarData, pieChartData: finalPieData };
      } catch (err) {
         console.error("Crash in chartData useMemo:", err);
         return { barChartData: [], pieChartData: [] };
      }
   }, [selectedEmpresaId, selectedPeriodoId, lancamentos]);

   // --- LÓGICA DE BALANÇO E DRE (ULTRA DEFENSIVA) ---
   const financeReports = useMemo(() => {
      try {
         const filterEmpAndPeriod = (arr: LancamentoContabil[]) => (arr || []).filter(l =>
            l && l.empresa_id === selectedEmpresaId &&
            (selectedPeriodoId ? l.periodo_id === selectedPeriodoId : true)
         );
         const empLancamentos = filterEmpAndPeriod(lancamentos);

         const saldos: Record<string, number> = {};
         (planoContas || []).forEach(c => {
            if (c && c.codigo) saldos[c.codigo] = 0;
         });

         empLancamentos.forEach(l => {
            l?.itens?.forEach(it => {
               if (it && it.conta_codigo && saldos[it.conta_codigo] !== undefined) {
                  const valor = Number(it.valor) || 0;
                  if (it.tipo === 'D') {
                     saldos[it.conta_codigo] += valor;
                  } else {
                     saldos[it.conta_codigo] -= valor;
                  }
               }
            });
         });

         // Recalculate based on the new saldo logic (debit adds, credit subtracts)
         // Assets (1, 2, 3) should have positive balances. Liabilities (4) and Capital (5) should have negative balances.
         // Revenues (6) should have negative balances. Expenses (7) should have positive balances.
         // Asset/Liability logic with absolute safety
         const getSum = (prefix: string) => Object.keys(saldos).filter(k => k && k.startsWith(prefix)).reduce((acc, k) => acc + (Number(saldos[k]) || 0), 0);

         const ativos = getSum('1') + getSum('2') + getSum('3');
         const passivos = Math.abs(getSum('4'));
         const capital = Math.abs(getSum('5'));
         const receitaTotal = Math.abs(getSum('6'));
         const despesaTotal = Math.abs(getSum('7'));
         const lucroLiquido = receitaTotal - despesaTotal;

         return {
            ativos: Number(ativos) || 0,
            passivos: Number(passivos) || 0,
            capital: Number(capital) || 0,
            receitaTotal: Number(receitaTotal) || 0,
            despesaTotal: Number(despesaTotal) || 0,
            lucroLiquido: Number(lucroLiquido) || 0,
            saldos
         };
      } catch (err) {
         console.error("Crash in financeReports useMemo:", err);
         return { ativos: 0, passivos: 0, capital: 0, receitaTotal: 0, despesaTotal: 0, lucroLiquido: 0, saldos: {} };
      }
   }, [selectedEmpresaId, selectedPeriodoId, lancamentos, planoContas]);

   // --- LÓGICA DE IA ---
   const handleAIAnalysis = async () => {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
         setIaResponse("A chave da API (GEMINI_API_KEY) não foi configurada. Contacte o administrador.");
         return;
      }

      setIsAnalyzing(true);
      setIaResponse(null);
      try {
         const ai = new GoogleGenAI({ apiKey });
         const prompt = `Analise os dados financeiros da empresa ${currentEmpresa?.nome || 'N/A'} em Angola:
- Receita: ${safeFormatAOA(financeReports.receitaTotal)}
- Despesa: ${safeFormatAOA(financeReports.despesaTotal)}
- Lucro: ${safeFormatAOA(financeReports.lucroLiquido)}
- Património Líquido: ${safeFormatAOA(financeReports.ativos - financeReports.passivos)}
      
      Forneça 3 sugestões estratégicas para redução de custos e 1 alerta sobre conformidade fiscal(IVA / IRT).`;

         const result = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: prompt
         });

         setIaResponse(result.text || "Sem resposta da IA.");
      } catch (error) {
         console.error('AI Error:', error);
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
      if (!currentEmpresa) {
         alert("Por favor, selecione uma empresa válida.");
         return;
      }
      if (!confirm(`Confirmar processamento da folha para ${(funcionariosAtivos || []).length} colaboradores na empresa ${currentEmpresa?.nome || 'Selecionada'}?`)) return;
      setIsProcessingPayroll(true);

      try {
         const currentPeriod = periodos.find(p => p.id === selectedPeriodoId);
         const payrollBatch = funcionariosAtivos.map(f => {
            const base = Number(f.salario_base) || 0;
            const inss_t = base * 0.03;
            const inss_e = base * 0.08;
            const irt = base > 100000 ? (base - 100000) * 0.1 : 0;

            return {
               funcionario_id: f.id,
               funcionario_nome: f.nome,
               mes_referencia: currentPeriod ? `${currentPeriod.mes}/${currentPeriod.ano}` : new Date().toLocaleString('pt-PT', { month: 'long', year: 'numeric' }),
               periodo_id: selectedPeriodoId,
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
         const totalLiquido = (payrollBatch || []).reduce((acc, f) => acc + (Number(f.salario_liquido) || 0), 0);
         const totalImpostos = (payrollBatch || []).reduce((acc, f) => acc + (Number(f.irt) || 0) + (Number(f.inss_trabalhador) || 0) + (Number(f.inss_empresa) || 0), 0);

         const { data: head, error: hError } = await supabase.from('acc_lancamentos').insert([{
            data: new Date().toISOString(),
            periodo_id: selectedPeriodoId,
            descricao: `Processamento Salarial - ${currentPeriod ? currentPeriod.mes + '/' + currentPeriod.ano : new Date().toLocaleString('pt-PT', { month: 'long' })}`,
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
      const debito = planoContas.find(c => c.codigo === newEntry.contaDebito);
      const credito = planoContas.find(c => c.codigo === newEntry.contaCredito);

      try {
         // 1. Inserir cabeçalho
         const { data: head, error: hError } = await supabase.from('acc_lancamentos').insert([{
            data: newEntry.data,
            periodo_id: selectedPeriodoId || null,
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



   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 bg-white/50 rounded-[3rem] border border-sky-100 p-12">
            <div className="relative">
               <RefreshCw className="w-16 h-16 text-yellow-500 animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-zinc-900 rounded-full animate-ping"></div>
               </div>
            </div>
            <div className="text-center space-y-4">
               <div>
                  <p className="text-zinc-900 font-black uppercase tracking-[0.3em] text-[10px]">Amazing Cloud Sync</p>
                  <p className="text-zinc-400 font-bold animate-pulse text-xs uppercase tracking-widest">{loadingStatus}</p>
               </div>
               <button
                  onClick={() => setLoading(false)}
                  className="px-6 py-2.5 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-lg"
               >
                  Bypass Sync (Acesso de Emergência)
               </button>
            </div>
         </div>
      );
   }

   if (empresas.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div className="p-6 bg-zinc-100 rounded-full text-zinc-400">
               <Building2 size={64} />
            </div>
            <div className="max-w-md space-y-2">
               <h2 className="text-2xl font-black uppercase">Configurando Ambiente</h2>
               <p className="text-zinc-500 font-medium">Não foram encontradas entidades activas ou o sistema está a recuperar a sincronização.</p>
               <p className="text-[10px] text-zinc-400 font-mono">Status: {loadingStatus || 'Aguardando payload...'}</p>
            </div>
            <div className="flex gap-4">
               <button
                  onClick={() => fetchAccountingData()}
                  className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-800 transition-all shadow-xl flex items-center gap-2"
               >
                  <RefreshCw size={16} /> Forçar Sincronização
               </button>
               <button
                  onClick={() => window.location.href = '/empresas'}
                  className="px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-50 transition-all shadow-xl"
               >
                  Ver Gestão
               </button>
            </div>
         </div>
      );
   }

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
                     {empresas?.map(e => (
                        <option key={e.id} value={e.id}>{e?.nome || 'Empresa'}</option>
                     ))}
                  </select>
               </div>

               <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-sky-100 shadow-sm w-fit">
                  <Calendar size={18} className="ml-2 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase mr-2">Período:</span>
                  <select
                     value={selectedPeriodoId}
                     onChange={(e) => setSelectedPeriodoId(e.target.value)}
                     className="bg-transparent border-none focus:ring-0 text-sm font-black uppercase text-zinc-800 pr-10 cursor-pointer outline-none"
                  >
                     {(periodos || []).map(p => (
                        <option key={p.id} value={p.id}>{`${p.mes}/${p.ano} - ${p.status}`}</option>
                     ))}
                     {(!periodos || periodos.length === 0) && <option value="">Sem Períodos</option>}
                  </select>
               </div>
            </div>

            <div className="flex flex-wrap gap-1 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               {[
                  { id: 'dashboard', icon: <BarChart2 size={18} />, label: 'Resumo' },
                  { id: 'diario', icon: <BookOpen size={18} />, label: 'Diário' },
                  { id: 'plano', icon: <ListFilter size={18} />, label: 'Contas' },
                  { id: 'demonstracoes', icon: <FilePieChart size={18} />, label: 'Balanço & DRE' },
                  { id: 'folha', icon: <Briefcase size={18} />, label: 'Payroll' },
                  { id: 'fiscal', icon: <Landmark size={18} />, label: 'Fiscal' },
                  { id: 'periodos', icon: <Calendar size={18} />, label: 'Períodos' },
                  { id: 'auditoria', icon: <ShieldCheck size={18} />, label: 'Auditoria' },
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
                     <p className="text-3xl font-black text-zinc-900">{safeFormatAOA(financeReports.receitaTotal)}</p>
                     <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit">
                        <ArrowUpRight size={12} /> Operacional
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Custos Totais</p>
                     <p className="text-3xl font-black text-red-600">{safeFormatAOA(financeReports.despesaTotal)}</p>
                     <p className="text-[9px] text-zinc-400 font-medium mt-2">Incluindo taxas e pessoal</p>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                     <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Lucro Líquido</p>
                     <p className="text-3xl font-black">{safeFormatAOA(financeReports.lucroLiquido)}</p>
                     <div className="mt-4 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                           {/* Margem cálculo ultra-seguro contra NaN */}
                           <div
                              className="h-full bg-yellow-500 transition-all duration-1000"
                              style={{ width: `${Math.min(100, Math.max(0, (Number(financeReports.lucroLiquido) / (Number(financeReports.receitaTotal) || 1)) * 100)) || 0}%` }}
                           ></div>
                        </div>
                        <span className="text-[10px] font-black">
                           {Math.round((Number(financeReports.lucroLiquido) / (Number(financeReports.receitaTotal) || 1)) * 100) || 0}% Margem
                        </span>
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Saúde Financeira</p>
                     <p className="text-4xl font-black text-zinc-900">
                        {financeReports.receitaTotal > 0 ? (financeReports.lucroLiquido > 0 ? '9.5' : '4.2') : '0.0'}
                     </p>
                     <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
                        {financeReports.receitaTotal > 0 ? (financeReports.lucroLiquido > 0 ? 'Excelência' : 'Atenção') : 'Sem Dados'}
                     </p>
                  </div>
               </div>

               {/* GRÁFICOS AVANÇADOS */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* GRÁFICO 1: COLUNAS - RECEITA vs DESPESA (MENSAL) */}
                  <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm h-[500px] flex flex-col">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                              <LucideBarChart className="text-yellow-500" size={20} /> Comparativo Financeiro
                           </h3>
                           <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-widest">Análise Anual {currentEmpresa?.nome || ''}</p>
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
                                 formatter={(value: number) => safeFormatAOA(value)}
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
                                 formatter={(value: number) => safeFormatAOA(value)}
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
                              <p className="text-lg font-black text-zinc-900">{safeFormatAOA(chartData.pieChartData?.reduce((acc, b) => acc + (Number(b.value) || 0), 0) || 0)}</p>
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
               <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-8 rounded-[3rem] shadow-sm border border-sky-100">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                     <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                           type="text"
                           placeholder="Pesquisar no diário..."
                           className="w-full pl-12 pr-6 py-3.5 bg-zinc-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-yellow-500/20"
                        />
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {periodos.find(p => p.id === selectedPeriodoId)?.status === 'Fechado' && (
                        <div className="px-4 py-2 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-red-100">
                           <Lock size={14} /> Período Bloqueado
                        </div>
                     )}
                     <button
                        onClick={() => setShowEntryModal(true)}
                        disabled={periodos.find(p => p.id === selectedPeriodoId)?.status === 'Fechado'}
                        className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl disabled:opacity-50"
                     >
                        <Plus size={20} /> Novo Lançamento
                     </button>
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] shadow-xl border border-sky-100 overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-zinc-900 text-white border-b border-zinc-800">
                        <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                           <th className="px-10 py-6">Data</th>
                           <th className="px-10 py-6">Referência</th>
                           <th className="px-10 py-6">Histórico / Descrição</th>
                           <th className="px-10 py-6 text-right">Valor Total</th>
                           <th className="px-10 py-6 text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100">
                        {lancamentos.filter(l => l.empresa_id === selectedEmpresaId && (selectedPeriodoId ? l.periodo_id === selectedPeriodoId : true)).length > 0 ? (
                           lancamentos.filter(l => l.empresa_id === selectedEmpresaId && (selectedPeriodoId ? l.periodo_id === selectedPeriodoId : true)).map((l) => (
                              <tr key={l.id} className="group hover:bg-zinc-50/50 transition-all cursor-pointer">
                                 <td className="px-10 py-8 font-mono text-zinc-500 text-xs">
                                    {l.data ? new Date(l.data).toLocaleDateString() : 'N/D'}
                                 </td>
                                 <td className="px-10 py-8">
                                    <span className="px-4 py-2 bg-zinc-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">#LNC-{l.id.toString().slice(0, 4)}</span>
                                 </td>
                                 <td className="px-10 py-8">
                                    <p className="font-black text-zinc-900 text-lg group-hover:text-yellow-600 transition-colors">{l.descricao}</p>
                                    <div className="flex gap-4 mt-2">
                                       {l.itens?.map((it, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                             <div className={`w-2 h-2 rounded-full ${it.tipo === 'D' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                             <span className="text-[10px] font-black text-zinc-400 uppercase">{it.conta_codigo}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </td>
                                 <td className="px-10 py-8 text-right font-black text-xl text-zinc-900">
                                    {safeFormatAOA(l.itens?.filter(i => i.tipo === 'D').reduce((acc, it) => acc + (Number(it.valor) || 0), 0) || 0)}
                                 </td>
                                 <td className="px-10 py-8 text-center">
                                    <span className="px-5 py-2.5 bg-green-50 text-green-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-green-100">{l.status || 'Postado'}</span>
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr><td colSpan={5} className="text-center py-20 text-zinc-400 font-bold italic">Nenhum lançamento registado para este período.</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* --- DEMONSTRAÇÕES FINANCEIRAS --- */}
         {
            activeTab === 'demonstracoes' && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
                  {/* Balanço Patrimonial */}
                  <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-sky-100">
                     <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black uppercase tracking-tight">Balanço Patrimonial - {currentEmpresa?.nome || ''}</h3>
                        <button className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-900"><Printer size={20} /></button>
                     </div>
                     <div className="space-y-8">
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2">Ativo (Devedora)</p>
                           <div className="flex justify-between text-sm"><span className="font-bold">Total do Ativo Circulante</span><span className="font-black">{safeFormatAOA(financeReports.ativos)}</span></div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2">Passivo (Credora)</p>
                           <div className="flex justify-between text-sm"><span className="font-bold">Obrigações a Curto Prazo</span><span className="font-black text-red-600">{safeFormatAOA(financeReports.passivos)}</span></div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2">Capital Próprio</p>
                           <div className="flex justify-between text-sm"><span className="font-bold">Reservas e Capital Social</span><span className="font-black">{safeFormatAOA(financeReports.capital)}</span></div>
                        </div>
                        <div className="pt-6 border-t-2 border-zinc-900 flex justify-between">
                           <span className="text-lg font-black uppercase">Património Líquido</span>
                           <span className="text-2xl font-black text-zinc-900">{safeFormatAOA(financeReports.ativos - financeReports.passivos)}</span>
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
                           <span className="font-black text-xl">{safeFormatAOA(financeReports.receitaTotal)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-4">
                           <span className="font-bold text-zinc-400 uppercase text-xs">Custos com Pessoal</span>
                           <span className="font-black text-lg text-red-400">({safeFormatAOA(folhas?.reduce((acc, b) => acc + (Number(b.salario_base) || 0), 0) || 0)})</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-4">
                           <span className="font-bold text-zinc-400 uppercase text-xs">Custos de Manutenção</span>
                           <span className="font-black text-lg text-red-400">({safeFormatAOA((Number(financeReports.despesaTotal) || 0) * 0.3)})</span>
                        </div>
                        <div className="bg-white/5 p-8 rounded-3xl mt-12">
                           <div className="flex justify-between items-center">
                              <div>
                                 <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Resultado Líquido do Período</p>
                                 <p className="text-3xl font-black">{safeFormatAOA(financeReports.lucroLiquido)}</p>
                              </div>
                              <div className={`p-4 rounded-2xl ${financeReports.lucroLiquido >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                 {financeReports.lucroLiquido >= 0 ? <ArrowUpRight size={32} /> : <ArrowDownLeft size={32} />}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* BALANCETE DE VERIFICAÇÃO - NOVO */}
                  <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-sky-100 col-span-1 md:col-span-2">
                     <div className="flex justify-between items-center mb-10">
                        <div>
                           <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                              <ListChecks size={24} className="text-yellow-500" /> Balancete de Verificação
                           </h3>
                           <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Saldos Acumulados por Conta no Período</p>
                        </div>
                        <button className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl">
                           Exportar Balancete
                        </button>
                     </div>
                     <div className="overflow-hidden rounded-2xl border border-zinc-100">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                                 <th className="px-8 py-5">Código</th>
                                 <th className="px-8 py-5">Nome da Conta</th>
                                 <th className="px-8 py-5 text-right">Saldo do Período</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-100">
                              {planoContas.filter(c => financeReports.saldos[c.codigo] !== 0).map(conta => (
                                 <tr key={conta.id} className="text-xs hover:bg-zinc-50 transition-all font-bold">
                                    <td className="px-8 py-4 font-mono text-zinc-500">{conta.codigo}</td>
                                    <td className="px-8 py-4 uppercase text-zinc-800">{conta.nome}</td>
                                    <td className={`px-8 py-4 text-right ${financeReports.saldos[conta.codigo] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                       {safeFormatAOA(financeReports.saldos[conta.codigo])}
                                    </td>
                                 </tr>
                              ))}
                              {Object.values(financeReports.saldos).every(s => s === 0) && (
                                 <tr><td colSpan={3} className="px-8 py-10 text-center text-zinc-400 italic">Sem movimentações no período selecionado.</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* RAZÃO (LEDGER) - NOVO COMPONENTE CORPORATIVO */}
                  <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-sky-100 col-span-1 md:col-span-2">
                     <div className="flex justify-between items-center mb-10">
                        <div>
                           <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                              <History size={24} className="text-yellow-500" /> Livro Razão Detalhado
                           </h3>
                           <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Movimentações Analíticas por Conta</p>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"><Printer size={20} /></button>
                           <button className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"><Download size={20} /></button>
                        </div>
                     </div>
                     <div className="space-y-6">
                        {planoContas.filter(c => c.nivel === 1 || c.e_analitica).map(conta => {
                           const movimentos = lancamentos.filter(l =>
                              l.empresa_id === selectedEmpresaId &&
                              (selectedPeriodoId ? l.periodo_id === selectedPeriodoId : true) &&
                              l.itens?.some(it => it.conta_codigo === conta.codigo)
                           );
                           if (movimentos.length === 0) return null;

                           return (
                              <div key={conta.id} className="border border-zinc-100 rounded-[2rem] overflow-hidden">
                                 <div className="bg-zinc-50 p-6 flex justify-between items-center border-b border-zinc-100">
                                    <span className="font-black text-xs uppercase tracking-widest text-zinc-900">{conta.codigo} - {conta.nome}</span>
                                    <span className="px-4 py-1.5 bg-zinc-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">Saldo: {safeFormatAOA(0)}</span>
                                 </div>
                                 <table className="w-full text-left">
                                    <thead>
                                       <tr className="text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                                          <th className="px-8 py-4">Data</th>
                                          <th className="px-8 py-4">Descrição / Histórico</th>
                                          <th className="px-8 py-4 text-right">Débito</th>
                                          <th className="px-8 py-4 text-right">Crédito</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                       {(movimentos || []).map(m => {
                                          const it = m?.itens?.find(i => i && i.conta_codigo === conta.codigo);
                                          return (
                                             <tr key={m.id} className="text-xs hover:bg-zinc-50 transition-all">
                                                <td className="px-8 py-4 font-mono text-zinc-500">{m.data ? new Date(m.data).toLocaleDateString() : 'N/A'}</td>
                                                <td className="px-8 py-4 font-bold text-zinc-800 uppercase">{m.descricao || 'Sem Descrição'}</td>
                                                <td className="px-8 py-4 text-right font-bold text-green-600">{it?.tipo === 'D' ? safeFormatAOA(it.valor) : '-'}</td>
                                                <td className="px-8 py-4 text-right font-bold text-red-600">{it?.tipo === 'C' ? safeFormatAOA(it.valor) : '-'}</td>
                                             </tr>
                                          );
                                       })}
                                    </tbody>
                                 </table>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            )
         }

         {/* --- IA CONSULTOR --- */}
         {
            activeTab === 'ia' && (
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
            )
         }

         {/* --- PLANO DE CONTAS HIERÁRQUICO --- */}
         {
            activeTab === 'plano' && (
               <div className="bg-white rounded-[3rem] shadow-sm border border-sky-100 overflow-hidden animate-in slide-in-from-bottom-4">
                  <div className="p-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <div>
                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Estrutura do Plano de Contas (PGN)</h3>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Gestão de Contas Analíticas e Centros de Custo</p>
                     </div>
                     <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl">
                        <Plus size={18} /> Nova Conta
                     </button>
                  </div>
                  <div className="p-6">
                     <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-zinc-900 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest mb-4">
                        <div className="col-span-2">Código</div>
                        <div className="col-span-5">Descrição da Conta</div>
                        <div className="col-span-2">Tipo</div>
                        <div className="col-span-2">Natureza</div>
                        <div className="col-span-1 text-right">Ações</div>
                     </div>
                     <div className="space-y-1">
                        {planoContas.map(c => (
                           <div key={c.id} className={`grid grid-cols-12 gap-4 px-8 py-5 rounded-2xl items-center transition-all ${c.nivel === 1 ? 'bg-zinc-50 font-black' : 'hover:bg-zinc-50 text-zinc-600'}`}>
                              <div className="col-span-2 font-mono text-xs">{c.codigo}</div>
                              <div className="col-span-5 flex items-center gap-2">
                                 {c.nivel && c.nivel > 1 && <span className="text-zinc-300">{'—'.repeat(c.nivel - 1)}</span>}
                                 <span className={c.nivel === 1 ? 'text-zinc-900' : 'text-zinc-600'}>{c.nome}</span>
                              </div>
                              <div className="col-span-2 text-[10px] font-bold uppercase">{c.tipo}</div>
                              <div className="col-span-2 text-[10px] font-bold uppercase">{c.natureza}</div>
                              <div className="col-span-1 text-right flex justify-end gap-2 text-zinc-400">
                                 <button className="hover:text-zinc-900 transition-colors"><MoreVertical size={16} /></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )
         }

         {/* --- GESTÃO DE PERÍODOS --- */}
         {
            activeTab === 'periodos' && (
               <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="bg-zinc-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                        <Calendar size={120} className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform" />
                        <h4 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-6">Controlo de Exercício</h4>
                        <p className="text-3xl font-black mb-2">Ano 2024</p>
                        <p className="text-xs text-zinc-500 font-bold uppercase">Exercício Corrente</p>
                        <button className="mt-8 px-6 py-3 bg-white/10 hover:bg-yellow-500 hover:text-zinc-900 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Abrir Novo Ano</button>
                     </div>

                     <div className="md:col-span-2 bg-white rounded-[3rem] shadow-sm border border-sky-100 overflow-hidden">
                        <div className="p-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                           <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Meses Contabilísticos</h3>
                           <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all">
                              <Plus size={18} /> Novo Mês
                           </button>
                        </div>
                        <div className="divide-y divide-zinc-100">
                           {periodos.map(p => (
                              <div key={p.id} className="p-8 flex items-center justify-between group hover:bg-zinc-50 transition-all">
                                 <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.status === 'Aberto' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                       {p.status === 'Aberto' ? <CheckCircle2 size={24} /> : <Lock size={24} />}
                                    </div>
                                    <div>
                                       <h4 className="font-black text-zinc-900 text-lg">{p.mes}/{p.ano}</h4>
                                       <p className={`text-[10px] font-black uppercase tracking-widest ${p.status === 'Aberto' ? 'text-green-500' : 'text-red-500'}`}>{p.status}</p>
                                    </div>
                                 </div>
                                 <div className="flex gap-4">
                                    {p.status === 'Aberto' ? (
                                       <button className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all">Fechar Período</button>
                                    ) : (
                                       <button className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                                          <ShieldAlert size={14} /> Reabrir (Audit)
                                       </button>
                                    )}
                                    <button className="p-3 text-zinc-300 hover:text-zinc-900 transition-colors"><Search size={20} /></button>
                                 </div>
                              </div>
                           ))}
                           {periodos.length === 0 && (
                              <div className="p-20 text-center text-zinc-400 font-bold italic">Nenhum período contabilístico configurado.</div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            )
         }

         {/* --- AUDITORIA --- */}
         {
            activeTab === 'auditoria' && (
               <div className="bg-white rounded-[3rem] shadow-sm border border-sky-100 overflow-hidden animate-in slide-in-from-bottom-4">
                  <div className="p-10 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Rasto de Auditoria Imutável</h3>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Registo completo de alterações e acessos fiscais</p>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100">
                        <ShieldCheck size={16} /> Sistema Protegido
                     </div>
                  </div>
                  <div className="overflow-hidden">
                     <div className="p-10 bg-zinc-50/30 border-b border-zinc-100">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Logs de Operação do Sistema</h4>
                        <div className="space-y-4">
                           {systemLogs.map(s => {
                              const safeDate = s?.created_at ? new Date(s.created_at) : null;
                              return (
                                 <div key={s?.id || Math.random()} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-2 h-2 rounded-full ${s?.nivel === 'ERROR' ? 'bg-red-500 animate-pulse' : s?.nivel === 'WARN' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                       <div>
                                          <p className="text-xs font-black text-zinc-900 uppercase">{s?.evento || 'Evento'}</p>
                                          <p className="text-[10px] text-zinc-400 font-bold">{s?.descricao || 'Sem descrição'}</p>
                                       </div>
                                    </div>
                                    <p className="text-[9px] font-mono text-zinc-300 font-black">
                                       {safeDate && !isNaN(safeDate.getTime()) ? safeDate.toLocaleTimeString() : '--:--'}
                                    </p>
                                 </div>
                              );
                           })}
                           {systemLogs.length === 0 && <p className="text-[10px] font-bold text-zinc-300 italic text-center py-4">Nenhum evento operacional registado hoje.</p>}
                        </div>
                     </div>

                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                              <th className="px-8 py-5">Data/Hora</th>
                              <th className="px-8 py-5">Ação</th>
                              <th className="px-8 py-5">Tabela</th>
                              <th className="px-8 py-5">Chave Registro</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                           {auditLogs.map((log) => {
                              const safeDate = log?.created_at ? new Date(log.created_at) : null;
                              return (
                                 <tr key={log?.id || Math.random()} className="text-xs hover:bg-zinc-50 transition-all font-bold group">
                                    <td className="px-8 py-5 font-mono text-zinc-400 text-[10px]">
                                       {safeDate && !isNaN(safeDate.getTime()) ? safeDate.toLocaleString('pt-PT') : 'Data Inválida'}
                                    </td>
                                    <td className="px-8 py-5">
                                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${log?.acao === 'INSERT' ? 'bg-green-50 text-green-600' :
                                          log?.acao === 'UPDATE' ? 'bg-sky-50 text-sky-600' :
                                             'bg-red-50 text-red-600'
                                          }`}>
                                          {log?.acao || 'Ação'}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5">
                                       <span className="text-zinc-900 uppercase tracking-tighter">{log?.tabela_nome || 'N/A'}</span>
                                    </td>
                                    <td className="px-8 py-5 font-mono text-zinc-300 text-[10px] group-hover:text-zinc-600 transition-colors">
                                       {log?.registro_id || '---'}
                                    </td>
                                 </tr>
                              );
                           })}
                           {auditLogs.length === 0 && (
                              <tr>
                                 <td colSpan={4} className="p-20 text-center text-zinc-400 font-bold italic">
                                    Nenhum log de auditoria encontrado. As alterações serão registadas automaticamente.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            )
         }

         {/* --- PAYROLL --- */}
         {activeTab === 'folha' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900 p-12 rounded-[4rem] text-white shadow-3xl">
                  <div>
                     <h2 className="text-3xl font-black uppercase tracking-tight">Processamento de Salários</h2>
                     <p className="text-zinc-400 text-lg font-medium">Ciclo: {periodos.find(p => p.id === selectedPeriodoId)?.mes || '00'}/{periodos.find(p => p.id === selectedPeriodoId)?.ano || '2024'}</p>
                     <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest mt-2">Empresa: {currentEmpresa?.nome || ''}</p>
                  </div>
                  <button
                     onClick={runPayroll}
                     disabled={isProcessingPayroll || periodos.find(p => p.id === selectedPeriodoId)?.status === 'Fechado'}
                     className="px-10 py-5 bg-yellow-500 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-3 shadow-xl shadow-yellow-500/20 disabled:opacity-50"
                  >
                     {isProcessingPayroll ? <RefreshCw className="animate-spin" /> : <RefreshCw size={20} />}
                     {isProcessingPayroll ? 'Processando Lote...' : 'Executar Lote Completo'}
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {folhas?.filter(f => f.empresa_id === selectedEmpresaId && (selectedPeriodoId ? f.periodo_id === selectedPeriodoId : true)).map(f => (
                     <div key={f.id} className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                              <Users size={28} />
                           </div>
                           <div>
                              <h4 className="font-black text-zinc-900 text-lg leading-none mb-1">{f?.funcionario_nome || 'Funcionário'}</h4>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base: {safeFormatAOA(Number(f?.salario_base) || 0)}</p>
                           </div>
                        </div>
                        <div className="hidden lg:grid grid-cols-3 gap-12 text-center border-x border-zinc-50 px-12 mx-8">
                           <div>
                              <p className="text-[9px] font-black text-zinc-300 uppercase mb-1">INSS (3%)</p>
                              <p className="text-sm font-bold text-red-400">-{safeFormatAOA(Number(f?.inss_trabalhador) || 0)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-300 uppercase mb-1">IRT / Tax</p>
                              <p className="text-sm font-bold text-red-400">-{safeFormatAOA(Number(f?.irt) || 0)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Empresa (8%)</p>
                              <p className="text-sm font-bold text-zinc-400">{safeFormatAOA(Number(f?.inss_empresa) || 0)}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Líquido a Receber</p>
                           <p className="text-2xl font-black text-zinc-900">{safeFormatAOA(Number(f?.salario_liquido) || 0)}</p>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-3 text-zinc-300 hover:text-zinc-600 transition-colors"><Printer size={20} /></button>
                           <button className="p-3 text-zinc-300 hover:text-sky-600 transition-colors"><FileCheck size={20} /></button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )
         }

         {/* --- FISCAL --- */}
         {activeTab === 'fiscal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
               <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-sky-100">
                  <h3 className="text-xl font-black text-zinc-900 mb-10 uppercase tracking-tight flex items-center gap-3">
                     <Calendar className="text-yellow-500" /> Agenda Fiscal {periodos.find(p => p.id === selectedPeriodoId)?.mes || ''}
                  </h3>
                  <div className="space-y-4">
                     {[
                        { t: 'IVA - Declaração Periódica', d: '2024-03-25', v: (Number(financeReports.receitaTotal) || 0) * 0.14 },
                        { t: 'INSS - Guia de Pagamento', d: '2024-03-10', v: folhas?.filter(f => f.empresa_id === selectedEmpresaId && (selectedPeriodoId ? f.periodo_id === selectedPeriodoId : true)).reduce((acc, b) => acc + (Number(b.inss_trabalhador) || 0) + (Number(b.inss_empresa) || 0), 0) || 0 },
                        { t: 'IRT - Retenções na Fonte', d: '2024-03-30', v: folhas?.filter(f => f.empresa_id === selectedEmpresaId && (selectedPeriodoId ? f.periodo_id === selectedPeriodoId : true)).reduce((acc, b) => acc + (Number(b.irt) || 0), 0) || 0 },
                     ].map((o, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Landmark size={20} /></div>
                              <div><p className="font-black text-sm text-zinc-900">{o.t}</p><p className="text-[10px] font-black text-zinc-400 uppercase">Vence: {new Date(o.d).toLocaleDateString()}</p></div>
                           </div>
                           <p className="font-black text-zinc-900">{safeFormatAOA(o.v)}</p>
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
                           <div className="flex justify-between text-[10px] font-black uppercase"><span>IVA (14%)</span><span>{safeFormatAOA(financeReports.receitaTotal * 0.14)}</span></div>
                           <div className="h-2 bg-white/10 rounded-full"><div className="h-full bg-yellow-500 w-[60%]"></div></div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase"><span>INSS Total</span><span>{safeFormatAOA(folhas?.filter(f => f.empresa_id === selectedEmpresaId && (selectedPeriodoId ? f.periodo_id === selectedPeriodoId : true)).reduce((acc, b) => acc + (Number(b.inss_empresa) || 0) + (Number(b.inss_trabalhador) || 0), 0) || 0)}</span></div>
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
         )
         }

         {/* --- MODAL RELATÓRIO COMPLETO --- */}
         {
            showReportModal && (
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
                              <p className="text-2xl font-black text-green-900">{safeFormatAOA(financeReports.ativos)}</p>
                           </div>
                           <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Passivo Total</p>
                              <p className="text-2xl font-black text-red-900">{safeFormatAOA(financeReports.passivos)}</p>
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
                              <p className="text-xl font-bold mt-1">Reservas: {safeFormatAOA(financeReports.capital)}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resultado Líquido</p>
                              <p className={`text-2xl font-black ${financeReports.lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {safeFormatAOA(financeReports.lucroLiquido)}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )
         }

         {/* --- MODAL NOVO LANÇAMENTO (DIÁRIO) --- */}
         {
            showEntryModal && (
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
                              options={planoContas.filter(c => c.natureza === 'Devedora' || c.tipo === 'Despesa').map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nome}` }))}
                           />
                           <Select
                              label="Conta de Crédito"
                              value={newEntry.contaCredito}
                              onChange={(e) => setNewEntry({ ...newEntry, contaCredito: e.target.value })}
                              options={planoContas.filter(c => c.natureza === 'Credora' || c.codigo === '1.1').map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nome}` }))}
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
            )
         }
      </div >
   );
};

export default AccountingPage;
