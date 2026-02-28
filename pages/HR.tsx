
import React, { useState, useMemo, useEffect } from 'react';
import {
   Users, UserPlus, Search, Edit, Trash2, Camera, Printer, X, Save,
   ShieldCheck, Wallet, Calendar, Briefcase, Phone, MapPin,
   Fingerprint, TrendingUp, Star, CheckCircle2, AlertTriangle,
   Download, Filter, QrCode, IdCard, RefreshCw, Zap, Award,
   BarChart4, ArrowUpRight, ArrowDownLeft, FileText, LayoutDashboard,
   Settings, Layers, DollarSign, Clock, PlusCircle, LogOut, Target,
   Image as ImageIcon, Eye, Calculator, MapPinOff, UserCheck, FileCheck,
   FileSpreadsheet, FileDown, ClipboardList, GraduationCap, Home,
   Coins, Ban, Percent, Timer, CalendarDays, ScanBarcode, PieChart as PieIcon, Landmark
} from 'lucide-react';
import {
   ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
   BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import {
   Funcionario, RegistroPresenca, ReciboSalarial,
   MetaDesempenho, Departamento, ContratoTipo, FuncionarioStatus, PasseServico, User
} from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import Logo from '../components/Logo';
import BankAccountsTab from '../components/hr/BankAccountsTab';
import ContasBancariasPage from './ContasBancariasPage';
import VagasAdminTab from '../components/hr/VagasAdminTab';

// --- CONFIGURAÇÃO DE HORÁRIO E REGRAS ---
const WORK_RULES = {
   startHour: 8, // 08:00
   startMinute: 0,
   endHour: 17, // 17:00
   toleranceMinutes: 15, // Tolerância de atraso
   dailyHours: 8,
   overtimeRateNormal: 1.5, // 150% Dias úteis
   overtimeRateSpecial: 2.0 // 200% Fim de semana/Feriados
};

const HOLIDAYS_ANGOLA = [
   '01-01', '02-04', '03-08', '04-04', '05-01', '09-17', '11-02', '11-11', '12-25'
];

const PROVINCIAS = [
   'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 'Cuanza Sul',
   'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
   'Namibe', 'Uíge', 'Zaire'
];

// --- MOTOR DE CÁLCULO FISCAL ANGOLANO (IRT 2024 - SIMPLIFICADO) ---
const calculateIRT = (baseTributavel: number): number => {
   if (baseTributavel <= 100000) return 0;
   if (baseTributavel <= 150000) return (baseTributavel - 100000) * 0.10;
   if (baseTributavel <= 200000) return 5000 + (baseTributavel - 150000) * 0.13;
   if (baseTributavel <= 300000) return 11500 + (baseTributavel - 200000) * 0.16;
   if (baseTributavel <= 500000) return 27500 + (baseTributavel - 300000) * 0.18;
   if (baseTributavel <= 1000000) return 63500 + (baseTributavel - 500000) * 0.19;
   if (baseTributavel <= 1500000) return 158500 + (baseTributavel - 1000000) * 0.20;
   if (baseTributavel <= 2000000) return 258500 + (baseTributavel - 1500000) * 0.21;
   if (baseTributavel <= 5000000) return 363500 + (baseTributavel - 2000000) * 0.22;
   if (baseTributavel <= 10000000) return 1023500 + (baseTributavel - 5000000) * 0.23;
   return 2173500 + (baseTributavel - 10000000) * 0.25;
};

// --- HELPERS DE TEMPO ---
const calculateAge = (birthDate: string) => {
   if (!birthDate) return 0;
   const today = new Date();
   const birth = new Date(birthDate);
   let age = today.getFullYear() - birth.getFullYear();
   const m = today.getMonth() - birth.getMonth();
   if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
   return Math.max(0, age);
};

const isSpecialDay = (dateStr: string) => {
   const date = new Date(dateStr);
   const day = date.getDay();
   const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

   const isWeekend = day === 0 || day === 6; // Domingo ou Sábado
   const isHoliday = HOLIDAYS_ANGOLA.includes(md);

   return { isWeekend, isHoliday, isSpecial: isWeekend || isHoliday };
};

const calculateTimeStats = (start: string, end: string, dateStr: string) => {
   const [h1, m1] = start.split(':').map(Number);
   const [h2, m2] = end.split(':').map(Number);

   const d1 = new Date(); d1.setHours(h1, m1, 0);
   const d2 = new Date(); d2.setHours(h2, m2, 0);

   const diffMs = d2.getTime() - d1.getTime();
   const totalHours = diffMs / (1000 * 60 * 60);

   // Verificação de Atraso
   const scheduleStart = new Date();
   scheduleStart.setHours(WORK_RULES.startHour, WORK_RULES.startMinute, 0);
   // Ajustar d1 para comparar apenas tempo
   const entryTime = new Date(scheduleStart);
   entryTime.setHours(h1, m1, 0);

   let delayMinutes = 0;
   if (entryTime > scheduleStart) {
      const delayMs = entryTime.getTime() - scheduleStart.getTime();
      const delayMins = delayMs / (1000 * 60);
      if (delayMins > WORK_RULES.toleranceMinutes) {
         delayMinutes = Math.floor(delayMins);
      }
   }

   // Verificação de Horas Extras e Tipo de Dia
   const { isSpecial } = isSpecialDay(dateStr);

   let extraHours = 0;
   let normalHours = 0;

   if (isSpecial) {
      // Fim de semana ou feriado: Tudo conta como extra
      extraHours = totalHours;
   } else {
      // Dia útil
      if (totalHours > WORK_RULES.dailyHours) {
         normalHours = WORK_RULES.dailyHours;
         extraHours = totalHours - WORK_RULES.dailyHours;
      } else {
         normalHours = totalHours;
      }
   }

   return {
      total: Number(totalHours.toFixed(2)),
      extra: Number(extraHours.toFixed(2)),
      delay: delayMinutes,
      isSpecial
   };
};

// --- TIPOS LOCAIS PARA PROCESSAMENTO ---
interface PayrollInput {
   horasExtras: number; // em horas
   faltas: number; // em dias
   bonus: number; // valor monetário
   premios: number; // valor monetário
   adiantamento: number; // valor monetário
}

interface HRPageProps {
   user: User;
}

const HRPage: React.FC<HRPageProps> = ({ user }) => {
   const isHRAdmin = ['admin', 'hr', 'director_hr'].includes(user.role);
   const [activeTab, setActiveTab] = useState<'dashboard' | 'gente' | 'payroll' | 'presenca' | 'performance' | 'passes' | 'contas' | 'vagas'>('dashboard');
   const [showModal, setShowModal] = useState(false);
   const [showMetaModal, setShowMetaModal] = useState(false);
   const [editingItem, setEditingItem] = useState<Funcionario | null>(null);
   const [searchTerm, setSearchTerm] = useState('');
   const [isProcessing, setIsProcessing] = useState(false);
   const [photoPreview, setPhotoPreview] = useState<string | null>(null);
   const [printingPass, setPrintingPass] = useState<Funcionario | null>(null);
   const [viewingRecibo, setViewingRecibo] = useState<ReciboSalarial | null>(null);
   const [historyFuncionario, setHistoryFuncionario] = useState<Funcionario | null>(null);
   const [modalActiveTab, setModalActiveTab] = useState<'geral' | 'contas'>('geral');

   // Estados locais do formulário para controlo dinâmico
   const [formState, setFormState] = useState({
      nascimento: '',
      idade: 0,
      provincia: 'Benguela',
      municipio: '',
      nome_pai: '',
      nome_mae: '',
      escolaridade: 'Ensino Médio',
      curso: ''
   });

   const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
   const [presencas, setPresencas] = useState<RegistroPresenca[]>([]);
   const [recibos, setRecibos] = useState<ReciboSalarial[]>([]);
   const [metas, setMetas] = useState<MetaDesempenho[]>([]);
   const [corporateInfo, setCorporateInfo] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   // --- ESTADO PARA PROCESSAMENTO DE FOLHA ---
   const [payrollInputs, setPayrollInputs] = useState<Record<string, PayrollInput>>({});

   const currentMonthName = new Date().toLocaleString('pt-PT', { month: 'long' });
   const currentFiscalYear = new Date().getFullYear();

   const fetchHRData = async () => {
      // 1. Background fetch for all keys
      const keys = [STORAGE_KEYS.FUNCIONARIOS, STORAGE_KEYS.RECIBOS, STORAGE_KEYS.PRESENCA, STORAGE_KEYS.METAS, STORAGE_KEYS.CORPORATE_INFO];
      await AmazingStorage.loadSpecificKeys(keys);

      // 2. Update states from fresh cache
      const funcData = AmazingStorage.get(STORAGE_KEYS.FUNCIONARIOS, []);
      if (funcData.length > 0) {
         setFuncionarios(funcData.map((f: any) => ({
            id: f.id,
            nome: f.nome,
            data_nascimento: f.notas?.match(/Nascimento: (.*?)(?:$|\n)/)?.[1] || '',
            funcao: f.cargo,
            bilhete: f.bi,
            telefone: f.telefone,
            morada: f.notas?.match(/Morada: (.*?)(?:$|\n)/)?.[1] || '',
            departamento_id: f.departamento,
            data_admissao: f.data_admissao,
            tipo_contrato: f.notas?.match(/Contrato: (.*?)(?:$|\n)/)?.[1] || 'Efectivo',
            status: f.status as any,
            nivel_escolaridade: f.notas?.match(/Escolaridade: (.*?)(?:$|\n)/)?.[1] || '',
            area_formacao: f.notas?.match(/Curso: (.*?)(?:$|\n)/)?.[1] || '',
            salario_base: Number(f.salario),
            subsidio_alimentacao: f.subsidio_alimentacao || 0,
            subsidio_transporte: f.subsidio_transporte || 0,
            bonus_assiduidade: 0,
            outros_bonus: f.outros_bonus || 0,
            foto_url: f.foto_url,
            documentos: [],
            historico_alteracoes: [],
            tempo_contrato: f.notas?.match(/Tempo: (.*?)(?:$|\n)/)?.[1] || '',
            provincia: f.notas?.match(/Provincia: (.*?)(?:$|\n)/)?.[1] || 'Benguela',
            municipio: f.notas?.match(/Municipio: (.*?)(?:$|\n)/)?.[1] || '',
            nome_pai: f.notas?.match(/Pai: (.*?)(?:$|\n)/)?.[1] || '',
            nome_mae: f.notas?.match(/Mae: (.*?)(?:$|\n)/)?.[1] || '',
            telefone_alternativo: f.notas?.match(/TelAlt: (.*?)(?:$|\n)/)?.[1] || ''
         })));
      }

      setPresencas(AmazingStorage.get(STORAGE_KEYS.PRESENCA, []));
      setRecibos(AmazingStorage.get(STORAGE_KEYS.RECIBOS, []));
      setMetas(AmazingStorage.get(STORAGE_KEYS.METAS, []));
      setCorporateInfo(AmazingStorage.get(STORAGE_KEYS.CORPORATE_INFO, null));
   };

   useEffect(() => {
      // 1. Initial UI unblock with local storage
      const localStaff = AmazingStorage.get(STORAGE_KEYS.FUNCIONARIOS, []);
      if (localStaff.length > 0) {
         // This map is repetitive, but necessary for immediate UI if cache exists
         setFuncionarios(localStaff.map((f: any) => ({
            ...f,
            salario_base: Number(f.salario || f.salario_base)
         })));
         setRecibos(AmazingStorage.get(STORAGE_KEYS.RECIBOS, []));
         setPresencas(AmazingStorage.get(STORAGE_KEYS.PRESENCA, []));
         setMetas(AmazingStorage.get(STORAGE_KEYS.METAS, []));
         setLoading(false);
      } else {
         setLoading(true);
      }

      // 2. Background sync
      fetchHRData().finally(() => setLoading(false));
   }, []);

   // Atualiza idade quando data de nascimento muda
   useEffect(() => {
      if (formState.nascimento) {
         setFormState(prev => ({ ...prev, idade: calculateAge(prev.nascimento) }));
      }
   }, [formState.nascimento]);

   const handleOpenModal = (func: Funcionario | null) => {
      setEditingItem(func);
      setPhotoPreview(func?.foto_url || null);
      if (func) {
         setFormState({
            nascimento: func.data_nascimento,
            idade: calculateAge(func.data_nascimento),
            provincia: (func as any).provincia || 'Benguela',
            municipio: (func as any).municipio || '',
            nome_pai: (func as any).nome_pai || '',
            nome_mae: (func as any).nome_mae || '',
            escolaridade: func.nivel_escolaridade || 'Ensino Médio',
            curso: func.area_formacao || ''
         });
      } else {
         setFormState({
            nascimento: '',
            idade: 0,
            provincia: 'Benguela',
            municipio: '',
            nome_pai: '',
            nome_mae: '',
            escolaridade: 'Ensino Médio',
            curso: ''
         });
      }
      setModalActiveTab('geral');
      setShowModal(true);
   };

   const handleAddMeta = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const id = `MT-${Date.now()}`;
      const nova = {
         id,
         funcionario_id: fd.get('func_id') as string,
         titulo: fd.get('titulo') as string,
         progresso: 0,
         prazo: fd.get('prazo') as string,
         status: 'Em curso'
      };

      try {
         const { error } = await supabase.from('hr_metas').insert([nova]);
         if (error) throw error;
         fetchHRData();
         setShowMetaModal(false);
      } catch (err) {
         alert('Erro ao criar meta');
      }
   };

   const updateMetaProgresso = async (id: string, novoProgresso: number) => {
      try {
         const { error } = await supabase.from('hr_metas').update({
            progresso: novoProgresso,
            status: novoProgresso === 100 ? 'Concluída' : 'Em curso'
         }).eq('id', id);
         if (error) throw error;
         fetchHRData();
      } catch (err) {
         alert('Erro ao atualizar meta');
      }
   };

   const registrarPonto = async (funcId: string, tipo: 'entrada' | 'saida') => {
      const hoje = new Date().toISOString().split('T')[0];
      const agora = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const func = funcionarios.find(f => f.id === funcId);

      try {
         if (tipo === 'entrada') {
            const { data: existing } = await supabase.from('hr_presencas').select('*').eq('funcionario_id', funcId).eq('data', hoje).single();
            if (existing) return alert("Já registou entrada hoje.");

            const [h, m] = agora.split(':').map(Number);
            const entryDate = new Date(); entryDate.setHours(h, m, 0);
            const scheduleDate = new Date(); scheduleDate.setHours(WORK_RULES.startHour, WORK_RULES.startMinute, 0);

            let status = 'Presente';
            if (entryDate > scheduleDate) {
               const diffMins = (entryDate.getTime() - scheduleDate.getTime()) / 60000;
               if (diffMins > WORK_RULES.toleranceMinutes) status = 'Atraso';
            }

            const { error } = await supabase.from('hr_presencas').insert([{
               funcionario_id: funcId,
               data: hoje,
               entrada: agora,
               status: status
            }]);
            if (error) throw error;
            fetchHRData();
            AmazingStorage.logAction('Ponto', 'RH', `Check-in: ${func?.nome} (${status})`);
         } else {
            const { data: ponto, error: fetchErr } = await supabase.from('hr_presencas').select('*').eq('funcionario_id', funcId).eq('data', hoje).is('saida', null).single();
            if (fetchErr || !ponto) return alert("Registo de entrada não localizado.");

            const stats = calculateTimeStats(ponto.entrada, agora, hoje);

            const { error: updErr } = await supabase.from('hr_presencas').update({
               saida: agora,
               horas_extras: stats.extra
            }).eq('id', ponto.id);
            if (updErr) throw updErr;

            fetchHRData();
            AmazingStorage.logAction('Ponto', 'RH', `Check-out: ${func?.nome}`);
         }
      } catch (err) {
         alert('Erro ao registar ponto');
      }
   };

   // --- ATUALIZAÇÃO DE VARIÁVEIS DE FOLHA ---
   const updatePayrollInput = (id: string, field: keyof PayrollInput, value: number) => {
      setPayrollInputs(prev => ({
         ...prev,
         [id]: {
            ...(prev[id] || { horasExtras: 0, faltas: 0, bonus: 0, adiantamento: 0, premios: 0 }),
            [field]: value
         }
      }));
   };

   // --- AGREGAÇÃO AUTOMÁTICA DE DADOS DE PONTO PARA FOLHA ---
   const getAutoPayrollData = (funcId: string): PayrollInput => {
      if (payrollInputs[funcId]) return payrollInputs[funcId];

      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const records = presencas.filter(p => p.funcionario_id === funcId && p.data.startsWith(currentMonthStr));

      let totalExtras = 0;

      records.forEach(r => {
         if (r.horas_extras) {
            const { isSpecial } = isSpecialDay(r.data);
            const factor = isSpecial ? (WORK_RULES.overtimeRateSpecial / WORK_RULES.overtimeRateNormal) : 1;
            totalExtras += (r.horas_extras * factor);
         }
      });

      return {
         horasExtras: parseFloat(totalExtras.toFixed(2)),
         faltas: 0,
         bonus: 0,
         adiantamento: 0,
         premios: 0
      };
   };

   // --- CÁLCULO DE FOLHA INDIVIDUAL (MOTOR DE CÁLCULO) ---
   const calculatePayrollForEmployee = (f: Funcionario) => {
      const inputs = payrollInputs[f.id] || getAutoPayrollData(f.id);

      const DIAS_UTEIS = 30;
      const HORAS_MENSAIS = 173.33;
      const INSS_WORKER_RATE = 0.03;
      const EXEMPT_ALLOWANCE_LIMIT = 30000;

      const base = Number(f.salario_base) || 0;
      const valorHora = base / HORAS_MENSAIS;
      const valorDia = base / DIAS_UTEIS;

      // Rendimentos
      const valorHorasExtras = inputs.horasExtras * (valorHora * WORK_RULES.overtimeRateNormal);
      const subAlim = Number(f.subsidio_alimentacao) || 0;
      const subTrans = Number(f.subsidio_transporte) || 0;
      const subsidiosTotal = subAlim + subTrans;
      const premiosBonus = (inputs.bonus || 0) + (inputs.premios || 0) + (Number(f.outros_bonus) || 0);

      const bruto = base + valorHorasExtras + premiosBonus + subsidiosTotal;

      // INSS (Base: Salário Base + Horas Extras + Bónus)
      const baseINSS = base + valorHorasExtras + premiosBonus;
      const inss = baseINSS * INSS_WORKER_RATE;

      // IRT (Base: Bruto - INSS - Subsídios Isentos)
      // Nota: Subsídios são isentos até EXEMPT_ALLOWANCE_LIMIT cada
      const exemptSubAlim = Math.min(subAlim, EXEMPT_ALLOWANCE_LIMIT);
      const exemptSubTrans = Math.min(subTrans, EXEMPT_ALLOWANCE_LIMIT);
      const baseIRT = bruto - inss - exemptSubAlim - exemptSubTrans;

      const irt = calculateIRT(baseIRT);

      // Descontos Adicionais
      const descontoFaltas = (inputs.faltas || 0) * valorDia;
      const totalDescontos = inss + irt + descontoFaltas + (inputs.adiantamento || 0);

      const liquido = bruto - totalDescontos;

      return {
         bruto, inss, irt, descontoFaltas, totalDescontos, liquido,
         valorHorasExtras, premiosBonus, subsidiosTotal, subAlim, subTrans, inputs
      };
   };

   const handleProcessPayroll = async () => {
      const ativos = funcionarios.filter(f => f.status === 'ativo');
      if (ativos.length === 0) return alert("Não existem colaboradores activos.");

      // 1. Hard check for session to avoid 401s
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return alert("Sessão expirada. Reinicie a aplicação.");

      // Verificar se já existe processamento para este mês
      const { data: existing } = await supabase.from('hr_recibos').select('id').eq('mes', currentMonthName).eq('ano', currentFiscalYear);

      if (existing && existing.length > 0) {
         const confirmUpdate = confirm(`A folha de ${currentMonthName}/${currentFiscalYear} já foi processada (${existing.length} recibos). Deseja ANULAR os anteriores e processar novamente?`);
         if (!confirmUpdate) return;

         // Eliminar anteriores
         const { error: delError } = await supabase.from('hr_recibos').delete().eq('mes', currentMonthName).eq('ano', currentFiscalYear);
         if (delError) return alert("Erro ao limpar processamento anterior.");
      } else {
         if (!confirm(`Confirma o processamento definitivo da folha de ${currentMonthName}/${currentFiscalYear}?`)) return;
      }

      setIsProcessing(true);
      try {
         const novosRecibos = ativos.map(f => {
            const calc = calculatePayrollForEmployee(f);
            return {
               id: `REC-${Date.now()}-${f.id.substring(0, 5)}-${Math.random().toString(36).substring(2, 7)}`,
               funcionario_id: f.id,
               nome: f.nome,
               cargo: f.funcao,
               bilhete: f.bilhete,
               mes: currentMonthName,
               ano: currentFiscalYear,
               base: f.salario_base || 0,
               subsidios: Number((calc.subsidiosTotal || 0).toFixed(2)),
               subsidio_alimentacao: Number((calc.subAlim || 0).toFixed(2)),
               subsidio_transporte: Number((calc.subTrans || 0).toFixed(2)),
               horas_extras_valor: Number((calc.valorHorasExtras || 0).toFixed(2)),
               bonus_premios: Number((calc.premiosBonus || 0).toFixed(2)),
               inss_trabalhador: Number((calc.inss || 0).toFixed(2)),
               irt: Number((calc.irt || 0).toFixed(2)),
               faltas_desconto: Number((calc.descontoFaltas || 0).toFixed(2)),
               adiantamentos: Number((calc.inputs.adiantamento || 0).toFixed(2)),
               bruto: Number((calc.bruto || 0).toFixed(2)),
               liquido: Number((calc.liquido || 0).toFixed(2)),
               data_emissao: new Date().toISOString()
            };
         });

         let { error } = await supabase.from('hr_recibos').insert(novosRecibos);

         // Retry once on transient error (401 or specific codes)
         if (error && (error.code === 'PGRST301' || error.message.includes('401'))) {
            console.warn("Transient auth error, retrying payroll insert...");
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
               const { error: retryError } = await supabase.from('hr_recibos').insert(novosRecibos);
               error = retryError;
            }
         }

         if (error) {
            console.error("Payroll Insert Error:", error);
            throw error;
         }

         await fetchHRData();
         AmazingStorage.logAction('Payroll', 'RH', `Folha de ${currentMonthName} processada com sucesso.`);
         alert("Folha de salários processada e fechada com sucesso!");
      } catch (error: any) {
         console.error("Critical Payroll Error:", error);
         alert(`Falha no processamento: ${error.message || 'Erro de rede ou permissão'}`);
      } finally {
         setIsProcessing(false);
      }
   };

   // --- ANALYTICS DATA PREPARATION ---
   const analyticsData = useMemo(() => {
      // 1. Custos por Departamento (Pie Chart)
      const deptCosts: Record<string, number> = {};
      funcionarios.forEach(f => {
         const dept = f.departamento_id || 'Administração';
         deptCosts[dept] = (deptCosts[dept] || 0) + (f.salario_base || 0);
      });
      const pieData = Object.entries(deptCosts).map(([name, value]) => ({ name, value }));

      // 2. Evolução de Custos (Area Chart) - Baseado nos recibos existentes
      const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthMap: Record<string, string> = {
         'janeiro': 'Jan', 'fevereiro': 'Fev', 'março': 'Mar', 'abril': 'Abr', 'maio': 'Mai', 'junho': 'Jun',
         'julho': 'Jul', 'agosto': 'Ago', 'setembro': 'Set', 'outubro': 'Out', 'novembro': 'Nov', 'dezembro': 'Dez'
      };

      const history: Record<string, number> = {};

      recibos.forEach(r => {
         const mShort = monthMap[r.mes?.toLowerCase()] || r.mes;
         history[mShort] = (history[mShort] || 0) + (r.liquido || 0);
      });

      const currentMonthShort = monthMap[currentMonthName.toLowerCase()] || currentMonthName;
      const chartArea = monthsShort.map(m => ({
         name: m,
         custo: history[m] || 0
      })).filter(d => d.custo > 0 || monthsShort.indexOf(d.name) <= monthsShort.indexOf(currentMonthShort));

      // 3. Performance de Metas (Bar Chart)
      const metaStats = { completed: 0, pending: 0 };
      metas.forEach(m => {
         if (m.status === 'Concluída') metaStats.completed++;
         else metaStats.pending++;
      });
      const barData = [
         { name: 'Concluídas', valor: metaStats.completed, fill: '#22c55e' },
         { name: 'Em Curso', valor: metaStats.pending, fill: '#eab308' }
      ];

      // 4. Notificações de Contratos a Expirar (Próximos 30 dias)
      const proximosVencimentos = funcionarios.filter(f => {
         if (f.tipo_contrato !== 'Determinado' && f.tipo_contrato !== 'Estágio') return false;
         if (!f.data_admissao || !f.tempo_contrato) return false;

         const meses = parseInt(f.tempo_contrato);
         if (isNaN(meses)) return false;

         const admissao = new Date(f.data_admissao);
         const vencimento = new Date(admissao.setMonth(admissao.getMonth() + meses));
         const hoje = new Date();
         const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

         return diffDays > 0 && diffDays <= 30;
      }).map(f => ({
         id: f.id,
         nome: f.nome,
         cargo: f.cargo,
         vencimento: new Date(new Date(f.data_admissao).setMonth(new Date(f.data_admissao).getMonth() + parseInt(f.tempo_contrato))).toLocaleDateString()
      }));

      const currentCost = funcionarios.reduce((acc, f) => acc + (f.salario_base || 0), 0);

      return {
         total: funcionarios.length,
         ativos: funcionarios.filter(f => f.status === 'ativo').length,
         metasTotal: metas.length,
         pieData,
         chartArea,
         barData,
         payrollCost: currentCost,
         proximosVencimentos
      };
   }, [funcionarios, metas, recibos]);

   const handleSubmitFuncionario = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const notes = [
         `Nascimento: ${formState.nascimento}`,
         `Morada: ${fd.get('morada')}`,
         `Contrato: ${fd.get('tipo_contrato')}`,
         `Escolaridade: ${formState.escolaridade}`,
         `Curso: ${formState.curso}`,
         `SubAlim: ${fd.get('sub_alim')}`,
         `SubTrans: ${fd.get('sub_trans')}`,
         `Tempo: ${fd.get('tempo')}`,
         `Provincia: ${formState.provincia}`,
         `Municipio: ${formState.municipio}`,
         `Pai: ${formState.nome_pai}`,
         `Mae: ${formState.nome_mae}`,
         `TelAlt: ${fd.get('telefone_alternativo')}`
      ].join('\n');

      const dbData = {
         nome: fd.get('nome') as string,
         cargo: fd.get('funcao') as string,
         bi: fd.get('bilhete') as string,
         telefone: fd.get('telefone') as string,
         departamento: fd.get('departamento') as string,
         data_admissao: fd.get('admissao') as string,
         status: (fd.get('status') as string) || 'ativo',
         salario: Number(fd.get('salario_base')),
         subsidio_alimentacao: Number(fd.get('sub_alim')),
         subsidio_transporte: Number(fd.get('sub_trans')),
         outros_bonus: Number(fd.get('outros_bonus')),
         foto_url: photoPreview || `https://ui-avatars.com/api/?name=${fd.get('nome')}&background=random`,
         notas: notes,
         updated_at: new Date().toISOString()
      };

      try {
         if (editingItem) {
            const { error } = await supabase.from('funcionarios').update(dbData).eq('id', editingItem.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('funcionarios').insert([{ ...dbData, created_at: new Date().toISOString() }]);
            if (error) throw error;
         }
         fetchHRData();
         setShowModal(false);
      } catch (err) {
         alert('Erro ao salvar colaborador');
      }
   };

   const COLORS_PIE = ['#eab308', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'];

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-20">
         <style>{`
            @media print {
               @page { size: A4 portrait; margin: 15mm; }
               body { background: white !important; }
               .no-print { display: none !important; }
               .print-only { display: block !important; }
               .fixed { display: none !important; }
               .active-tab-content { padding: 0 !important; margin: 0 !important; }
            }
         `}</style>

         {/* ... (MODALS DE RECIBO E FICHA TÉCNICA MANTIDOS DO CÓDIGO ANTERIOR) ... */}

         {/* HEADER RH */}
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200 print:hidden">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-zinc-900 rounded-2xl shadow-xl border border-white/10"><Users className="text-yellow-500" size={28} /></div>
               <div>
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase leading-none">Gestão de <span className="text-yellow-500">Talentos</span></h1>
                  <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1"><ShieldCheck size={14} className="text-green-600" /> Amazing Corporate Governance</p>
               </div>
            </div>
            <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
               {[
                  { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Resumo' },
                  { id: 'gente', icon: <Users size={18} />, label: 'Cadastro' },
                  { id: 'payroll', icon: <Wallet size={18} />, label: 'Folha' },
                  { id: 'presenca', icon: <Fingerprint size={18} />, label: 'Ponto' },
                  { id: 'performance', icon: <Award size={18} />, label: 'Metas' },
                  { id: 'passes', icon: <IdCard size={18} />, label: 'Passes' },
                  { id: 'vagas', icon: <UserPlus size={18} />, label: 'Vagas' },
                  { id: 'contas', icon: <Landmark size={18} />, label: 'Contas Bancárias' }
               ].filter(tab => isHRAdmin || !['gente', 'payroll', 'contas', 'vagas'].includes(tab.id)).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'}`}>{tab.icon} {tab.label}</button>
               ))}
            </div>
         </div>

         {/* DASHBOARD ANALÍTICO */}
         {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               {/* Notificações e Alertas */}
               {analyticsData.proximosVencimentos.length > 0 && (
                  <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm animate-pulse">
                     <div className="flex items-center gap-6">
                        <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg">
                           <AlertTriangle size={32} />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-red-900 uppercase tracking-tight">Alertas de Contrato</h4>
                           <p className="text-sm font-bold text-red-700">Há {analyticsData.proximosVencimentos.length} colaboradores com contrato a terminar nos próximos 30 dias.</p>
                        </div>
                     </div>
                     <div className="flex -space-x-4">
                        {analyticsData.proximosVencimentos.slice(0, 5).map(v => (
                           <div key={v.id} title={`${v.nome} - ${v.vencimento}`} className="w-12 h-12 rounded-full border-4 border-white bg-zinc-200 flex items-center justify-center font-black text-[10px] text-zinc-600 shadow-md">
                              {v.nome.substring(0, 2).toUpperCase()}
                           </div>
                        ))}
                        {analyticsData.proximosVencimentos.length > 5 && (
                           <div className="w-12 h-12 rounded-full border-4 border-white bg-zinc-900 text-white flex items-center justify-center font-black text-[10px] shadow-md">
                              +{analyticsData.proximosVencimentos.length - 5}
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Colaboradores</p>
                     <p className="text-4xl font-black text-zinc-900">{analyticsData.total}</p>
                     <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit"><CheckCircle2 size={12} /> {analyticsData.ativos} Activos</div>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                     <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">Custo Mensal (Est)</p>
                     <p className="text-3xl font-black">{formatAOA(analyticsData.payrollCost)}</p>
                     <div className="absolute -right-4 -bottom-4 opacity-10"><DollarSign size={80} /></div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Metas Activas</p>
                     <p className="text-4xl font-black text-zinc-900">{analyticsData.metasTotal}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between">
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Departamentos</p>
                     <p className="text-4xl font-black text-zinc-900">{analyticsData.pieData.length}</p>
                  </div>
               </div>

               {/* Gráficos */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm h-[400px] flex flex-col">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <PieIcon className="text-yellow-500" size={20} /> Distribuição por Departamento
                     </h3>
                     <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={analyticsData.pieData}
                                 cx="50%" cy="50%"
                                 innerRadius={60}
                                 outerRadius={100}
                                 paddingAngle={5}
                                 dataKey="value"
                              >
                                 {analyticsData.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="none" />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                              <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm h-[400px] flex flex-col">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <TrendingUp className="text-green-600" size={20} /> Evolução de Custos (Semestral)
                     </h3>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={analyticsData.chartArea}>
                              <defs>
                                 <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                              <YAxis hide />
                              <Tooltip
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                 formatter={(v: number) => formatAOA(v)}
                              />
                              <Area type="monotone" dataKey="custo" stroke="#eab308" strokeWidth={4} fillOpacity={1} fill="url(#colorCusto)" />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* GENTE / CADASTRO */}
         {activeTab === 'gente' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100 w-full flex items-center">
                     <Search className="ml-6 text-zinc-300" /><input placeholder="Pesquisar..." className="w-full bg-transparent border-none focus:ring-0 py-4 px-4 font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  {isHRAdmin && <button onClick={() => handleOpenModal(null)} className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-yellow-500 transition-all flex items-center gap-3 shadow-xl"><UserPlus size={20} /> Admitir</button>}
               </div>
               <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left min-w-[600px]">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              <th className="px-8 py-6">Colaborador</th><th className="px-8 py-6">Função / Dept</th><th className="px-8 py-6">Vencimento</th><th className="px-8 py-6">Estado</th><th className="px-8 py-6 text-right">Acções</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 text-sm">
                           {funcionarios.filter(f => f.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                              <tr key={f.id} className="hover:bg-zinc-50/50">
                                 <td className="px-8 py-5"><div className="flex items-center gap-4"><img src={f.foto_url} className="w-10 h-10 rounded-xl object-cover shadow-md" /><div><p className="font-black text-zinc-900">{f.nome}</p><p className="text-[10px] text-zinc-400">{f.bilhete}</p></div></div></td>
                                 <td className="px-8 py-5"><p className="font-bold text-zinc-700">{f.funcao}</p><p className="text-[10px] font-black text-sky-600 uppercase">{f.departamento_id}</p></td>
                                 <td className="px-8 py-5 font-black text-zinc-900">{formatAOA(f.salario_base)}</td>
                                 <td className="px-8 py-5"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${f.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{f.status}</span></td>
                                 <td className="px-8 py-5 text-right flex justify-end gap-2">
                                    <button onClick={() => setHistoryFuncionario(f)} className="p-3 text-zinc-300 hover:text-zinc-900" title="Ver Histórico Completo"><ClipboardList size={18} /></button>
                                    {isHRAdmin && <button onClick={() => handleOpenModal(f)} className="p-3 text-zinc-300 hover:text-yellow-600"><Edit size={18} /></button>}
                                    {isHRAdmin && <button onClick={() => { if (confirm('Excluir colaborador?')) supabase.from('funcionarios').delete().eq('id', f.id).then(() => fetchHRData()); }} className="p-3 text-zinc-300 hover:text-red-500"><Trash2 size={18} /></button>}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* PAYROLL / FOLHA */}
         {activeTab === 'payroll' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               {/* Gráfico de Tendência Salarial */}
               <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm h-[300px]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Custo Total de Pessoal (Projeção)</h3>
                  <ResponsiveContainer width="100%" height="85%">
                     <AreaChart data={analyticsData.chartArea}>
                        <defs>
                           <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => formatAOA(v)} />
                        <Area type="monotone" dataKey="custo" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorPayroll)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>

               <div className="bg-zinc-900 p-12 rounded-[4rem] text-white shadow-3xl overflow-hidden relative flex flex-col md:flex-row justify-between items-center">
                  <DollarSign className="absolute -right-10 -bottom-10 opacity-10" size={240} />
                  <div>
                     <h2 className="text-3xl font-black uppercase text-yellow-500">Mesa de Processamento</h2>
                     <p className="text-zinc-400 font-medium">Ciclo: {currentMonthName} {currentFiscalYear}</p>
                     <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Introduza variáveis antes de processar</p>
                  </div>
                  <button
                     onClick={handleProcessPayroll}
                     disabled={isProcessing}
                     className="relative z-10 px-12 py-6 bg-yellow-500 text-zinc-900 rounded-[2rem] font-black uppercase text-xs hover:bg-white transition-all shadow-2xl flex items-center gap-3 disabled:opacity-50 active:scale-95"
                  >
                     {isProcessing ? <RefreshCw className="animate-spin" /> : <Calculator size={24} />} {isProcessing ? 'Calculando...' : 'Processar Folha Definitiva'}
                  </button>
               </div>

               {/* WORKSPACE DE VARIÁVEIS MENSAIS */}
               <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           <th className="px-6 py-4">Colaborador</th>
                           <th className="px-6 py-4">Salário Base</th>
                           <th className="px-6 py-4">H. Extras (Horas)</th>
                           <th className="px-6 py-4">Faltas (Dias)</th>
                           <th className="px-6 py-4">Subsídios (Kz)</th>
                           <th className="px-6 py-4">Bónus/Prémios (Kz)</th>
                           <th className="px-6 py-4">Adiantamento (Kz)</th>
                           <th className="px-6 py-4 text-right">Líquido Est.</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50 text-xs">
                        {funcionarios.filter(f => f.status === 'ativo').map(f => {
                           const inputs = payrollInputs[f.id] || getAutoPayrollData(f.id);
                           const preview = calculatePayrollForEmployee(f);

                           return (
                              <tr key={f.id} className="hover:bg-zinc-50/50 transition-all">
                                 <td className="px-6 py-4 font-bold text-zinc-900">{f.nome}</td>
                                 <td className="px-6 py-4 text-zinc-500">{formatAOA(f.salario_base)}</td>
                                 <td className="px-6 py-4">
                                    <input type="number" min="0" step="0.5" className="w-16 bg-zinc-100 border-none rounded p-1 text-center font-bold"
                                       value={inputs.horasExtras}
                                       onChange={e => updatePayrollInput(f.id, 'horasExtras', Number(e.target.value))}
                                    />
                                 </td>
                                 <td className="px-6 py-4">
                                    <input type="number" min="0" className="w-16 bg-zinc-100 border-none rounded p-1 text-center font-bold text-red-500"
                                       value={inputs.faltas}
                                       onChange={e => updatePayrollInput(f.id, 'faltas', Number(e.target.value))}
                                    />
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="text-[10px] font-bold text-zinc-500">
                                       Alim: {formatAOA(f.subsidio_alimentacao)}<br />
                                       Trans: {formatAOA(f.subsidio_transporte)}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                       <div className="text-[9px] text-zinc-400 uppercase font-black">Variável / Fixo</div>
                                       <input type="number" min="0" className="w-24 bg-zinc-100 border-none rounded p-1 text-right font-bold text-green-600"
                                          value={inputs.bonus}
                                          onChange={e => updatePayrollInput(f.id, 'bonus', Number(e.target.value))}
                                       />
                                       <div className="text-[10px] font-bold text-sky-600">Base: {formatAOA(f.outros_bonus)}</div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <input type="number" min="0" className="w-24 bg-zinc-100 border-none rounded p-1 text-right font-bold text-orange-600"
                                       value={inputs.adiantamento}
                                       onChange={e => updatePayrollInput(f.id, 'adiantamento', Number(e.target.value))}
                                    />
                                 </td>
                                 <td className="px-6 py-4 text-right font-black text-zinc-900 text-sm">
                                    {formatAOA(preview.liquido)}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>

               {/* LISTA DE RECIBOS GERADOS */}
               <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-lg font-black text-zinc-900 uppercase ml-4">Histórico de Recibos Emitidos</h3>
                  {recibos.length > 0 ? recibos.map(r => (
                     <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all"><FileText size={28} /></div><div><h4 className="font-black text-zinc-900 text-lg">{r.nome}</h4><p className="text-[10px] font-black text-zinc-400 uppercase">{r.mes} / {r.ano}</p></div></div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Líquido</p>
                           <p className="text-2xl font-black text-zinc-900">{formatAOA(r.liquido)}</p>
                        </div>
                        <div className="flex gap-2 ml-6">
                           <button onClick={() => setViewingRecibo(r)} className="p-3 bg-zinc-50 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-xl transition-all"><Eye size={20} /></button>
                           <button onClick={() => { setViewingRecibo(r); setTimeout(() => window.print(), 300); }} className="p-3 bg-zinc-50 text-zinc-400 hover:bg-sky-600 hover:text-white rounded-xl transition-all"><Printer size={20} /></button>
                        </div>
                     </div>
                  )) : (
                     <div className="py-20 text-center bg-white rounded-[3rem] border border-dashed border-sky-200"><AlertTriangle className="mx-auto text-sky-100 mb-4" size={48} /><p className="text-zinc-400 font-bold italic">Sem recibos neste ciclo.</p></div>
                  )}
               </div>
            </div>
         )}

         {/* PONTO / PRESENÇA */}
         {activeTab === 'presenca' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white flex items-center justify-between">
                  <div><h3 className="text-xl font-black uppercase text-yellow-500">Terminal de Ponto</h3><p className="text-zinc-400 text-sm font-medium">Controlo Biométrico Virtual</p></div>
                  <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/10 text-center"><p className="text-[10px] font-black text-zinc-500 uppercase">Hoje</p><p className="text-xl font-black">{new Date().toLocaleDateString('pt-PT')}</p></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {funcionarios.filter(f => f.status === 'ativo').map(f => {
                     const ponto = presencas.find(p => p.funcionario_id === f.id && p.data === new Date().toISOString().split('T')[0]);
                     const isLate = ponto?.status === 'Atraso';

                     return (
                        <div key={f.id} className={`bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all ${ponto?.saida ? 'bg-zinc-50/50 grayscale opacity-60' : ''}`}>
                           <div className="flex items-center gap-4 mb-8">
                              <div className="relative">
                                 <img src={f.foto_url} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                                 <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${ponto ? (ponto.saida ? 'bg-zinc-400' : 'bg-green-500 animate-pulse') : 'bg-red-500'}`}></div>
                              </div>
                              <div>
                                 <h4 className="font-black text-zinc-900">{f.nome.split(' ')[0]}</h4>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase">{f.funcao}</p>
                                 {isLate && <span className="text-[9px] text-red-500 font-black uppercase bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">Atraso Registo</span>}
                              </div>
                           </div>
                           <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-zinc-400 bg-zinc-50 p-4 rounded-2xl">
                                 <div className="text-center"><p className="mb-1">Entrada</p><p className="text-sm text-zinc-900 font-black">{ponto?.entrada || '--:--'}</p></div>
                                 <div className="text-center border-l border-zinc-200"><p className="mb-1">Saída</p><p className="text-sm text-zinc-900 font-black">{ponto?.saida || '--:--'}</p></div>
                              </div>
                              {ponto?.saida && ponto.horas_extras > 0 && <div className="flex justify-between items-center px-4 py-2 bg-yellow-50 rounded-xl border border-yellow-100"><span className="text-[9px] font-black text-yellow-700 uppercase">H. Extras</span><span className="text-sm font-black text-zinc-900">+{ponto.horas_extras}h</span></div>}
                              {!ponto ? (
                                 <button onClick={() => registrarPonto(f.id, 'entrada')} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-green-600 transition-all flex items-center justify-center gap-2"><Clock size={16} /> Check-in</button>
                              ) : !ponto.saida ? (
                                 <button onClick={() => registrarPonto(f.id, 'saida')} className="w-full py-4 bg-yellow-500 text-zinc-900 rounded-2xl font-black uppercase text-[11px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"><LogOut size={16} /> Check-out</button>
                              ) : <div className="w-full py-4 bg-zinc-100 text-zinc-400 rounded-2xl text-center font-black uppercase text-[11px]">Jornada Concluída</div>}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         {/* PERFORMANCE / METAS */}
         {activeTab === 'performance' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               {/* Chart Metas */}
               <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm h-[300px]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Aproveitamento de KPIs</h3>
                  <ResponsiveContainer width="100%" height="85%">
                     <BarChart data={analyticsData.barData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20}>
                           {analyticsData.barData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>

               <div className="flex justify-between items-center bg-zinc-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                  <Target className="absolute -right-8 -bottom-8 opacity-10" size={200} />
                  <div><h2 className="text-3xl font-black uppercase">Desempenho</h2><p className="text-zinc-400 font-medium">Acompanhamento de KPIs</p></div>
                  <button onClick={() => setShowMetaModal(true)} className="px-8 py-4 bg-yellow-500 text-zinc-900 rounded-2xl font-black uppercase text-[10px] hover:bg-white transition-all flex items-center gap-3 relative z-10"><PlusCircle size={20} /> Atribuir Meta</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {metas.map(m => {
                     const func = funcionarios.find(f => f.id === m.funcionario_id);
                     return (
                        <div key={m.id} className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm space-y-6 hover:shadow-xl transition-all">
                           <div className="flex justify-between items-start"><div className="flex items-center gap-3"><img src={func?.foto_url} className="w-10 h-10 rounded-xl object-cover grayscale" /><h4 className="font-black text-zinc-900 text-sm">{func?.nome.split(' ')[0]}</h4></div><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{m.status}</span></div>
                           <h3 className="text-base font-black text-zinc-900 mb-4">{m.titulo}</h3>
                           <div className="space-y-2">
                              <input type="range" min="0" max="100" value={m.progresso} onChange={(e) => updateMetaProgresso(m.id, Number(e.target.value))} className="w-full h-2 bg-zinc-100 rounded-full appearance-none cursor-pointer accent-yellow-500" />
                              <p className="text-right text-[10px] font-black text-zinc-900">{m.progresso}%</p>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         {/* PASSES PVC */}
         {activeTab === 'passes' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-zinc-50 p-10 rounded-[3rem] border border-sky-100 flex items-center justify-between"><div><h2 className="text-2xl font-black text-zinc-900 uppercase">Identificação Corporativa</h2><p className="text-zinc-500 text-sm font-medium">Emissão e gestão de passes PVC.</p></div><ScanBarcode size={32} className="text-yellow-600" /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {funcionarios.map(f => (
                     <div key={f.id} className="bg-white p-6 rounded-[2.5rem] border border-sky-50 shadow-sm flex flex-col items-center text-center group hover:shadow-2xl transition-all">
                        <div className="relative mb-4"><img src={f.foto_url} className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform" /><div className="absolute -bottom-2 -right-2 p-2 bg-yellow-500 text-zinc-900 rounded-xl shadow-lg"><QrCode size={14} /></div></div>
                        <h3 className="font-black text-zinc-900 text-sm truncate w-full px-4">{f.nome}</h3>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1 mb-6">{f.funcao}</p>

                        <div className="flex gap-2 w-full mt-auto">
                           <button onClick={() => setPrintingPass(f)} className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-black text-[9px] uppercase hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center justify-center gap-2" title="Visualizar / Re-emitir">
                              <Eye size={14} /> Visualizar
                           </button>
                           <button onClick={() => handleOpenModal(f)} className="p-3 bg-zinc-100 text-zinc-400 rounded-xl hover:bg-zinc-200 transition-all" title="Editar Dados">
                              <Edit size={14} />
                           </button>
                           <button onClick={() => { if (confirm('Excluir este colaborador e o seu passe permanentemente?')) setFuncionarios(funcionarios.filter(x => x.id !== f.id)) }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Excluir">
                              <Trash2 size={14} />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* CONTAS BANCÁRIAS (GLOBAL) */}
         {activeTab === 'contas' && (
            <div className="animate-in slide-in-from-bottom-4">
               <ContasBancariasPage user={user} inAppTab={true} />
            </div>
         )}

         {/* VAGAS DE EMPREGO (RECRUTAMENTO) */}
         {activeTab === 'vagas' && (
            <div className="animate-in slide-in-from-bottom-4">
               <VagasAdminTab />
            </div>
         )}

         {/* MODAL CADASTRO FUNCIONÁRIO (MANTIDO) */}
         {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                        {editingItem ? <Edit className="text-yellow-500" /> : <UserPlus className="text-yellow-500" />}
                        {editingItem ? 'Ficha do Colaborador' : 'Nova Admissão'}
                     </h2>
                     <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><X size={28} /></button>
                  </div>

                  {/* ABAS DO MODAL */}
                  {editingItem && (
                     <div className="flex border-b border-zinc-100 bg-white px-8 pt-4 gap-6">
                        <button
                           onClick={() => setModalActiveTab('geral')}
                           className={`pb-4 font-black text-sm uppercase px-2 transition-all border-b-4 ${modalActiveTab === 'geral' ? 'border-yellow-500 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                        >
                           Dados Gerais
                        </button>
                        <button
                           onClick={() => setModalActiveTab('contas')}
                           className={`pb-4 font-black text-sm uppercase px-2 transition-all border-b-4 ${modalActiveTab === 'contas' ? 'border-yellow-500 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                        >
                           Contas Bancárias
                        </button>
                     </div>
                  )}

                  <div className="overflow-y-auto w-full h-full p-0">
                     {modalActiveTab === 'geral' ? (
                        <form onSubmit={handleSubmitFuncionario} className="p-10 space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                              {/* Coluna da Foto */}
                              <div className="md:col-span-3 flex flex-col items-center gap-4">
                                 <div className="w-full aspect-square bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 overflow-hidden cursor-pointer hover:border-yellow-500 transition-all relative" onClick={() => document.getElementById('photo-upload')?.click()}>
                                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Camera size={48} />}
                                    <input type="file" id="photo-upload" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onload = () => setPhotoPreview(r.result as string); r.readAsDataURL(file); } }} />
                                 </div>
                                 <p className="text-[9px] font-black text-zinc-400 uppercase">Foto Institucional</p>
                              </div>

                              {/* Dados Pessoais Principais */}
                              <div className="md:col-span-9 space-y-6">
                                 <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2"><UserCheck size={14} /> Identificação & Contactos</h3>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input name="nome" label="Nome Completo" defaultValue={editingItem?.nome} required />
                                    <Input name="bilhete" label="Nº BI / Identidade" defaultValue={editingItem?.bilhete} required />
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <div className="md:col-span-4 grid grid-cols-3 gap-4">
                                       <div className="col-span-2">
                                          <Input
                                             name="nascimento" label="Data de Nascimento" type="date" required
                                             value={formState.nascimento}
                                             onChange={e => setFormState({ ...formState, nascimento: e.target.value })}
                                          />
                                       </div>
                                       <Input label="Idade" readOnly value={formState.idade} className="bg-zinc-100 font-bold text-center text-zinc-500 cursor-not-allowed" />
                                    </div>

                                    <div className="md:col-span-4">
                                       <Input name="telefone" label="Telemóvel Pessoal" defaultValue={editingItem?.telefone} required placeholder="9xx xxx xxx" />
                                    </div>

                                    <div className="md:col-span-4">
                                       <Input name="telefone_alternativo" label="Telefone Alternativo" defaultValue={(editingItem as any)?.telefone_alternativo} placeholder="Opcional" />
                                    </div>
                                 </div>

                                 <div className="w-full">
                                    <Input name="morada" label="Bairro / Rua / Referência" defaultValue={editingItem?.morada} required />
                                 </div>
                              </div>
                           </div>

                           {/* Secção de Filiação e Origem (NOVO) */}
                           <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-6">
                              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2"><Users size={14} /> Origem & Filiação</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <Input name="nome_pai" label="Nome do Pai" value={formState.nome_pai} onChange={e => setFormState({ ...formState, nome_pai: e.target.value })} />
                                 <Input name="nome_mae" label="Nome da Mãe" value={formState.nome_mae} onChange={e => setFormState({ ...formState, nome_mae: e.target.value })} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <Select
                                    name="provincia" label="Naturalidade (Província)"
                                    value={formState.provincia}
                                    onChange={e => setFormState({ ...formState, provincia: e.target.value })}
                                    options={PROVINCIAS.map(p => ({ value: p, label: p }))}
                                 />
                                 <Input name="municipio" label="Município" value={formState.municipio} onChange={e => setFormState({ ...formState, municipio: e.target.value })} />
                              </div>
                           </div>

                           {/* Secção Académica e Profissional */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-6 bg-white border border-zinc-100 p-6 rounded-3xl shadow-sm">
                                 <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2"><GraduationCap size={14} /> Habilitações</h3>
                                 <Select
                                    name="escolaridade" label="Nível de Escolaridade"
                                    value={formState.escolaridade}
                                    onChange={e => setFormState({ ...formState, escolaridade: e.target.value })}
                                    options={[{ value: 'Ensino Básico', label: 'Ensino Básico' }, { value: 'Ensino Médio', label: 'Ensino Médio' }, { value: 'Licenciatura', label: 'Licenciatura' }, { value: 'Mestrado', label: 'Mestrado' }]}
                                 />
                                 <Input name="formacao" label="Curso / Especialidade" value={formState.curso} onChange={e => setFormState({ ...formState, curso: e.target.value })} />
                              </div>

                              <div className="space-y-6 bg-white border border-zinc-100 p-6 rounded-3xl shadow-sm">
                                 <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2"><Briefcase size={14} /> Cargo & Função</h3>
                                 <Input name="funcao" label="Função a Desempenhar" defaultValue={editingItem?.funcao} required />
                                 <Input name="departamento" label="Departamento" defaultValue={editingItem?.departamento_id} required />
                              </div>
                           </div>

                           {/* Contrato e Financeiro */}
                           <div className="bg-zinc-900 p-10 rounded-[3.5rem] text-white space-y-8 border-l-[12px] border-yellow-500 shadow-2xl">
                              <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> Dados Contratuais</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                 <Select name="tipo_contrato" label="Regime" defaultValue={editingItem?.tipo_contrato} className="bg-zinc-800 border-zinc-700 text-white" options={[{ value: 'Indeterminado', label: 'Indeterminado' }, { value: 'Determinado', label: 'Determinado' }, { value: 'Estágio', label: 'Estágio Remunerado' }]} />
                                 <Input name="admissao" label="Data de Início" type="date" defaultValue={editingItem?.data_admissao} required className="bg-zinc-800 border-zinc-700 text-white" />
                                 <Select name="status" label="Estado Inicial" defaultValue={editingItem?.status || 'ativo'} className="bg-zinc-800 border-zinc-700 text-white" options={[{ value: 'ativo', label: 'Activo' }, { value: 'ferias', label: 'Férias' }, { value: 'inativo', label: 'Inactivo' }, { value: 'rescindido', label: 'Rescindido' }]} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4 border-t border-white/10">
                                 <Input name="salario_base" label="Base (AOA)" type="number" defaultValue={editingItem?.salario_base} className="bg-zinc-800 border-zinc-700 text-white font-black" required />
                                 <Input name="sub_alim" label="Sub. Alim." type="number" defaultValue={editingItem?.subsidio_alimentacao} className="bg-zinc-800 border-zinc-700 text-white" />
                                 <Input name="sub_trans" label="Sub. Trans." type="number" defaultValue={editingItem?.subsidio_transporte} className="bg-zinc-800 border-zinc-700 text-white" />
                                 <Input name="outros_bonus" label="Outros Bónus" type="number" defaultValue={editingItem?.outros_bonus} className="bg-zinc-800 border-zinc-700 text-white border-dashed border-2" />
                              </div>
                           </div>

                           <div className="flex justify-end gap-6 pt-6">
                              <button type="button" onClick={() => setShowModal(false)} className="px-10 py-5 text-[11px] font-black uppercase text-zinc-400">Cancelar</button>
                              <button type="submit" className="px-16 py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[11px] shadow-2xl hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center gap-3">
                                 <Save size={20} /> {editingItem ? 'Actualizar Ficha' : 'Efectivar Admissão'}
                              </button>
                           </div>
                        </form>
                     ) : (
                        <div className="p-10 min-h-[500px]">
                           {editingItem && <BankAccountsTab funcionarioId={editingItem.id} user={user} />}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* MODAL METAS */}
         {showMetaModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50"><h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase"><Target className="text-yellow-500" /> Nova Meta de Performance</h2><button onClick={() => setShowMetaModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button></div>
                  <form onSubmit={handleAddMeta} className="p-8 space-y-6">
                     <Select name="func_id" label="Responsável" required options={funcionarios.map(f => ({ value: f.id, label: f.nome }))} />
                     <Input name="titulo" label="KPI / Objectivo" required placeholder="Ex: Reduzir custos de frota em 10%" />
                     <Input name="prazo" label="Prazo Final" type="date" required defaultValue={new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]} />
                     <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] hover:bg-yellow-500 transition-all shadow-xl"><Save size={18} /> Efectivar Atribuição</button>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL RECIBO PROFISSIONAL (ESTILO CANVA) */}
         {viewingRecibo && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-xl p-4 overflow-y-auto animate-in fade-in py-10 print:static print:p-0 print:bg-white print:block">
               <div className="bg-white w-full max-w-4xl shadow-2xl relative print:shadow-none print:w-full min-h-[1120px] flex flex-col overflow-hidden">

                  {/* DESIGN GEOMÉTRICO SUPERIOR (TEMPLATE) */}
                  <div className="relative h-56 w-full print:h-56 overflow-hidden bg-white border-b-4 border-zinc-900">
                     {/* Blue Polygon */}
                     <div
                        className="absolute top-0 right-0 w-[65%] h-full bg-sky-600 origin-top-right print:bg-sky-600"
                        style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }}
                     ></div>
                     {/* Black Polygon */}
                     <div
                        className="absolute top-0 right-0 w-[55%] h-[85%] bg-zinc-900 origin-top-right print:bg-zinc-900"
                        style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}
                     ></div>

                     <div className="absolute top-0 left-12 p-8 z-10 w-full">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-5">
                              <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2">
                                 <Logo className="h-20" />
                              </div>
                              <div className="space-y-1">
                                 <div className="text-[10px] font-black text-zinc-800 uppercase leading-tight">
                                    <p className="text-zinc-900 text-sm mb-1">{corporateInfo?.nome || 'Amazing Corporation'}</p>
                                    <p>NIF: {corporateInfo?.nif || '5000218797'}</p>
                                    <p>{corporateInfo?.sede_principal || 'Massangarala, Benguela - Angola'}</p>
                                    <p>Telf: {corporateInfo?.telefone || '(+244) 929 882 067'}</p>
                                    <p className="lowercase font-bold text-sky-600">Email: {corporateInfo?.email || 'geral.amazingcorporatio@gmail.com'}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right pr-16 pt-2">
                              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                                 <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Recibo de Salário</p>
                                 <p className="text-[8px] font-bold text-white/50 uppercase mt-1">Documento Interno # {viewingRecibo.id.substring(0, 8).toUpperCase()}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="absolute top-6 right-6 flex gap-3 print:hidden z-20">
                     <button onClick={() => window.print()} className="p-4 bg-zinc-900 text-white rounded-2xl hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl"><Printer size={20} /></button>
                     <button onClick={() => setViewingRecibo(null)} className="p-4 bg-zinc-100 text-zinc-400 hover:bg-zinc-200 rounded-2xl transition-all"><X size={24} /></button>
                  </div>

                  <div className="flex-1 px-16 py-8 print:px-12">
                     {/* LINHA DE TÍTULO */}
                     <div className="border-b-[4px] border-zinc-900 pb-8 mb-8 flex justify-between items-end">
                        <div>
                           <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Folha de Salário</h2>
                           <p className="text-sm font-bold text-zinc-400 mt-1 uppercase">Período: {viewingRecibo.mes} {viewingRecibo.ano}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nº Documento</p>
                           <p className="text-xl font-black text-zinc-900 tabular-nums">#{viewingRecibo.id.split('-').pop()}</p>
                        </div>
                     </div>

                     {/* DADOS DO FUNCIONÁRIO - TABELA REFINADA */}
                     <div className="mb-12 overflow-hidden rounded-2xl border border-zinc-200">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">
                              <tr>
                                 <th className="px-6 py-3 border-r border-white/10">Nome do Colaborador</th>
                                 <th className="px-6 py-3 border-r border-white/10">Cargo / Função</th>
                                 <th className="px-6 py-3">Nº Bilhete</th>
                              </tr>
                           </thead>
                           <tbody className="bg-zinc-50 font-bold text-zinc-900">
                              <tr>
                                 <td className="px-6 py-4 border-r border-zinc-200">{viewingRecibo.nome || '---'}</td>
                                 <td className="px-6 py-4 border-r border-zinc-200">{viewingRecibo.cargo || '---'}</td>
                                 <td className="px-6 py-4">{viewingRecibo.bilhete || '---'}</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>

                     {/* TABELA DE RENDIMENTOS E DESCONTOS */}
                     <div className="grid grid-cols-2 gap-12 mb-12">
                        {/* COLUNA RENDIMENTOS */}
                        <div>
                           <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <div className="w-2 h-2 bg-sky-500 rounded-full"></div> Rendimentos (+)
                           </h3>
                           <div className="space-y-4">
                              <div className="flex justify-between border-b border-zinc-50 pb-2">
                                 <span className="text-sm font-medium text-zinc-500">Vencimento Base</span>
                                 <span className="text-sm font-black text-zinc-900">{formatAOA(viewingRecibo.base)}</span>
                              </div>
                              {viewingRecibo.subsidio_alimentacao > 0 && (
                                 <div className="flex justify-between border-b border-zinc-50 pb-2">
                                    <span className="text-sm font-medium text-zinc-500">Subsídio de Alimentação</span>
                                    <span className="text-sm font-black text-zinc-900">{formatAOA(viewingRecibo.subsidio_alimentacao)}</span>
                                 </div>
                              )}
                              {viewingRecibo.subsidio_transporte > 0 && (
                                 <div className="flex justify-between border-b border-zinc-50 pb-2">
                                    <span className="text-sm font-medium text-zinc-500">Subsídio de Transporte</span>
                                    <span className="text-sm font-black text-zinc-900">{formatAOA(viewingRecibo.subsidio_transporte)}</span>
                                 </div>
                              )}
                              {(viewingRecibo.horas_extras_valor > 0 || (viewingRecibo.bonus_premios && viewingRecibo.bonus_premios > 0)) && (
                                 <div className="flex justify-between border-b border-zinc-50 pb-2">
                                    <span className="text-sm font-medium text-zinc-500">Horas Extras / Bónus</span>
                                    <span className="text-sm font-black text-zinc-900">{formatAOA((viewingRecibo.horas_extras_valor || 0) + (viewingRecibo.bonus_premios || 0))}</span>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* COLUNA DESCONTOS */}
                        <div>
                           <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div> Descontos (-)
                           </h3>
                           <div className="space-y-4">
                              <div className="flex justify-between border-b border-zinc-50 pb-2">
                                 <span className="text-sm font-medium text-zinc-500">Segurança Social (3%)</span>
                                 <span className="text-sm font-black text-red-500">-{formatAOA(viewingRecibo.inss_trabalhador)}</span>
                              </div>
                              <div className="flex justify-between border-b border-zinc-50 pb-2">
                                 <span className="text-sm font-medium text-zinc-500">I.R.T.</span>
                                 <span className="text-sm font-black text-red-500">-{formatAOA(viewingRecibo.irt)}</span>
                              </div>
                              {viewingRecibo.adiantamentos > 0 && (
                                 <div className="flex justify-between border-b border-zinc-50 pb-2">
                                    <span className="text-sm font-medium text-zinc-500">Adiantamentos</span>
                                    <span className="text-sm font-black text-red-500">-{formatAOA(viewingRecibo.adiantamentos)}</span>
                                 </div>
                              )}
                              {viewingRecibo.faltas_desconto > 0 && (
                                 <div className="flex justify-between border-b border-zinc-50 pb-2">
                                    <span className="text-sm font-medium text-zinc-500">Faltas / Atrasos</span>
                                    <span className="text-sm font-black text-red-500">-{formatAOA(viewingRecibo.faltas_desconto)}</span>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* RESUMO TOTAL */}
                     <div className="mt-12 bg-zinc-900 text-white rounded-[2.5rem] p-12 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                        <div className="flex justify-between items-center relative z-10">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.4em]">Total Bruto</p>
                              <p className="text-2xl font-bold opacity-30">{formatAOA(viewingRecibo.bruto || 0)}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[12px] font-black text-white/50 uppercase tracking-[0.5em] mb-2">Líquido a Receber</p>
                              <p className="text-6xl font-black">{formatAOA(viewingRecibo.liquido)}</p>
                           </div>
                        </div>
                     </div>

                     {/* ASSINATURAS E VALIDAÇÃO */}
                     <div className="mt-20 grid grid-cols-3 gap-12 items-end">
                        <div className="text-center">
                           <div className="h-16 flex items-center justify-center opacity-40 italic font-serif">Amazing Corporation</div>
                           <div className="border-t border-zinc-200 mt-4 pt-2">
                              <p className="text-[9px] font-black uppercase text-zinc-400">Entidade Empregadora</p>
                           </div>
                        </div>
                        <div className="flex flex-col items-center">
                           <div className="p-3 border-2 border-zinc-50 rounded-2xl mb-4 bg-white shadow-sm">
                              <QrCode size={48} className="text-zinc-900" />
                           </div>
                           <p className="text-[8px] font-bold text-zinc-300 uppercase">Verificado Digitalmente</p>
                        </div>
                        <div className="text-center">
                           <div className="h-16"></div>
                           <div className="border-t border-zinc-200 mt-4 pt-2">
                              <p className="text-[9px] font-black uppercase text-zinc-400">Assinatura do Colaborador</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* DESIGN GEOMÉTRICO INFERIOR (TEMPLATE) */}
                  <div className="relative h-32 w-full mt-auto mb-[-1px] overflow-hidden bg-white">
                     {/* Light Blue Polygon */}
                     <div
                        className="absolute bottom-0 left-0 w-[60%] h-full bg-sky-600 origin-bottom-left print:bg-sky-600"
                        style={{ clipPath: 'polygon(0 0, 85% 100%, 0 100%)' }}
                     ></div>
                     {/* Black Polygon */}
                     <div
                        className="absolute bottom-0 left-0 w-[50%] h-[75%] bg-zinc-900 origin-bottom-left print:bg-zinc-900"
                        style={{ clipPath: 'polygon(0 0, 75% 100%, 0 100%)' }}
                     ></div>

                     <div className="absolute bottom-8 left-12 z-10 flex items-center gap-6">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Amazing ERP • Sistema Inteligente</p>
                        <div className="h-4 w-[1px] bg-white/10"></div>
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Pág. 01 / 01</p>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL PASSE PVC (ESCURO - REFINADO) */}
         {printingPass && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in py-10 overflow-y-auto">
               <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 my-auto">
                  <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-xl font-black text-zinc-900 uppercase flex items-center gap-2">
                        <IdCard className="text-yellow-500" size={24} /> Emissão PVC Corporativo
                     </h2>
                     <button onClick={() => setPrintingPass(null)} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
                  </div>

                  <div className="p-10 flex flex-col items-center gap-8">
                     {/* Cartão PVC - Frente (Tema Escuro solicitado pelo Utilizador) */}
                     <div id="pvc-card" className="w-[320px] h-[520px] bg-zinc-900 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden relative flex flex-col items-center p-0 print:shadow-none border border-white/5">

                        {/* Design superior minimalista */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full -translate-y-32 translate-x-32"></div>
                        <div className="absolute top-0 left-0 w-48 h-48 bg-sky-600/10 rounded-full -translate-y-24 -translate-x-24"></div>

                        {/* Logotipo ajustado (Menor conforme solicitado) */}
                        <div className="z-10 mt-10 mb-8 flex flex-col items-center">
                           <div className="scale-75 opacity-90 filter brightness-0 invert">
                              <Logo />
                           </div>
                           <div className="w-8 h-1 bg-yellow-500 rounded-full mt-4"></div>
                        </div>

                        {/* Fotografia */}
                        <div className="relative mb-8">
                           <img src={printingPass.foto_url} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-zinc-800 shadow-2xl relative z-10" />
                           <div className="absolute -inset-2 bg-gradient-to-tr from-sky-600/20 to-yellow-500/20 rounded-[2.8rem] blur-xl opacity-50"></div>
                        </div>

                        {/* Dados do Funcionário */}
                        <div className="flex-1 w-full flex flex-col items-center px-8 text-center text-white">
                           <h2 className="text-2xl font-black leading-tight uppercase tracking-tighter mb-1">{printingPass.nome}</h2>
                           <p className="text-[11px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-8">{printingPass.funcao}</p>

                           <div className="grid grid-cols-2 gap-3 w-full mb-10">
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                 <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">ID Registo</p>
                                 <p className="text-[11px] font-black text-white font-mono tracking-tighter">#{printingPass.id.substring(0, 8).toUpperCase()}</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                 <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Validade</p>
                                 <p className="text-[11px] font-black text-white">
                                    {(() => {
                                       const d = new Date();
                                       d.setFullYear(d.getFullYear() + 2);
                                       return d.toLocaleDateString('pt-PT');
                                    })()}
                                 </p>
                              </div>
                           </div>

                           {/* QR Code */}
                           <div className="mt-auto mb-10 bg-white p-2.5 rounded-[1.2rem] shadow-2xl">
                              <QrCode size={40} className="text-zinc-900" />
                           </div>
                        </div>

                        {/* Accents laterais ou inferiores */}
                        <div className="absolute bottom-0 left-0 w-full flex h-1.5">
                           <div className="flex-1 bg-sky-600"></div>
                           <div className="flex-1 bg-yellow-500"></div>
                           <div className="flex-1 bg-zinc-900 border-t border-white/10"></div>
                        </div>
                     </div>

                     <div className="flex gap-4 w-full">
                        <button onClick={() => window.print()} className="flex-1 py-5 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center justify-center gap-3 shadow-xl">
                           <Printer size={20} /> Emitir Passe PVC
                        </button>
                        <button onClick={() => setPrintingPass(null)} className="px-8 py-5 bg-zinc-100 text-zinc-400 rounded-2xl font-black text-xs uppercase hover:bg-zinc-200 transition-all">Sair</button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default HRPage;
