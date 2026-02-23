
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
   Truck, Search, Plus, Bike, Camera, Edit, Trash2, X, Save,
   MapPin, IdCard, CheckCircle2, Upload, File, User, DollarSign,
   Briefcase, Calendar, AlertCircle, FileText, LayoutDashboard,
   BarChart3, PieChart as PieIcon, TrendingUp, TrendingDown, Layers,
   BellRing, CalendarDays, AlertTriangle, BarChart4, Wallet,
   GraduationCap, Users, Home, RefreshCw, ShieldCheck, Shirt, Package
} from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
   PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import { supabase } from '../src/lib/supabase';
import { Motoqueiro } from '../types';
import { formatAOA } from '../constants';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const calculateAge = (birthDate: string) => {
   if (!birthDate) return 0;
   const today = new Date();
   const birth = new Date(birthDate);
   let age = today.getFullYear() - birth.getFullYear();
   const m = today.getMonth() - birth.getMonth();
   if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
   return Math.max(0, age);
};

const COLORS = ['#eab308', '#22c55e', '#ef4444', '#3b82f6'];
const CONTRACT_COLORS = ['#22c55e', '#f59e0b', '#94a3b8']; // Verde (Ativo), Laranja (A terminar), Cinza (Terminado)

const TransportPage: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'dashboard' | 'frota'>('dashboard');
   const [showModal, setShowModal] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [editingItem, setEditingItem] = useState<Motoqueiro | null>(null);
   const [photoPreview, setPhotoPreview] = useState<string | null>(null);
   const photoInputRef = useRef<HTMLInputElement>(null);
   const [loading, setLoading] = useState(true);

   const [provincias] = useState<string[]>(['Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire']);
   const [municipios] = useState<string[]>(['Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Cubal']);
   const [grupos] = useState<string[]>(['Geral', 'Baia-A', 'Lobito-B', 'Expresso-Sul', 'Logística-Norte']);
   const [supervisores] = useState<string[]>(['Seixas Albeto', 'Luís Conde', 'Mário Silva', 'João Baptista']);

   const [motoqueiros, setMotoqueiros] = useState<Motoqueiro[]>([]);

   const fetchFleetData = async () => {
      setLoading(true);
      try {
         const { data, error } = await supabase
            .from('expr_fleet')
            .select('*')
            .order('created_at', { ascending: false });
         if (error) throw error;
         if (data) setMotoqueiros(data as unknown as Motoqueiro[]);
      } catch (error) {
         console.error('Error fetching fleet data:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchFleetData();
   }, []);

   // --- ANALYTICS & DASHBOARD DATA ---
   const stats = useMemo(() => {
      const total = motoqueiros.length;
      const ativos = motoqueiros.filter(m => m.status === 'Ativo');
      const countAtivos = ativos.length;
      const parados = total - countAtivos;
      const dividaTotal = motoqueiros.reduce((acc, m) => acc + (m.divida || 0), 0);

      // -- CÁLCULOS FINANCEIROS DE PRESTAÇÃO (Agregados da Frota Ativa) --
      const totalDiario = ativos.reduce((acc, m) => acc + (m.prestacao || 0), 0);
      const totalSemanal = ativos.reduce((acc, m) => acc + (m.prestacao_semanal || (m.prestacao * 6) || 0), 0);
      const totalMensal = ativos.reduce((acc, m) => acc + (m.prestacao_mensal || (m.prestacao * 24) || 0), 0);
      const totalAnual = ativos.reduce((acc, m) => acc + (m.prestacao_anual || (m.prestacao * 288) || 0), 0);

      const financialProjectionData = [
         { name: 'Diário', valor: totalDiario },
         { name: 'Semanal', valor: totalSemanal },
         { name: 'Mensal', valor: totalMensal }
      ];

      // -- LÓGICA DE CONTRATOS --
      const today = new Date();
      const contractAlerts: { id: string, nome: string, dias: number, matricula: string }[] = [];
      let contratosVigentes = 0;
      let contratosQuaseTerminando = 0; // <= 30 dias
      let contratosTerminados = 0;

      // -- LÓGICA DE ADMISSÃO MENSAL --
      const admissionData = [
         { name: 'Jan', admissoes: 0 }, { name: 'Fev', admissoes: 0 }, { name: 'Mar', admissoes: 0 },
         { name: 'Abr', admissoes: 0 }, { name: 'Mai', admissoes: 0 }, { name: 'Jun', admissoes: 0 },
         { name: 'Jul', admissoes: 0 }, { name: 'Ago', admissoes: 0 }, { name: 'Set', admissoes: 0 },
         { name: 'Out', admissoes: 0 }, { name: 'Nov', admissoes: 0 }, { name: 'Dez', admissoes: 0 }
      ];

      motoqueiros.forEach(m => {
         if (m.status !== 'Ativo') {
            contratosTerminados++;
         } else {
            if (m.data_saida) {
               const dataFim = new Date(m.data_saida);
               const diffTime = dataFim.getTime() - today.getTime();
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

               if (diffDays <= 0) {
                  contratosTerminados++;
               } else if (diffDays <= 30) {
                  contratosQuaseTerminando++;
                  contractAlerts.push({ id: m.id, nome: m.nome, dias: diffDays, matricula: m.matricula });
               } else {
                  contratosVigentes++;
               }
            } else {
               contratosVigentes++;
            }
         }

         if (m.data_entrada) {
            const dataEntrada = new Date(m.data_entrada);
            const mesIndex = dataEntrada.getMonth();
            if (mesIndex >= 0 && mesIndex < 12) {
               admissionData[mesIndex].admissoes++;
            }
         }
      });

      const contractPieData = [
         { name: 'Vigentes', value: contratosVigentes },
         { name: 'A Terminar (<30d)', value: contratosQuaseTerminando },
         { name: 'Terminados', value: contratosTerminados }
      ];

      const operationalPieData = [
         { name: 'Ativos', value: countAtivos },
         { name: 'Inativos', value: motoqueiros.filter(m => m.status === 'Inativo').length },
         { name: 'Manutenção', value: 0 } // Placeholder until integrated with Maintenance
      ];

      return {
         total: total || 0,
         countAtivos: countAtivos || 0,
         parados: parados || 0,
         dividaTotal: dividaTotal || 0,
         totalDiario: totalDiario || 0,
         totalSemanal: totalSemanal || 0,
         totalMensal: totalMensal || 0,
         totalAnual: totalAnual || 0,
         financialProjectionData: financialProjectionData || [],
         contractPieData: contractPieData || [],
         admissionData: admissionData || [],
         contractAlerts: contractAlerts || [],
         contratosQuaseTerminando: contratosQuaseTerminando || 0,
         contratosVigentes: contratosVigentes || 0,
         contratosTerminados: contratosTerminados || 0,
         operationalPieData: operationalPieData || []
      };
   }, [motoqueiros]);

   // Estado unificado do formulário
   const [formDataContract, setFormDataContract] = useState({
      // Contratual & Financeiro
      data_entrada: new Date().toISOString().split('T')[0],
      tempo_contrato: '12',
      data_saida: '',
      prestacao_diaria: 3000,
      prestacao_semanal: 15000,
      prestacao_mensal: 60000,
      prestacao_anual: 720000,
      divida: 0,
      divida_inicial: 0,
      observacoes: '',

      // Pessoal
      provincia: 'Benguela', // Província de Residência
      municipio_residencia: 'Benguela', // Município de Residência
      data_nascimento: '',
      idade: 0,
      sexo: 'Masculino' as any,
      nacionalidade: 'Angolana',
      naturalidade: 'Benguela', // Local de Nascimento
      email: '',
      nome_pai: '',
      nome_mae: '',
      morada: '',
      telefone_alternativo: '',
      escolaridade: 'Ensino Médio',
      formacao: '',
      estado_civil: 'Solteiro(a)',
      num_filhos: 0,
      tempo_servico: 0,
      notas_pessoais: '',

      // Equipamento & Operação
      mota_descricao: '',
      matricula: '',
      mota_marca: 'Lingken 125',
      mota_cor: '',
      mota_quadro: '',
      mota_motor: '',
      mota_chama: '',
      mota_data_compra: '',
      mota_preco: 0,
      grupo: 'Geral',
      supervisor: 'Seixas Albeto',
      municipio: 'Benguela', // Município de Operação

      // Docs
      doc_bi: '',
      doc_carta_conducao: '',
      doc_cv: '',
      doc_motivacao: '',
      doc_outros: '',

      // Gestão de Equipamento & Operação (Novos Campos)
      epi_capacete: false,
      epi_colete: false,
      epi_mochila: false,
      consumo_mensal_estimado: 0,
      historico_ocorrencias: ''
   });

   // Cálculo da Idade (Automático)
   useEffect(() => {
      if (formDataContract.data_nascimento) {
         setFormDataContract(prev => ({ ...prev, idade: calculateAge(prev.data_nascimento) }));
      }
   }, [formDataContract.data_nascimento]);

   // Cálculo Financeiro e de Datas (Contrato)
   useEffect(() => {
      const meses = Number(formDataContract.tempo_contrato) || 0;
      const diaria = 3000;
      const semanal = 15000;
      const mensal = 60000;
      const anual = mensal * meses;

      let dataFim = '';
      if (formDataContract.data_entrada && meses > 0) {
         const d = new Date(formDataContract.data_entrada);
         d.setMonth(d.getMonth() + meses);
         dataFim = d.toISOString().split('T')[0];
      }

      setFormDataContract(prev => ({
         ...prev,
         prestacao_diaria: diaria,
         prestacao_semanal: semanal,
         prestacao_mensal: mensal,
         prestacao_anual: anual,
         data_saida: dataFim
      }));
   }, [formDataContract.data_entrada, formDataContract.tempo_contrato]);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
      const file = e.target.files?.[0];
      if (file) {
         if (file.size > 5 * 1024 * 1024) {
            alert("O ficheiro é demasiado grande. Máximo 5MB.");
            return;
         }
         const reader = new FileReader();
         reader.onloadend = () => {
            setFormDataContract(prev => ({ ...prev, [field]: reader.result as string }));
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!photoPreview) { alert("A foto é obrigatória."); return; }
      const fd = new FormData(e.target as HTMLFormElement);

      const data: Motoqueiro = {
         id: editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9),
         nome: fd.get('nome') as string,
         bilhete: fd.get('bilhete') as string,
         telefone: fd.get('telefone') as string,
         telefone_alternativo: formDataContract.telefone_alternativo,

         // Pessoais
         data_nascimento: formDataContract.data_nascimento,
         idade: formDataContract.idade,
         sexo: formDataContract.sexo,
         nacionalidade: formDataContract.nacionalidade,
         naturalidade: formDataContract.naturalidade,
         nome_pai: formDataContract.nome_pai,
         nome_mae: formDataContract.nome_mae,
         morada: formDataContract.morada,
         provincia: formDataContract.provincia,
         municipio_residencia: formDataContract.municipio_residencia,
         escolaridade: formDataContract.escolaridade,
         formacao: formDataContract.formacao,
         num_filhos: formDataContract.num_filhos,

         // Mota / Equipamento
         mota_descricao: formDataContract.mota_descricao,
         matricula: formDataContract.matricula,
         mota_marca: formDataContract.mota_marca,
         mota_cor: formDataContract.mota_cor,
         mota_quadro: formDataContract.mota_quadro || 'N/A',
         mota_motor: formDataContract.mota_motor || 'N/A',
         mota_chama: fd.get('mota_chama') as string || 'N/A',
         mota_data_compra: formDataContract.mota_data_compra,
         mota_preco: formDataContract.mota_preco,

         // Operacional
         grupo: formDataContract.grupo,
         supervisor: formDataContract.supervisor,
         municipio: formDataContract.municipio,

         // Contrato & Financeiro
         status: 'Ativo',
         foto_url: photoPreview,
         data_entrada: formDataContract.data_entrada,
         data_saida: formDataContract.data_saida,
         prestacao: formDataContract.prestacao_diaria,
         prestacao_semanal: formDataContract.prestacao_semanal,
         prestacao_mensal: formDataContract.prestacao_mensal,
         prestacao_anual: formDataContract.prestacao_anual,
         divida: formDataContract.divida,
         divida_inicial: formDataContract.divida_inicial,
         observacoes: formDataContract.observacoes,
         tempo_contrato: formDataContract.tempo_contrato,

         // Documentos
         doc_bi: formDataContract.doc_bi,
         doc_carta_conducao: formDataContract.doc_carta_conducao,
         doc_cv: formDataContract.doc_cv,
         doc_motivacao: formDataContract.doc_motivacao,
         notas_pessoais: formDataContract.notas_pessoais,

         // Operacional & EPI
         epi_capacete: formDataContract.epi_capacete,
         epi_colete: formDataContract.epi_colete,
         epi_mochila: formDataContract.epi_mochila,
         consumo_mensal_estimado: formDataContract.consumo_mensal_estimado,
         historico_ocorrencias: formDataContract.historico_ocorrencias
      } as any;

      try {
         const { error } = await supabase.from('expr_fleet').upsert([data]);
         if (error) throw error;
         fetchFleetData();
         setShowModal(false);
      } catch (error) {
         alert('Erro ao salvar motoqueiro');
      }
   };

   const handleEditClick = (m: any) => {
      setEditingItem(m);
      setPhotoPreview(m.foto_url);
      setFormDataContract({
         ...formDataContract,
         // Financeiro e Contrato
         prestacao_diaria: m.prestacao,
         prestacao_semanal: m.prestacao_semanal || 15000,
         prestacao_mensal: m.prestacao_mensal || 60000,
         prestacao_anual: m.prestacao_anual || 720000,
         divida: m.divida,
         divida_inicial: m.divida_inicial || 0,
         data_entrada: m.data_entrada,
         tempo_contrato: m.tempo_contrato,
         observacoes: m.observacoes,

         // Pessoais (Mapeamento Completo)
         data_nascimento: m.data_nascimento || '',
         provincia: m.provincia || 'Benguela',
         naturalidade: m.naturalidade || 'Benguela',
         nacionalidade: m.nacionalidade || 'Angolana',
         nome_pai: m.nome_pai || '',
         nome_mae: m.nome_mae || '',
         morada: m.morada || '',
         telefone_alternativo: m.telefone_alternativo || '',
         municipio_residencia: m.municipio_residencia,
         escolaridade: m.escolaridade || 'Ensino Médio',
         formacao: m.formacao || '',
         sexo: m.sexo || 'Masculino',
         num_filhos: m.num_filhos || 0,
         tempo_servico: 0,
         notas_pessoais: m.notas_pessoais || '',

         // Mota / Equipamento
         mota_descricao: m.mota_descricao || '',
         matricula: m.matricula,
         mota_marca: m.mota_marca,
         mota_cor: m.mota_cor || '',
         mota_quadro: m.mota_quadro,
         mota_motor: m.mota_motor,
         mota_chama: m.mota_chama,
         mota_data_compra: m.mota_data_compra || '',
         mota_preco: m.mota_preco || 0,

         // Operacional
         grupo: m.grupo,
         supervisor: m.supervisor,
         municipio: m.municipio,

         // Docs
         doc_bi: m.doc_bi || '',
         doc_carta_conducao: m.doc_carta_conducao || '',
         doc_cv: m.doc_cv || '',
         doc_motivacao: m.doc_motivacao || '',
         doc_outros: '',

         // Gestão de Equipamento & Operação
         epi_capacete: m.epi_capacete || false,
         epi_colete: m.epi_colete || false,
         epi_mochila: m.epi_mochila || false,
         consumo_mensal_estimado: m.consumo_mensal_estimado || 0,
         historico_ocorrencias: m.historico_ocorrencias || ''
      });
      setShowModal(true);
   };

   const handleDelete = async (id: string, nome: string) => {
      if (confirm(`Tem a certeza que deseja remover ${nome}?`)) {
         try {
            const { error } = await supabase.from('expr_fleet').delete().eq('id', id);
            if (error) throw error;
            fetchFleetData();
         } catch (error) {
            alert('Erro ao remover motoqueiro');
         }
      }
   };

   const filteredMotoqueiros = useMemo(() =>
      motoqueiros.filter(m =>
         m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.matricula.toLowerCase().includes(searchTerm.toLowerCase())
      ),
      [motoqueiros, searchTerm]);

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
            <p className="text-zinc-500 font-bold animate-pulse">Carregando dados da frota...</p>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-20">
         {/* ... (Existing Headers and Dashboard - Unchanged) ... */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
            <div>
               <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Amazing <span className="text-yellow-500">Express</span></h1>
               <p className="text-zinc-500 font-bold mt-1">Gestão de Frota Logística & Colaboradores de Campo</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
               <div className="flex bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
                  <button
                     onClick={() => setActiveTab('dashboard')}
                     className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'}`}
                  >
                     <LayoutDashboard size={16} /> Dashboard
                  </button>
                  <button
                     onClick={() => setActiveTab('frota')}
                     className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'frota' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400 hover:bg-white hover:text-zinc-900'}`}
                  >
                     <Bike size={16} /> Gestão de Frota
                  </button>
               </div>

               <button onClick={() => {
                  setEditingItem(null);
                  setPhotoPreview(null);
                  setFormDataContract({
                     data_entrada: new Date().toISOString().split('T')[0],
                     tempo_contrato: '12',
                     data_saida: '',
                     prestacao_diaria: 3000,
                     prestacao_semanal: 15000,
                     prestacao_mensal: 60000,
                     prestacao_anual: 720000,
                     divida: 0,
                     divida_inicial: 0,
                     observacoes: '',
                     provincia: 'Benguela',
                     municipio_residencia: 'Benguela',
                     data_nascimento: '',
                     idade: 0,
                     sexo: 'Masculino' as any,
                     nacionalidade: 'Angolana',
                     naturalidade: 'Benguela',
                     email: '',
                     nome_pai: '',
                     nome_mae: '',
                     morada: '',
                     telefone_alternativo: '',
                     escolaridade: 'Ensino Médio',
                     formacao: '',
                     estado_civil: 'Solteiro(a)',
                     num_filhos: 0,
                     tempo_servico: 0,
                     notas_pessoais: '',
                     mota_descricao: '',
                     matricula: '',
                     mota_marca: 'Lingken 125',
                     mota_cor: '',
                     mota_quadro: '',
                     mota_motor: '',
                     mota_chama: '',
                     mota_data_compra: '',
                     mota_preco: 0,
                     grupo: 'Geral',
                     supervisor: 'Seixas Albeto',
                     municipio: 'Benguela',
                     doc_bi: '',
                     doc_carta_conducao: '',
                     doc_cv: '',
                     doc_motivacao: '',
                     doc_outros: ''
                  });
                  setShowModal(true);
               }} className="px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-xl shadow-zinc-900/10 hover:bg-yellow-500 hover:text-zinc-900 transition-all active:scale-95 flex items-center gap-3 uppercase text-[10px] tracking-widest">
                  <Plus size={16} /> Nova Admissão Amazing Express
               </button>
            </div>
         </div>

         {/* --- DASHBOARD SECTION --- */}
         {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               {/* ... (Existing dashboard widgets - kept same) ... */}
               {/* Notificações de Contratos a Expirar */}
               {stats.contractAlerts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-[2.5rem] p-8 animate-in zoom-in-95">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                           <BellRing size={24} className="animate-pulse" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-orange-900 uppercase tracking-tight">Alertas de Renovação</h3>
                           <p className="text-orange-700 text-sm font-medium">Existem {stats.contractAlerts.length} contratos a terminar nos próximos 30 dias.</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.contractAlerts.map(alert => (
                           <div key={alert.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-black text-zinc-900">{alert.nome}</p>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase">{alert.matricula}</p>
                              </div>
                              <div className="text-right">
                                 <span className="text-lg font-black text-orange-600">{alert.dias}</span>
                                 <p className="text-[9px] font-bold text-orange-400 uppercase">Dias Restantes</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* PAINEL FINANCEIRO DE PRESTAÇÕES */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all">
                     <div className="flex justify-between items-start">
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Prestação Diária (Total)</p>
                        <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400"><DollarSign size={16} /></div>
                     </div>
                     <p className="text-3xl font-black text-zinc-900 mt-2">{formatAOA(stats.totalDiario)}</p>
                     <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4 overflow-hidden"><div className="h-full bg-green-500 w-[100%]"></div></div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all">
                     <div className="flex justify-between items-start">
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Prestação Semanal</p>
                        <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400"><CalendarDays size={16} /></div>
                     </div>
                     <p className="text-3xl font-black text-zinc-900 mt-2">{formatAOA(stats.totalSemanal)}</p>
                     <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4 overflow-hidden"><div className="h-full bg-blue-500 w-[100%]"></div></div>
                  </div>

                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden flex flex-col justify-between">
                     <div className="flex justify-between items-start z-10">
                        <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">Faturação Mensal (Est)</p>
                        <Wallet size={20} className="text-yellow-500" />
                     </div>
                     <p className="text-3xl font-black mt-2 z-10">{formatAOA(stats.totalMensal)}</p>
                     <p className="text-[9px] font-bold text-zinc-500 uppercase mt-2 z-10">Baseada na frota activa: {stats.countAtivos}</p>
                     <div className="absolute -right-4 -bottom-4 opacity-10"><DollarSign size={100} /></div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all">
                     <div className="flex justify-between items-start">
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Projeção Anual</p>
                        <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400"><TrendingUp size={16} /></div>
                     </div>
                     <p className="text-3xl font-black text-zinc-900 mt-2">{formatAOA(stats.totalAnual)}</p>
                     <p className="text-[9px] font-bold text-green-600 uppercase mt-2">Valor de Contrato Total</p>
                  </div>
               </div>

               {/* NOVOS CARDS DE STATUS DE CONTRATO */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 p-6 rounded-[2.5rem] border border-green-100 flex items-center justify-between shadow-sm">
                     <div>
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Em Vigor</p>
                        <p className="text-3xl font-black text-green-700">{stats.contratosVigentes}</p>
                        <p className="text-[9px] font-bold text-green-600 mt-1">Contratos Ativos</p>
                     </div>
                     <div className="p-4 bg-white rounded-2xl text-green-600 shadow-sm"><CheckCircle2 size={24} /></div>
                  </div>

                  <div className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100 flex items-center justify-between shadow-sm">
                     <div>
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Atenção</p>
                        <p className="text-3xl font-black text-orange-600">{stats.contratosQuaseTerminando}</p>
                        <p className="text-[9px] font-bold text-orange-500 mt-1">Quase a Terminar (-30d)</p>
                     </div>
                     <div className="p-4 bg-white rounded-2xl text-orange-500 shadow-sm"><AlertCircle size={24} /></div>
                  </div>

                  <div className="bg-zinc-100 p-6 rounded-[2.5rem] border border-zinc-200 flex items-center justify-between shadow-sm">
                     <div>
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Histórico</p>
                        <p className="text-3xl font-black text-zinc-500">{stats.contratosTerminados}</p>
                        <p className="text-[9px] font-bold text-zinc-400 mt-1">Finalizados / Inativos</p>
                     </div>
                     <div className="p-4 bg-white rounded-2xl text-zinc-400 shadow-sm"><FileText size={24} /></div>
                  </div>
               </div>

               {/* Charts */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-zinc-400"><Layers className="text-yellow-500" size={14} /> Estado Operacional</h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                           <Pie
                              data={stats.operationalPieData}
                              cx="50%" cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {[
                                 { name: 'Ativos', color: '#22c55e' },
                                 { name: 'Inativos', color: '#94a3b8' },
                                 { name: 'Manutenção', color: '#eab308' }
                              ].map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2"><BarChart4 className="text-zinc-900" size={20} /> Fluxo de Prestação</h3>
                     <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={stats.financialProjectionData} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} width={80} />
                           <Tooltip
                              cursor={{ fill: 'transparent' }}
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              formatter={(value: number) => formatAOA(value)}
                           />
                           <Bar dataKey="valor" fill="#18181b" radius={[0, 6, 6, 0]} barSize={24}>
                              {stats.financialProjectionData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index === 2 ? '#eab308' : '#18181b'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-sky-100 shadow-sm h-[400px]">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2"><CalendarDays className="text-green-600" size={20} /> Saúde dos Contratos</h3>
                     <div className="flex-1 w-full min-h-0 relative h-full">
                        <ResponsiveContainer width="100%" height="80%">
                           <PieChart>
                              <Pie
                                 data={stats.contractPieData}
                                 cx="50%" cy="50%"
                                 innerRadius={60}
                                 outerRadius={100}
                                 paddingAngle={5}
                                 dataKey="value"
                              >
                                 {stats.contractPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CONTRACT_COLORS[index % CONTRACT_COLORS.length]} stroke="none" />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                              <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-32 pb-16">
                           <div className="text-center">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Frota</p>
                              <p className="text-2xl font-black text-zinc-900">{stats.total}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- FLEET LIST SECTION --- */}
         {activeTab === 'frota' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               {/* ... (Existing fleet list content - unchanged) ... */}
               <div className="bg-white p-2 rounded-2xl border border-sky-100 flex items-center shadow-sm w-full md:w-96">
                  <Search className="ml-2 text-zinc-400" size={18} />
                  <input
                     placeholder="Pesquisar matrícula..."
                     className="bg-transparent border-none focus:ring-0 text-sm font-bold text-zinc-700 w-full"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredMotoqueiros.map(m => {
                     let diasRestantes = null;
                     if (m.data_saida && m.status === 'Ativo') {
                        const fim = new Date(m.data_saida);
                        const hoje = new Date();
                        const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                        diasRestantes = diff;
                     }

                     return (
                        <div key={m.id} className="bg-white rounded-[3.5rem] border border-sky-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col relative">
                           <div className="h-64 relative overflow-hidden bg-zinc-100">
                              <img src={m.foto_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent"></div>

                              <div className="absolute top-6 left-6">
                                 <span className="px-3 py-1 bg-yellow-500 text-zinc-900 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">{m.matricula}</span>
                              </div>

                              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleDelete(m.id, m.nome)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"><Trash2 size={16} /></button>
                              </div>

                              <div className="absolute bottom-6 left-8">
                                 <h3 className="text-2xl font-black text-white leading-tight">{m.nome}</h3>
                                 <p className="text-zinc-300 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-1"><Bike size={12} /> {m.mota_marca}</p>
                              </div>
                           </div>

                           <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Prestação Diária</p>
                                    <p className="text-lg font-black text-zinc-900">{formatAOA(m.prestacao)}</p>
                                 </div>
                                 <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Dívida Acumulada</p>
                                    <p className={`text-lg font-black ${m.divida > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatAOA(m.divida || 0)}</p>
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <div className="flex justify-between text-xs font-bold text-zinc-500 border-b border-zinc-50 pb-2">
                                    <span>Supervisor:</span>
                                    <span className="text-zinc-900">{m.supervisor}</span>
                                 </div>
                                 <div className="flex justify-between text-xs font-bold text-zinc-500">
                                    <span>Início Contrato:</span>
                                    <span className="text-zinc-900">{new Date(m.data_entrada).toLocaleDateString()}</span>
                                 </div>
                                 {diasRestantes !== null && diasRestantes <= 30 && (
                                    <div className="flex items-center gap-2 mt-2 bg-orange-50 p-2 rounded-lg border border-orange-100">
                                       <AlertTriangle size={14} className="text-orange-500" />
                                       <span className="text-[10px] font-black text-orange-600 uppercase">Expira em {diasRestantes} dias</span>
                                    </div>
                                 )}
                              </div>

                              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                                 <div title="Capacete" className={`p-2 rounded-xl border ${m.epi_capacete ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-100 text-red-300'}`}>
                                    <ShieldCheck size={14} />
                                 </div>
                                 <div title="Colete" className={`p-2 rounded-xl border ${m.epi_colete ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-100 text-red-300'}`}>
                                    <Shirt size={14} />
                                 </div>
                                 <div title="Mochila" className={`p-2 rounded-xl border ${m.epi_mochila ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-100 text-red-300'}`}>
                                    <Package size={14} />
                                 </div>
                                 {m.historico_ocorrencias && (
                                    <div title="Tem Ocorrências" className="p-2 rounded-xl border bg-orange-50 border-orange-200 text-orange-600 ml-auto">
                                       <AlertTriangle size={14} />
                                    </div>
                                 )}
                              </div>

                              <div className="flex justify-between items-center pt-4 border-t border-zinc-50">
                                 <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    <MapPin size={12} className="text-yellow-600" /> {m.municipio}
                                 </div>
                                 <button
                                    onClick={() => handleEditClick(m)}
                                    className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-lg"
                                 >
                                    Ver Detalhes
                                 </button>
                              </div>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
         )}

         {/* MODAL DE REGISTO / EDIÇÃO COMPLETO */}
         {showModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in">
               <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-3xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                     <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-4">
                        <Edit className="text-yellow-500" /> {editingItem ? 'Actualização de Cadastro Amazing Express' : 'Ficha de Admissão de Colaboradores'}
                     </h2>
                     <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><X size={32} /></button>
                  </div>

                  <form onSubmit={handleSave} className="p-12 space-y-12 overflow-y-auto">
                     {/* DADOS PESSOAIS */}
                     <div className="space-y-8">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] flex items-center gap-3"><User size={20} className="text-zinc-900" /> Identificação & Perfil</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                           {/* FOTO UPLOAD */}
                           <div className="flex flex-col items-center gap-4">
                              <div className="w-full aspect-square bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 overflow-hidden cursor-pointer hover:border-yellow-500 transition-all relative group" onClick={() => photoInputRef.current?.click()}>
                                 {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Camera size={48} />}
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <span className="text-white text-[10px] font-black uppercase">Alterar Foto</span>
                                 </div>
                                 <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) { const r = new FileReader(); r.onload = () => setPhotoPreview(r.result as string); r.readAsDataURL(f); }
                                 }} />
                              </div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Foto de Perfil</p>
                           </div>

                           {/* CAMPOS PESSOAIS */}
                           <div className="md:col-span-3 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <Input name="nome" label="Nome Completo" defaultValue={editingItem?.nome} required />
                                 <Input name="bilhete" label="Nº de BI / Identidade" defaultValue={editingItem?.bilhete} required />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <Input name="telefone" label="Telemóvel" defaultValue={editingItem?.telefone} required />
                                 <div className="grid grid-cols-2 gap-2">
                                    <Input name="nascimento" label="Data Nascimento" type="date" value={formDataContract.data_nascimento} onChange={e => setFormDataContract({ ...formDataContract, data_nascimento: e.target.value })} />
                                    <Input label="Idade" readOnly value={formDataContract.idade} className="bg-zinc-100 font-black text-center border-zinc-200 text-zinc-600 cursor-not-allowed" />
                                 </div>
                                 <Input name="num_filhos" label="Nº de Filhos" type="number" min="0" value={formDataContract.num_filhos} onChange={e => setFormDataContract({ ...formDataContract, num_filhos: Number(e.target.value) })} />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <Select name="naturalidade" label="Naturalidade (Província)" value={formDataContract.naturalidade} onChange={e => setFormDataContract({ ...formDataContract, naturalidade: e.target.value })} options={provincias.map(p => ({ value: p, label: p }))} />
                                 <Input name="nacionalidade" label="Nacionalidade" value={formDataContract.nacionalidade} onChange={e => setFormDataContract({ ...formDataContract, nacionalidade: e.target.value })} />
                                 <Select name="estado_civil" label="Estado Civil" value={formDataContract.estado_civil} onChange={e => setFormDataContract({ ...formDataContract, estado_civil: e.target.value })} options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'].map(o => ({ value: o, label: o }))} />
                              </div>

                              {/* HABILITAÇÕES LITERÁRIAS */}
                              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                                 <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4"><GraduationCap size={14} /> Habilitações Literárias</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Select name="escolaridade" label="Nível de Escolaridade" value={formDataContract.escolaridade} onChange={e => setFormDataContract({ ...formDataContract, escolaridade: e.target.value })} options={['Ensino Básico', 'Ensino Médio', 'Licenciatura', 'Mestrado', 'Doutoramento'].map(o => ({ value: o, label: o }))} />
                                    <Input name="curso" label="Curso / Formação" value={formDataContract.formacao} onChange={e => setFormDataContract({ ...formDataContract, formacao: e.target.value })} placeholder="Ex: Mecânica Geral" />
                                    <Input name="tempo_servico" label="Experiência (Anos)" type="number" min="0" value={formDataContract.tempo_servico} onChange={e => setFormDataContract({ ...formDataContract, tempo_servico: Number(e.target.value) })} />
                                 </div>
                              </div>

                              {/* FILIAÇÃO */}
                              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                                 <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Users size={14} /> Filiação</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input name="pai" label="Nome do Pai" value={formDataContract.nome_pai} onChange={e => setFormDataContract({ ...formDataContract, nome_pai: e.target.value })} />
                                    <Input name="mae" label="Nome da Mãe" value={formDataContract.nome_mae} onChange={e => setFormDataContract({ ...formDataContract, nome_mae: e.target.value })} />
                                 </div>
                              </div>

                              {/* RESIDÊNCIA */}
                              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                                 <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Home size={14} /> Endereço de Residência</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Select name="provincia_residencia" label="Província" value={formDataContract.provincia} onChange={e => setFormDataContract({ ...formDataContract, provincia: e.target.value })} options={provincias.map(p => ({ value: p, label: p }))} />
                                    <Input name="municipio_residencia" label="Município" value={formDataContract.municipio_residencia} onChange={e => setFormDataContract({ ...formDataContract, municipio_residencia: e.target.value })} />
                                    <Input name="morada" label="Bairro / Rua" value={formDataContract.morada} onChange={e => setFormDataContract({ ...formDataContract, morada: e.target.value })} />
                                 </div>
                              </div>

                              {/* DOCUMENTAÇÃO DIGITAL */}
                              <div className="col-span-full pt-2">
                                 <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Upload size={14} /> Documentação Digital</h4>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                       { key: 'doc_bi', label: 'Bilhete Identidade', icon: <IdCard size={20} /> },
                                       { key: 'doc_carta_conducao', label: 'Carta de Condução', icon: <Briefcase size={20} /> },
                                       { key: 'doc_cv', label: 'Curriculum Vitae', icon: <FileText size={20} /> },
                                       { key: 'doc_motivacao', label: 'Carta de Motivação', icon: <File size={20} /> }
                                    ].map((doc) => (
                                       <div key={doc.key} className={`relative p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-yellow-500 group ${formDataContract[doc.key as keyof typeof formDataContract] ? 'bg-green-50 border-green-200' : 'bg-zinc-50 border-zinc-200'}`} onClick={() => document.getElementById(`upload-${doc.key}`)?.click()}>
                                          <div className={`${formDataContract[doc.key as keyof typeof formDataContract] ? 'text-green-600' : 'text-zinc-400 group-hover:text-yellow-500'}`}>
                                             {formDataContract[doc.key as keyof typeof formDataContract] ? <CheckCircle2 size={24} /> : doc.icon}
                                          </div>
                                          <p className="text-[9px] font-black uppercase text-zinc-500 text-center">{doc.label}</p>
                                          <input
                                             type="file"
                                             id={`upload-${doc.key}`}
                                             className="hidden"
                                             accept="image/*,.pdf"
                                             onChange={(e) => handleFileChange(e, doc.key)}
                                          />
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              {/* OBSERVAÇÕES PESSOAIS */}
                              <div className="col-span-full pt-4">
                                 <label className="text-sm font-medium text-zinc-700 mb-1 block">Observações Pessoais / Notas de Entrevista</label>
                                 <textarea
                                    name="notas_pessoais"
                                    className="w-full bg-white border border-zinc-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 min-h-[100px] text-sm resize-none placeholder:text-zinc-300"
                                    placeholder="Detalhes adicionais sobre o candidato, comportamento, referências, etc."
                                    value={formDataContract.notas_pessoais}
                                    onChange={e => setFormDataContract({ ...formDataContract, notas_pessoais: e.target.value })}
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* DADOS DA MOTA / EQUIPAMENTO */}
                     <div className="bg-zinc-50 p-10 rounded-[4rem] border border-zinc-100 space-y-8">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] flex items-center gap-3"><Bike size={20} className="text-zinc-900" /> Detalhes do Equipamento & Operação</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <Input name="mota_descricao" label="Descrição do Artigo" value={formDataContract.mota_descricao} onChange={e => setFormDataContract({ ...formDataContract, mota_descricao: e.target.value })} placeholder="Ex: Mota de Carga" />
                           <Input name="matricula" label="Matrícula Oficial" value={formDataContract.matricula} onChange={e => setFormDataContract({ ...formDataContract, matricula: e.target.value })} required />
                           <Input name="mota_marca" label="Marca e Modelo" value={formDataContract.mota_marca} onChange={e => setFormDataContract({ ...formDataContract, mota_marca: e.target.value })} required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <Input name="mota_cor" label="Cor da Mota" value={formDataContract.mota_cor} onChange={e => setFormDataContract({ ...formDataContract, mota_cor: e.target.value })} />
                           <Input name="mota_quadro" label="Nº Quadro" value={formDataContract.mota_quadro} onChange={e => setFormDataContract({ ...formDataContract, mota_quadro: e.target.value })} placeholder="Opcional" />
                           <Input name="mota_motor" label="Nº Motor" value={formDataContract.mota_motor} onChange={e => setFormDataContract({ ...formDataContract, mota_motor: e.target.value })} placeholder="Opcional" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <Input name="mota_data_compra" label="Data de Aquisição" type="date" value={formDataContract.mota_data_compra} onChange={e => setFormDataContract({ ...formDataContract, mota_data_compra: e.target.value })} />
                           <Input name="mota_preco" label="Preço da Compra (AOA)" type="number" value={formDataContract.mota_preco} onChange={e => setFormDataContract({ ...formDataContract, mota_preco: Number(e.target.value) })} />
                           <Select name="grupo" label="Grupo Logístico" value={formDataContract.grupo} onChange={e => setFormDataContract({ ...formDataContract, grupo: e.target.value })} options={grupos.map(g => ({ value: g, label: g }))} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <Select name="supervisor" label="Supervisor Responsável" value={formDataContract.supervisor} onChange={e => setFormDataContract({ ...formDataContract, supervisor: e.target.value })} options={supervisores.map(s => ({ value: s, label: s }))} />
                           <Select name="municipio" label="Município de Operação" value={formDataContract.municipio} onChange={e => setFormDataContract({ ...formDataContract, municipio: e.target.value })} options={municipios.map(m => ({ value: m, label: m }))} />
                        </div>

                        {/* NOVOS CAMPOS: EPI & OPERAÇÃO */}
                        <div className="pt-6 border-t border-zinc-200">
                           <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-6"><ShieldCheck size={14} /> Equipamento & Proteção (EPI)</h4>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              {[
                                 { key: 'epi_capacete', label: 'Capacete Amazing', icon: <div className="w-5 h-5 bg-zinc-400 rounded-full" /> },
                                 { key: 'epi_colete', label: 'Colete Refletor', icon: <div className="w-5 h-5 bg-orange-400 rounded-sm" /> },
                                 { key: 'epi_mochila', label: 'Mochila Térmica', icon: <div className="w-5 h-5 border-2 border-zinc-400 rounded-lg" /> }
                              ].map((epi) => (
                                 <div
                                    key={epi.key}
                                    onClick={() => setFormDataContract({ ...formDataContract, [epi.key]: !formDataContract[epi.key as keyof typeof formDataContract] })}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formDataContract[epi.key as keyof typeof formDataContract] ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-zinc-100 text-zinc-400 hover:border-yellow-500'}`}
                                 >
                                    {formDataContract[epi.key as keyof typeof formDataContract] ? <CheckCircle2 size={24} /> : epi.icon}
                                    <span className="text-[9px] font-black uppercase text-center">{epi.label}</span>
                                 </div>
                              ))}
                              <div className="col-span-1">
                                 <Input
                                    name="consumo_mensal"
                                    label="Consumo Mensal (Kz)"
                                    type="number"
                                    value={formDataContract.consumo_mensal_estimado}
                                    onChange={e => setFormDataContract({ ...formDataContract, consumo_mensal_estimado: Number(e.target.value) })}
                                    placeholder="Estimativa"
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-sm font-medium text-zinc-700 block text-xs font-black uppercase tracking-widest text-zinc-400">Histórico de Ocorrências / Incidentes</label>
                           <textarea
                              name="historico_ocorrencias"
                              className="w-full bg-white border border-zinc-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 min-h-[100px] text-sm resize-none placeholder:text-zinc-300"
                              placeholder="Registe aqui multas, acidentes ou advertências operacionais..."
                              value={formDataContract.historico_ocorrencias}
                              onChange={e => setFormDataContract({ ...formDataContract, historico_ocorrencias: e.target.value })}
                           />
                        </div>
                     </div>

                     {/* FINANCEIRO */}
                     <div className="bg-zinc-900 p-12 rounded-[4.5rem] text-white space-y-10 border-l-[12px] border-yellow-500 shadow-3xl">
                        <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.5em]">Plano Financeiro & Contrato</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <Input
                              name="tempo_contrato"
                              label="Tempo de Contrato (Meses)"
                              type="number"
                              value={formDataContract.tempo_contrato}
                              onChange={e => setFormDataContract({ ...formDataContract, tempo_contrato: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-white"
                           />
                           <Input
                              name="data_entrada"
                              label="Data de Início"
                              type="date"
                              value={formDataContract.data_entrada}
                              onChange={e => setFormDataContract({ ...formDataContract, data_entrada: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-white"
                           />
                           <Input
                              name="data_saida"
                              label="Data de Término (Automático)"
                              type="date"
                              value={formDataContract.data_saida}
                              readOnly
                              className="bg-zinc-800 border-zinc-700 text-zinc-400 cursor-not-allowed"
                           />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                           <div>
                              <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Diário</p>
                              <p className="text-xl font-black text-white">{formatAOA(3000)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Semanal</p>
                              <p className="text-xl font-black text-white">{formatAOA(15000)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Mensal</p>
                              <p className="text-xl font-black text-white">{formatAOA(60000)}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-yellow-500 uppercase mb-1">Anual (Estimado)</p>
                              <p className="text-xl font-black text-yellow-500">{formatAOA(formDataContract.prestacao_anual)}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="relative">
                              <Input
                                 name="divida_inicial"
                                 label={`Dívida Inicial (${formatAOA(formDataContract.divida_inicial)})`}
                                 icon={<span className="text-zinc-500 font-bold text-xs">Kz</span>}
                                 type="number"
                                 value={formDataContract.divida_inicial}
                                 onChange={e => setFormDataContract({ ...formDataContract, divida_inicial: Number(e.target.value) })}
                                 className={`bg-zinc-800 border-2 font-black ${formDataContract.divida_inicial > 0 ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}
                              />
                              <span className={`absolute right-4 top-9 text-[10px] font-black uppercase ${formDataContract.divida_inicial > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                 {formDataContract.divida_inicial > 0 ? 'Devedor' : 'Regular'}
                              </span>
                           </div>
                           <Input
                              name="divida"
                              label={`Dívida Corrente (${formatAOA(formDataContract.divida)})`}
                              icon={<span className="text-zinc-500 font-bold text-xs">Kz</span>}
                              type="number"
                              value={formDataContract.divida}
                              onChange={e => setFormDataContract({ ...formDataContract, divida: Number(e.target.value) })}
                              className="bg-zinc-800 border-zinc-700 text-white"
                           />
                        </div>
                     </div>

                     <div className="flex justify-end gap-6">
                        <button type="button" onClick={() => setShowModal(false)} className="px-10 py-5 text-[11px] font-black uppercase text-zinc-400">Cancelar</button>
                        <button type="submit" className="px-20 py-6 bg-zinc-900 text-white font-black rounded-3xl uppercase text-[11px] tracking-[0.2em] shadow-3xl hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center gap-4 active:scale-95">
                           <Save size={24} /> {editingItem ? 'Guardar Alterações' : 'Concluir Registo Amazing Express'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default TransportPage;
