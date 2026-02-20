
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
   UserPlus, Search, Plus, Edit, Trash2, X, Save,
   MapPin, Calendar, FileText, IdCard, Phone, Bookmark, Printer,
   TrendingUp, Activity, CheckCircle2, XCircle, Download, BarChart3,
   Filter, Upload, FileSearch, Archive, Award, Briefcase,
   GraduationCap, ClipboardList, Info, ChevronRight, PieChart as PieIcon,
   ShieldCheck, ArrowRight, UserCheck, Globe, Star, RefreshCw,
   Home, ArrowLeft, FileDown, FileSpreadsheet, BriefcaseBusiness,
   SearchCode, ShieldQuestion, Zap, UserSearch, Mail, MailCheck,
   Send, ShieldIcon, Copy, Check
} from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
   PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import { Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Candidatura, CandidaturaStatus, EscolaridadeTipo } from '../types';
import { AmazingStorage } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import Logo from '../components/Logo';

const PROVINCIAS_ANGOLA = [
   'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
   'Cuanza Norte', 'Cuanza Sula', 'Cunene', 'Huambo', 'Huíla',
   'Luanda', 'Lunda Norte', 'Lunda Sula', 'Malanje', 'Moxico',
   'Namibe', 'Uíge', 'Zaire'
];

const ESCOLARIDADES: { value: EscolaridadeTipo; label: string }[] = [
   { value: 'Ensino Primário', label: 'Ensino Primário' },
   { value: 'Ensino Médio', label: 'Ensino Médio (12ª Classe)' },
   { value: 'Licenciatura', label: 'Licenciatura / Bacharelato' },
   { value: 'Mestrado', label: 'Mestrado' },
   { value: 'Doutoramento', label: 'Doutoramento' }
];

interface RecruitmentPageProps {
   isPublic?: boolean;
}

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ isPublic = false }) => {
   const [activeTab, setActiveTab] = useState<'admin' | 'candidatura' | 'publico' | 'analytics' | 'consulta'>(isPublic ? 'candidatura' : 'admin');
   const [showModal, setShowModal] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [editingItem, setEditingItem] = useState<Candidatura | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [isSendingEmail, setIsSendingEmail] = useState(false);
   const [submissionSuccess, setSubmissionSuccess] = useState(false);
   const [submittedEmail, setSubmittedEmail] = useState('');
   const [protocolCode, setProtocolCode] = useState('');

   // Estado para Consulta de Candidato
   const [consultaBI, setConsultaBI] = useState('');
   const [resultadoConsulta, setResultadoConsulta] = useState<Candidatura | null | 'not_found'>(null);
   const [isSearchingProcess, setIsSearchingProcess] = useState(false);

   // Impressão PDF (Ficha individual)
   const [printingCandidato, setPrintingCandidato] = useState<Candidatura | null>(null);

   // Filtros Admin
   const [filterStatus, setFilterStatus] = useState<string>('Todas');
   const [filterProvincia, setFilterProvincia] = useState<string>('Todas');

   const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchCandidaturas = async () => {
      setLoading(true);
      try {
         const { data, error } = await supabase
            .from('recr_candidaturas')
            .select('*')
            .order('data_candidatura', { ascending: false });
         if (error) throw error;
         if (data) {
            // Map common field names if necessary (e.g. short_id -> id)
            const mapped = data.map((c: any) => ({
               ...c,
               id: c.short_id // Use short_id as the primary id in the app
            }));
            setCandidaturas(mapped as unknown as Candidatura[]);
         }
      } catch (error) {
         console.error('Error fetching candidaturas:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchCandidaturas();
   }, []);

   // Form State para Cálculos Automáticos e Uploads
   const [formData, setFormData] = useState({
      data_nascimento: '',
      idade: 0,
      bi_emissao: '',
      bi_validade: '',
      doc_bi: '',
      doc_cv: '',
      doc_certificados: '',
      notificar_email: true
   });

   // Auto-cálculo de Idade
   useEffect(() => {
      if (formData.data_nascimento) {
         const birth = new Date(formData.data_nascimento);
         const now = new Date();
         let age = now.getFullYear() - birth.getFullYear();
         const m = now.getMonth() - birth.getMonth();
         if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
         setFormData(prev => ({ ...prev, idade: Math.max(0, age) }));
      }
   }, [formData.data_nascimento]);

   // Auto-cálculo Validade BI (10 ANOS)
   useEffect(() => {
      if (formData.bi_emissao) {
         const emissao = new Date(formData.bi_emissao);
         const validade = new Date(emissao);
         validade.setFullYear(validade.getFullYear() + 10);
         setFormData(prev => ({ ...prev, bi_validade: validade.toISOString().split('T')[0] }));
      }
   }, [formData.bi_emissao]);


   // ENGINE ANALYTICS
   const analytics = useMemo(() => {
      const total = candidaturas.length;
      const aprovados = candidaturas.filter(c => c.status === 'aprovado').length;
      const rejeitados = candidaturas.filter(c => c.status === 'rejeitado').length;
      const pendentes = candidaturas.filter(c => c.status === 'pendente').length;

      const provMap: Record<string, number> = {};
      candidaturas.forEach(c => provMap[c.provincia] = (provMap[c.provincia] || 0) + 1);
      const provData = Object.entries(provMap).map(([name, value]) => ({ name, value }));

      const escMap: Record<string, number> = {};
      candidaturas.forEach(c => escMap[c.escolaridade] = (escMap[c.escolaridade] || 0) + 1);
      const escData = Object.entries(escMap).map(([name, value]) => ({ name, value }));

      return { total, aprovados, rejeitados, pendentes, provData, escData };
   }, [candidaturas]);

   const filteredCandidaturas = useMemo(() => {
      return candidaturas.filter(c => {
         const matchSearch = (
            (c.nome || '') + ' ' +
            (c.sobrenome || '') + ' ' +
            (c.bi_numero || '') + ' ' +
            (c.curso || '')
         ).toLowerCase().includes(searchTerm.toLowerCase());

         const matchStatus = filterStatus === 'Todas' || c.status === filterStatus;
         const matchProv = filterProvincia === 'Todas' || c.provincia === filterProvincia;

         return matchSearch && matchStatus && matchProv;
      });
   }, [candidaturas, searchTerm, filterStatus, filterProvincia]);

   const handleConsulta = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSearchingProcess(true);
      setResultadoConsulta(null);

      try {
         const cleanInput = consultaBI.trim().toUpperCase();
         const { data, error } = await supabase
            .from('recr_candidaturas')
            .select('*')
            .or(`bi_numero.eq.${cleanInput},short_id.eq.${cleanInput}`)
            .maybeSingle();

         if (error) throw error;
         if (data) {
            setResultadoConsulta({ ...data, id: data.short_id } as any);
         } else {
            setResultadoConsulta('not_found');
         }
      } catch (error) {
         console.error('Erro na consulta:', error);
         setResultadoConsulta('not_found');
      } finally {
         setIsSearchingProcess(false);
      }
   };

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'doc_bi' | 'doc_cv' | 'doc_certificados') => {
      const file = e.target.files?.[0];
      if (file) {
         if (file.size > 10 * 1024 * 1024) {
            alert("O ficheiro é demasiado grande. Máximo 10MB.");
            return;
         }
         const reader = new FileReader();
         reader.onload = (event) => {
            setFormData(prev => ({ ...prev, [field]: event.target?.result as string }));
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSaveCandidatura = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSaving(true);
      const fd = new FormData(e.currentTarget);
      const email = fd.get('email') as string;
      const generatedId = editingItem ? editingItem.id : Math.random().toString(36).substr(2, 6).toUpperCase();

      // Preparar dados para o Supabase
      const dbData = {
         short_id: generatedId,
         nome: fd.get('nome') as string,
         sobrenome: fd.get('sobrenome') as string,
         data_nascimento: formData.data_nascimento,
         idade: formData.idade,
         bi_numero: fd.get('bi_numero') as string,
         bi_emissao: formData.bi_emissao,
         bi_validade: formData.bi_validade,
         nacionalidade: fd.get('nacionalidade') as string,
         naturalidade: fd.get('naturalidade') as string,
         provincia: fd.get('provincia') as string,
         morada: fd.get('morada') as string,
         nome_pai: fd.get('nome_pai') as string,
         nome_mae: fd.get('nome_mae') as string,
         estado_civil: fd.get('estado_civil') as string,
         telefone: fd.get('telefone') as string,
         email: email,
         carta_conducao: fd.get('carta') as string,
         experiencia: fd.get('experiencia') as string,
         escolaridade: fd.get('escolaridade') as any,
         curso: fd.get('curso') as string,
         certificacoes: fd.get('certificacoes') as string,
         doc_bi: formData.doc_bi || editingItem?.doc_bi,
         doc_cv: formData.doc_cv || editingItem?.doc_cv,
         doc_certificados: formData.doc_certificados || editingItem?.doc_certificados,
         status: editingItem?.status || 'pendente',
         data_candidatura: editingItem?.data_candidatura || new Date().toISOString(),
         notas_internas: (fd.get('notas_internas') as string) || editingItem?.notas_internas
      };

      try {
         const { error } = await supabase.from('recr_candidaturas').upsert([dbData], { onConflict: 'short_id' });
         if (error) throw error;

         if (formData.notificar_email) {
            setIsSendingEmail(true);
            // Simular envio de e-mail (2 segundos)
            await new Promise(resolve => setTimeout(resolve, 2000));
            setSubmittedEmail(email);
            setProtocolCode(`AMZ-2026-${generatedId}`);
            setIsSendingEmail(false);
         }

         fetchCandidaturas();
         setShowModal(false);
         setEditingItem(null);
         setSubmissionSuccess(true);
         setSubmittedEmail(email);
         setProtocolCode(`AMZ-2026-${generatedId}`);

         AmazingStorage.logAction('Candidatura', 'Recrutamento', `Registo de ${dbData.nome} ${dbData.sobrenome} submetido.`);
      } catch (error) {
         alert('Erro ao salvar candidatura');
         console.error(error);
      } finally {
         setIsSaving(false);
      }
   };

   const updateStatus = async (id: string, newStatus: CandidaturaStatus) => {
      try {
         const { error } = await supabase
            .from('recr_candidaturas')
            .update({ status: newStatus })
            .eq('short_id', id);
         if (error) throw error;
         fetchCandidaturas();
         AmazingStorage.logAction('Status Candidatura', 'Recrutamento', `Candidatura ${id} alterada para ${newStatus}`);
      } catch (error) {
         alert('Erro ao atualizar status');
      }
   };

   const handlePrintIndividual = (c: Candidatura) => {
      setPrintingCandidato(c);
      setTimeout(() => window.print(), 500);
   };

   const exportToExcel = () => {
      const headers = "ID,Nome Completo,BI,Idade,Provincia,Escolaridade,Curso,Status,Data Candidatura\n";
      const rows = filteredCandidaturas.map(c =>
         `${c.id},${c.nome} ${c.sobrenome},${c.bi_numero},${c.idade},${c.provincia},${c.escolaridade},${c.curso},${c.status},${c.data_candidatura}`
      ).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Candidatos_AmazingCorp_${new Date().toLocaleDateString()}.csv`;
      link.click();
   };

   const exportToDoc = () => {
      const content = `AMAZING CORPORATION - RELATÓRIO DE CANDIDATURAS\n` +
         `Data: ${new Date().toLocaleString()}\n` +
         `--------------------------------------------------\n\n` +
         filteredCandidaturas.map(c =>
            `NOME: ${c.nome} ${c.sobrenome}\nCURSO: ${c.curso}\nPROVÍNCIA: ${c.provincia}\nSTATUS: ${c.status}\n-----------------`
         ).join("\n\n");
      const blob = new Blob([content], { type: 'application/msword' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Relatorio_Recrutamento.doc`;
      link.click();
   };

   if (submissionSuccess) {
      return (
         <div className="min-h-screen bg-[#e0f2fe] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white max-w-xl w-full p-10 rounded-[4rem] shadow-3xl text-center space-y-8 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>

               <div className="relative">
                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                     <MailCheck size={48} className="animate-bounce" />
                  </div>
                  <span className="absolute top-0 right-[35%] bg-zinc-900 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full border-2 border-white">Status: Entregue</span>
               </div>

               <div className="space-y-3">
                  <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight leading-none">Candidatura Recebida!</h2>
                  <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-[0.2em]">O seu futuro começa agora na Amazing Corp.</p>
               </div>

               <div className="bg-zinc-50 p-8 rounded-[3rem] border border-zinc-100 space-y-4 text-left">
                  <div className="flex justify-between items-start">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Protocolo Digital Enviado</p>
                     <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                  <p className="text-zinc-600 font-medium text-sm leading-relaxed">
                     Enviámos o comprovativo detalhado e os próximos passos da triagem para:
                  </p>
                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                     <Mail className="text-sky-500" size={20} />
                     <p className="text-zinc-900 font-black text-base break-all flex-1">{submittedEmail}</p>
                  </div>
                  <div className="pt-4 border-t border-dashed border-zinc-200 flex justify-between items-center">
                     <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Cód. Rastreio</p>
                        <p className="text-sm font-black text-zinc-900">{protocolCode}</p>
                     </div>
                     <button onClick={() => { navigator.clipboard.writeText(protocolCode); alert("Código copiado!"); }} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><Copy size={16} /></button>
                  </div>
               </div>

               <div className="flex flex-col gap-3">
                  <button
                     onClick={() => { setSubmissionSuccess(false); window.location.hash = '#/'; }}
                     className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                  >
                     <Home size={18} /> Voltar à Página Inicial
                  </button>
                  <p className="text-zinc-400 text-[10px] font-medium italic">Caso não localize o e-mail, verifique a pasta de SPAM ou Promoções.</p>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className={`space-y-8 animate-in fade-in duration-700 pb-24 ${isPublic ? 'min-h-screen bg-[#e0f2fe] p-8 lg:p-12' : ''}`}>

         {/* PRINT VIEW: FICHA INDIVIDUAL */}
         {printingCandidato && (
            <div className="print-only fixed inset-0 z-[200] bg-white p-12">
               <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-8 mb-10">
                  <Logo className="h-12" />
                  <div className="text-right">
                     <h1 className="text-3xl font-black uppercase">Ficha de Candidato</h1>
                     <p className="text-zinc-500 font-bold uppercase tracking-widest">Candidatura Online v2026</p>
                     <p className="text-xs font-black text-yellow-600">ID: {printingCandidato.id}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-10 mb-10">
                  <div className="space-y-4">
                     <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b pb-1">Identificação</h3>
                     <p className="text-xl font-black">{printingCandidato.nome} {printingCandidato.sobrenome}</p>
                     <p className="text-sm"><b>BI:</b> {printingCandidato.bi_numero}</p>
                     <p className="text-sm"><b>Data Nasc:</b> {new Date(printingCandidato.data_nascimento).toLocaleDateString()}</p>
                     <p className="text-sm"><b>Idade:</b> {printingCandidato.idade} Anos</p>
                     <p className="text-sm"><b>Email:</b> {printingCandidato.email}</p>
                     <p className="text-sm"><b>Telefone:</b> {printingCandidato.telefone}</p>
                  </div>
                  <div className="space-y-4">
                     <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b pb-1">Perfil Profissional</h3>
                     <p className="text-lg font-bold text-sky-600">{printingCandidato.curso}</p>
                     <p className="text-sm"><b>Escolaridade:</b> {printingCandidato.escolaridade}</p>
                     <p className="text-sm"><b>Província:</b> {printingCandidato.provincia}</p>
                     <p className="text-sm"><b>Licença de Condução:</b> {printingCandidato.carta_conducao}</p>
                  </div>
               </div>

               <div className="mb-10">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b pb-2 mb-4">Experiência Profissional</h3>
                  <p className="text-sm leading-relaxed text-zinc-700 italic">"{printingCandidato.experiencia}"</p>
               </div>

               <div className="grid grid-cols-2 gap-20 pt-20 border-t border-zinc-200">
                  <div className="text-center border-t border-zinc-900 pt-2">
                     <p className="text-xs font-black uppercase">Assinatura Candidato</p>
                  </div>
                  <div className="text-center border-t border-zinc-900 pt-2">
                     <p className="text-xs font-black uppercase">Validação RH Amazing</p>
                  </div>
               </div>
            </div>
         )}

         {/* HEADER INSTITUCIONAL */}
         {isPublic && (
            <div className="max-w-4xl mx-auto flex justify-between items-center mb-12 print:hidden">
               <Logo className="h-10" showTagline />
               <div className="flex gap-4">
                  <button onClick={() => setActiveTab('consulta')} className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeTab === 'consulta' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-white hover:text-zinc-900'}`}><SearchCode size={18} /> Consultar</button>
                  <Link to="/" className="flex items-center gap-2 text-zinc-500 font-bold text-sm hover:text-zinc-900 transition-all"><Home size={18} /> Início</Link>
               </div>
            </div>
         )}

         {!isPublic ? (
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200 print:hidden">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-zinc-900 rounded-2xl shadow-xl border border-white/10">
                     <BriefcaseBusiness className="text-yellow-500" size={28} />
                  </div>
                  <div>
                     <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase">Candidatura <span className="text-yellow-500">Online</span></h1>
                     <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1">
                        <ShieldCheck size={14} className="text-green-600" /> Painel de Triagem e Auditoria de Talentos
                     </p>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
                  {[
                     { id: 'admin', icon: <ClipboardList size={18} />, label: 'Candidaturas' },
                     { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Estatísticas' },
                     { id: 'publico', icon: <Globe size={18} />, label: 'Vista Pública' },
                  ].map(tab => (
                     <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'}`}>{tab.icon} {tab.label}</button>
                  ))}
               </div>
            </div>
         ) : activeTab !== 'consulta' && (
            <div className="text-center space-y-4 max-w-2xl mx-auto mb-12 print:hidden">
               <h2 className="text-5xl font-black text-zinc-900 uppercase tracking-tighter">Candidatura <span className="text-yellow-500">Online.</span></h2>
               <p className="text-zinc-600 font-medium text-lg leading-relaxed">Submeta a sua candidatura com precisão. O seu percurso será avaliado criteriosamente pelo nosso Conselho de Gestão de Talentos.</p>
            </div>
         )}

         {/* --- TAB: CONSULTA --- */}
         {activeTab === 'consulta' && (
            <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 space-y-12">
               <div className="bg-zinc-900 p-12 rounded-[4rem] shadow-3xl border border-yellow-500/20 text-center space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                     <UserSearch size={200} className="text-white" />
                  </div>
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-yellow-500 relative z-10">
                     <ShieldQuestion size={40} />
                  </div>
                  <div className="space-y-2 relative z-10">
                     <h2 className="text-3xl font-black text-white uppercase tracking-tight">Consultar Estado</h2>
                     <p className="text-zinc-400 font-medium">Insira o seu número de BI ou o código da sua candidatura.</p>
                  </div>
                  <form onSubmit={handleConsulta} className="space-y-4 relative z-10">
                     <div className="bg-white/5 p-2 rounded-2xl border border-white/10 flex items-center gap-4 focus-within:border-yellow-500 transition-all">
                        <IdCard className="ml-4 text-zinc-500" />
                        <input
                           placeholder="Nº BI ou Código de Registo"
                           className="w-full bg-transparent border-none focus:ring-0 font-black text-lg py-4 text-white placeholder:text-zinc-600"
                           value={consultaBI}
                           onChange={e => setConsultaBI(e.target.value)}
                           required
                        />
                     </div>
                     <button
                        type="submit"
                        disabled={isSearchingProcess}
                        className="w-full py-6 bg-yellow-500 text-zinc-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                     >
                        {isSearchingProcess ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
                        {isSearchingProcess ? 'Processando...' : 'Pesquisar Processo'}
                     </button>
                  </form>
               </div>

               {resultadoConsulta && resultadoConsulta !== 'not_found' && (
                  <div className="bg-white p-10 rounded-[4rem] border-l-[12px] border-yellow-500 shadow-2xl animate-in zoom-in-95 flex flex-col md:flex-row items-center justify-between gap-6">
                     <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Candidato Localizado</p>
                        <h3 className="text-2xl font-black text-zinc-900">{resultadoConsulta.nome} {resultadoConsulta.sobrenome}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <p className="text-zinc-500 font-bold text-sm">{resultadoConsulta.curso}</p>
                           <span className="text-[9px] bg-zinc-100 px-2 py-0.5 rounded font-black text-zinc-400">ID: {resultadoConsulta.id}</span>
                        </div>
                     </div>
                     <div className="text-center md:text-right">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Estado do Teu Processo</p>
                        <div className="flex flex-col items-center md:items-end gap-2">
                           <span className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm ${resultadoConsulta.status === 'aprovado' ? 'bg-green-100 text-green-700 border-green-200' :
                              resultadoConsulta.status === 'rejeitado' ? 'bg-red-100 text-red-700 border-red-200' :
                                 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              }`}>
                              {resultadoConsulta.status}
                           </span>
                           {resultadoConsulta.status === 'pendente' && (
                              <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1 animate-pulse">Em triagem pelos RH...</p>
                           )}
                        </div>
                     </div>
                  </div>
               )}

               {resultadoConsulta === 'not_found' && (
                  <div className="bg-red-50 p-10 rounded-[4rem] border-2 border-dashed border-red-200 text-center animate-in shake duration-500">
                     <XCircle size={40} className="text-red-500 mx-auto mb-4" />
                     <p className="text-red-600 font-black uppercase text-xs tracking-widest">Nenhuma candidatura encontrada para este Nº de BI ou Código.</p>
                     <p className="text-red-400 text-[10px] font-bold mt-2">Certifique-se de que inseriu os dados correctamente conforme a sua inscrição.</p>
                  </div>
               )}
            </div>
         )}

         {/* --- TAB: ANALYTICS --- */}
         {activeTab === 'analytics' && !isPublic && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white group border border-white/5 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Zap size={80} /></div>
                     <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Candidaturas</p>
                     <p className="text-4xl font-black text-white">{analytics.total}</p>
                     <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2 py-1 rounded-lg w-fit">
                        <Activity size={12} /> Operacional
                     </div>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white border border-green-500/20 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-green-500"><UserCheck size={80} /></div>
                     <p className="text-green-400 text-[10px] font-black uppercase tracking-widest mb-2">Aprovados</p>
                     <p className="text-4xl font-black text-green-500">{analytics.aprovados}</p>
                     <p className="text-[9px] font-black text-zinc-500 uppercase mt-2">Prontos para admissão</p>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden border border-yellow-500/20">
                     <PieIcon className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                     <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Pendentes</p>
                     <p className="text-3xl font-black text-white">{analytics.pendentes}</p>
                     <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full" style={{ width: `${(analytics.pendentes / (analytics.total || 1)) * 100}%` }}></div>
                     </div>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white border border-red-500/20 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-red-500"><XCircle size={80} /></div>
                     <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2">Rejeitados</p>
                     <p className="text-4xl font-black text-red-500">{analytics.rejeitados}</p>
                     <p className="text-[9px] font-black text-zinc-500 uppercase mt-2">Não compatíveis</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-zinc-900 p-10 rounded-[3rem] shadow-2xl h-[400px] flex flex-col border border-white/5">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-8 flex items-center gap-2 text-white">
                        <MapPin className="text-yellow-500" size={20} /> Candidatos por Província
                     </h3>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={analytics.provData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#71717a' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                              <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#18181b', color: '#fff' }} />
                              <Bar dataKey="value" name="Candidatos" fill="#eab308" radius={[4, 4, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-zinc-900 p-10 rounded-[3rem] shadow-2xl h-[400px] flex flex-col border border-white/5">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-8 flex items-center gap-2 text-white">
                        <GraduationCap className="text-sky-400" size={20} /> Nível de Escolaridade
                     </h3>
                     <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={analytics.escData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                 {analytics.escData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#eab308', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'][index % 5]} />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#18181b', color: '#fff' }} />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#71717a', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- TAB: ADMIN VIEW --- */}
         {!isPublic && activeTab === 'admin' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-white p-6 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 bg-zinc-50 rounded-2xl p-2 flex items-center gap-3 w-full">
                     <Search className="ml-4 text-zinc-300" />
                     <input
                        placeholder="Pesquisar por nome, BI ou curso..."
                        className="w-full bg-transparent border-none focus:ring-0 font-bold text-sm py-2"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-4">
                     <button onClick={exportToExcel} className="p-3 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700" title="Excel"><FileSpreadsheet size={20} /></button>
                     <button onClick={exportToDoc} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700" title="Word"><FileDown size={20} /></button>
                  </div>
               </div>

               <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           <th className="px-8 py-6">Nome / ID</th>
                           <th className="px-8 py-6">Formação</th>
                           <th className="px-8 py-6">BI / Docs</th>
                           <th className="px-8 py-6">Status</th>
                           <th className="px-8 py-6 text-right">Acções</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        {filteredCandidaturas.length > 0 ? filteredCandidaturas.map(c => (
                           <tr key={c.id} className="hover:bg-zinc-50/50 transition-all">
                              <td className="px-8 py-5">
                                 <p className="font-black text-zinc-900 text-sm">{c.nome} {c.sobrenome}</p>
                                 <p className="text-[9px] font-bold text-zinc-400">ID: {c.id}</p>
                              </td>
                              <td className="px-8 py-5">
                                 <p className="text-xs font-bold text-zinc-700">{c.curso}</p>
                                 <p className="text-[9px] text-zinc-400 uppercase">{c.escolaridade}</p>
                              </td>
                              <td className="px-8 py-5">
                                 <p className="text-xs font-black text-zinc-500 mb-1">{c.bi_numero}</p>
                                 <div className="flex gap-1">
                                    {c.doc_bi && <span className="text-[8px] bg-green-50 text-green-600 px-1 font-black">BI OK</span>}
                                    {c.doc_cv && <span className="text-[8px] bg-green-50 text-green-600 px-1 font-black">CV OK</span>}
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${c.status === 'aprovado' ? 'bg-green-100 text-green-700 border-green-200' :
                                    c.status === 'rejeitado' ? 'bg-red-100 text-red-700 border-red-200' :
                                       'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>{c.status}</span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => updateStatus(c.id, 'aprovado')} className="p-2 text-zinc-300 hover:text-green-600" title="Aprovar"><CheckCircle2 size={18} /></button>
                                    <button onClick={() => updateStatus(c.id, 'rejeitado')} className="p-2 text-zinc-300 hover:text-red-500" title="Rejeitar"><XCircle size={18} /></button>
                                    <button onClick={() => handlePrintIndividual(c)} className="p-2 text-zinc-300 hover:text-zinc-900"><Printer size={16} /></button>
                                    <button onClick={() => { setEditingItem(c); setFormData({ ...formData, data_nascimento: c.data_nascimento, bi_emissao: c.bi_emissao }); setShowModal(true); }} className="p-2 text-zinc-300 hover:text-yellow-600"><Edit size={16} /></button>
                                    <button onClick={async () => {
                                       if (confirm(`Remover candidatura de ${c.nome}?`)) {
                                          try {
                                             const { error } = await supabase.from('recr_candidaturas').delete().eq('short_id', c.id);
                                             if (error) throw error;
                                             fetchCandidaturas();
                                          } catch (error) {
                                             alert('Erro ao remover candidatura');
                                          }
                                       }
                                    }} className="p-2 text-zinc-300 hover:text-red-500"><Trash2 size={16} /></button>
                                 </div>
                              </td>
                           </tr>
                        )) : (
                           <tr>
                              <td colSpan={5} className="py-20 text-center text-zinc-400 font-bold italic">
                                 Nenhum candidato encontrado com os termos de pesquisa.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* FORMULÁRIO (PUBLIC OU MODAL) */}
         {(activeTab === 'candidatura' || showModal) && (
            <div className={`${isPublic ? 'max-w-4xl mx-auto' : ''} animate-in slide-in-from-bottom-4`}>
               <form onSubmit={handleSaveCandidatura} className="bg-white p-12 rounded-[4rem] shadow-3xl border border-sky-100 space-y-12">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-8">
                     <div className="space-y-1">
                        <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Ficha de Inscrição</h2>
                        <p className="text-zinc-500 font-medium italic">Portal de Carreiras & Recrutamento Estratégico</p>
                     </div>
                     {!isPublic && <button type="button" onClick={() => setShowModal(false)} className="p-4 bg-zinc-50 rounded-full hover:bg-red-50 text-red-400"><X size={24} /></button>}
                  </div>

                  {/* DADOS PESSOAIS */}
                  <div className="space-y-8">
                     <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] flex items-center gap-3">
                        <IdCard size={18} className="text-zinc-900" /> Identificação Pessoal
                     </h3>
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="nome" label="Nome" required defaultValue={editingItem?.nome} />
                        <Input name="sobrenome" label="Sobrenome" required defaultValue={editingItem?.sobrenome} />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input
                           name="nascimento" label="Data de Nascimento" type="date" required
                           value={formData.data_nascimento}
                           onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                        />
                        <Input label="Idade (Auto)" readOnly value={formData.idade} className="bg-zinc-50 font-black text-center" />
                        <Input name="nacionalidade" label="Nacionalidade" required defaultValue={editingItem?.nacionalidade || 'Angolana'} />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input name="bi_numero" label="Nº BI" required defaultValue={editingItem?.bi_numero} placeholder="000000000XX000" />
                        <Input
                           name="bi_emissao" label="Data Emissão BI" type="date" required
                           value={formData.bi_emissao}
                           onChange={e => setFormData({ ...formData, bi_emissao: e.target.value })}
                        />
                        <Input label="Validade BI (Auto 10 Anos)" readOnly value={formData.bi_validade} className="bg-zinc-50 font-bold" />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="nome_pai" label="Filiação (Pai)" required defaultValue={editingItem?.nome_pai} />
                        <Input name="nome_mae" label="Filiação (Mãe)" required defaultValue={editingItem?.nome_mae} />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <Input name="telefone" label="Telemóvel" required defaultValue={editingItem?.telefone} placeholder="+244" icon={<Phone size={14} />} />
                        <Input name="email" label="E-mail de Notificação" type="email" required defaultValue={editingItem?.email} icon={<Mail size={14} />} />
                     </div>
                  </div>

                  {/* PROFISSIONAL & OBRIGATÓRIO */}
                  <div className="space-y-8">
                     <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Briefcase size={18} className="text-zinc-900" /> Perfil & Requisitos
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select name="escolaridade" label="Escolaridade Máxima" required options={ESCOLARIDADES} defaultValue={editingItem?.escolaridade} />
                        <Input name="curso" label="Área / Curso Principal" required defaultValue={editingItem?.curso} placeholder="Ex: Engenharia de Transportes" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input name="carta" label="Licença de Condução (Obrigatório)" required defaultValue={editingItem?.carta_conducao} placeholder="Nº da Carta de Condução" />
                        <Select name="provincia" label="Província de Residência" required options={PROVINCIAS_ANGOLA.map(p => ({ value: p, label: p }))} defaultValue={editingItem?.provincia || 'Benguela'} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-zinc-700 uppercase tracking-widest ml-1">Resumo de Experiência Profissional</label>
                        <textarea name="experiencia" required defaultValue={editingItem?.experiencia} className="w-full bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 font-medium transition-all h-32" />
                     </div>
                  </div>

                  {/* UPLOADS FUNCIONAIS */}
                  <div className="space-y-8">
                     <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Upload size={18} className="text-zinc-900" /> Documentação de Suporte
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div onClick={() => document.getElementById('up_bi')?.click()} className={`p-8 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${formData.doc_bi ? 'bg-green-50 border-green-200' : 'bg-zinc-50 border-zinc-200 hover:border-yellow-500'}`}>
                           {formData.doc_bi ? <CheckCircle2 className="mx-auto text-green-500 mb-2" /> : <FileSearch className="mx-auto text-zinc-300 mb-2" />}
                           <p className="text-[10px] font-black uppercase text-zinc-400">{formData.doc_bi ? 'BI Carregado' : 'Carregar BI'}</p>
                           <input type="file" id="up_bi" className="hidden" accept="image/*,.pdf" onChange={e => handleFileUpload(e, 'doc_bi')} />
                        </div>
                        <div onClick={() => document.getElementById('up_cv')?.click()} className={`p-8 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${formData.doc_cv ? 'bg-green-50 border-green-200' : 'bg-zinc-50 border-zinc-200 hover:border-yellow-500'}`}>
                           {formData.doc_cv ? <CheckCircle2 className="mx-auto text-green-500 mb-2" /> : <FileText className="mx-auto text-zinc-300 mb-2" />}
                           <p className="text-[10px] font-black uppercase text-zinc-400">{formData.doc_cv ? 'Curriculum Vitae' : 'Carregar CV'}</p>
                           <input type="file" id="up_cv" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileUpload(e, 'doc_cv')} />
                        </div>
                        <div onClick={() => document.getElementById('up_cert')?.click()} className={`p-8 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${formData.doc_certificados ? 'bg-green-50 border-green-200' : 'bg-zinc-50 border-zinc-200 hover:border-yellow-500'}`}>
                           {formData.doc_certificados ? <CheckCircle2 className="mx-auto text-green-500 mb-2" /> : <Award className="mx-auto text-zinc-300 mb-2" />}
                           <p className="text-[10px] font-black uppercase text-zinc-400">{formData.doc_certificados ? 'Certificados OK' : 'Certificados'}</p>
                           <input type="file" id="up_cert" className="hidden" accept=".pdf,.jpg" onChange={e => handleFileUpload(e, 'doc_certificados')} />
                        </div>
                     </div>
                  </div>

                  {/* NOTIFICAÇÃO POR EMAIL */}
                  <div className="bg-sky-50 p-8 rounded-[3rem] border border-sky-100 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-sky-600">
                           <Mail size={24} />
                        </div>
                        <div>
                           <p className="font-black text-zinc-900 uppercase text-xs tracking-widest">Protocolo Digital</p>
                           <p className="text-zinc-500 text-sm font-medium">Desejo receber o comprovativo da candidatura por e-mail.</p>
                        </div>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formData.notificar_email} onChange={e => setFormData({ ...formData, notificar_email: e.target.checked })} className="sr-only peer" />
                        <div className="w-14 h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                     </label>
                  </div>

                  <div className="pt-6 flex justify-end gap-6">
                     <button type="button" onClick={() => isPublic ? (window.location.hash = '#/') : setShowModal(false)} className="px-10 py-5 text-[11px] font-black uppercase text-zinc-400">Cancelar</button>
                     <button type="submit" disabled={isSaving || isSendingEmail} className="px-16 py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-zinc-800 transition-all flex items-center gap-3 disabled:opacity-50">
                        {(isSaving || isSendingEmail) ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                        {isSendingEmail ? 'Enviando Protocolo...' : isSaving ? 'Processando...' : editingItem ? 'Actualizar Registo' : 'Finalizar Candidatura'}
                     </button>
                  </div>
               </form>
            </div>
         )}
      </div>
   );
};

export default RecruitmentPage;
