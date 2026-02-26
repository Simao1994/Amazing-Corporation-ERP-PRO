import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { ContaBancariaHR, User, Funcionario } from '../types';
import { Building, Search, ArrowLeft, RefreshCw, AlertCircle, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContasBancariasPageProps {
   user: User;
}

interface ContaComFuncionario extends ContaBancariaHR {
   funcionario?: {
      nome: string;
      cargo: string;
      departamento: string;
      foto_url: string;
   };
}

const ContasBancariasPage: React.FC<ContasBancariasPageProps> = ({ user }) => {
   const [contas, setContas] = useState<ContaComFuncionario[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
   const [funcionariosMap, setFuncionariosMap] = useState<Record<string, any>>({});

   const isHRAdmin = ['admin', 'hr', 'director_hr'].includes(user.role);

   const fetchData = async () => {
      setLoading(true);
      try {
         // 1. Buscar os funcionários primeiro para mapear nomes (Alternativa ao JOIN directo se a FK na db não estiver configurada no PostgREST para nested queries)
         const { data: funcData } = await supabase.from('funcionarios').select('id, nome, cargo, departamento, foto_url');
         const map: Record<string, any> = {};
         if (funcData) {
            funcData.forEach(f => {
               map[f.id] = f;
            });
            setFuncionariosMap(map);
         }

         // 2. Buscar as Contas
         const { data: contasData, error } = await supabase
            .from('rh_contas_bancarias')
            .select('*')
            .order('criado_em', { ascending: false });

         if (error) throw error;

         // Juntar os dados
         const completas = (contasData || []).map(c => ({
            ...c,
            funcionario: map[c.funcionario_id] || { nome: 'Desconhecido', cargo: '', foto_url: '' }
         }));

         setContas(completas);
      } catch (err: any) {
         console.error('Erro ao buscar dados de contas:', err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   const contasFiltradas = contas.filter(c => {
      const matchStatus = filtroStatus === 'todos' ? true : c.status === filtroStatus;
      const term = searchTerm.toLowerCase();
      const matchBusca = 
         c.numero_conta.includes(term) || 
         (c.iban && c.iban.toLowerCase().includes(term)) ||
         c.nome_banco.toLowerCase().includes(term) ||
         c.funcionario?.nome.toLowerCase().includes(term) ||
         (c.titular_conta && c.titular_conta.toLowerCase().includes(term));

      return matchStatus && matchBusca;
   });

   const exportToCSV = () => {
      const headers = ['Funcionario', 'Banco', 'Tipo Conta', 'Moeda', 'No. Conta', 'IBAN', 'Titular Se Diferente', 'Principal', 'Status'];
      const rows = contasFiltradas.map(c => [
         `"${c.funcionario?.nome || ''}"`,
         `"${c.nome_banco}"`,
         `"${c.tipo_conta || ''}"`,
         `"${c.moeda}"`,
         `"${c.numero_conta}"`,
         `"${c.iban || ''}"`,
         `"${c.titular_conta || ''}"`,
         c.principal ? 'Sim' : 'Nao',
         c.status
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Contas_Bancarias_RH_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   if (!isHRAdmin) {
      return (
         <div className="flex flex-col flex-1 items-center justify-center p-20 text-center animate-in zoom-in-95 duration-500">
            <AlertCircle size={80} className="text-red-500 mb-6 drop-shadow-2xl opacity-80" />
            <h2 className="text-5xl font-black tracking-tight text-zinc-900 mb-4">Acesso Restrito</h2>
            <p className="text-zinc-500 text-lg mb-8 max-w-lg font-medium leading-relaxed">
               Esta área contém registos sensíveis e requer credenciais de <b>Recursos Humanos</b> ou <b>Administração</b>.
            </p>
            <Link to="/rh" className="px-8 py-4 bg-zinc-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl">
               Voltar ao Módulo RH
            </Link>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-20">
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-sky-200">
            <div className="flex items-center gap-3">
               <Link to="/rh" className="p-3 bg-white rounded-2xl shadow-sm border border-sky-100 hover:bg-zinc-50 transition-all text-zinc-400 hover:text-zinc-900 mr-2">
                  <ArrowLeft size={24} />
               </Link>
               <div className="p-3 bg-zinc-900 rounded-2xl shadow-xl border border-white/10">
                  <Building className="text-yellow-500" size={28} />
               </div>
               <div>
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase leading-none">Contas <span className="text-yellow-500">Bancárias</span></h1>
                  <p className="text-zinc-500 font-bold flex items-center gap-2 mt-1">Diretório Centralizado do Pessoal</p>
               </div>
            </div>
            <div className="flex gap-4">
               <button onClick={fetchData} className="px-5 py-3 bg-white border border-sky-100 text-zinc-600 rounded-xl font-black text-[10px] uppercase hover:bg-zinc-50 transition-all flex items-center gap-2 shadow-sm">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar
               </button>
               <button onClick={exportToCSV} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center gap-2 shadow-xl">
                  <Download size={16} /> Exportar
               </button>
            </div>
         </div>

         {/* Filtros */}
         <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-sky-100 shadow-sm">
            <div className="flex-1 bg-zinc-50 p-2 rounded-2xl flex items-center w-full">
               <Search className="ml-4 text-zinc-400" />
               <input 
                  placeholder="Pesquisar por IBAN, Nome, Banco, Nº Conta..." 
                  className="w-full bg-transparent border-none focus:ring-0 py-3 px-4 font-bold text-zinc-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2 p-2 bg-zinc-50 rounded-2xl w-full md:w-auto">
               {(['todos', 'ativo', 'inativo'] as const).map(status => (
                  <button 
                     key={status}
                     onClick={() => setFiltroStatus(status)}
                     className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex-1 md:flex-none ${filtroStatus === status ? 'bg-white shadow-sm text-zinc-900 border border-zinc-200' : 'text-zinc-400 hover:bg-white/50'}`}
                  >
                     {status}
                  </button>
               ))}
            </div>
         </div>

         {/* Listagem Global */}
         <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
            {loading ? (
               <div className="py-20 text-center"><RefreshCw className="animate-spin mx-auto text-zinc-300 mb-4" size={40} /><p className="text-sm font-bold text-zinc-400">A carregar registos organizacionais...</p></div>
            ) : contasFiltradas.length > 0 ? (
               <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1000px]">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           <th className="px-8 py-6">Colaborador</th>
                           <th className="px-8 py-6">Instituição & Conta</th>
                           <th className="px-8 py-6">IBAN / SWIFT</th>
                           <th className="px-8 py-6">Titular</th>
                           <th className="px-8 py-6">Estado</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50 text-sm">
                        {contasFiltradas.map(conta => (
                           <tr key={conta.id} className="hover:bg-zinc-50/50 transition-all">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <img src={conta.funcionario?.foto_url || `https://ui-avatars.com/api/?name=${conta.funcionario?.nome}`} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                                    <div>
                                       <p className="font-black text-zinc-900">{conta.funcionario?.nome}</p>
                                       <p className="text-[10px] font-bold text-sky-600 uppercase mt-0.5">{conta.funcionario?.cargo}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <p className="font-black text-zinc-700">{conta.nome_banco} <span className="font-normal text-zinc-400 ml-1">({conta.moeda})</span></p>
                                 <p className="text-xs font-mono font-bold text-zinc-500 mt-0.5">{conta.numero_conta}</p>
                              </td>
                              <td className="px-8 py-5">
                                 <p className="font-mono text-xs font-bold text-zinc-700">{conta.iban || '---'}</p>
                                 {conta.swift_bic && <p className="text-[10px] font-black text-zinc-400 uppercase mt-0.5">BIC: {conta.swift_bic}</p>}
                              </td>
                              <td className="px-8 py-5">
                                 <p className="font-bold text-zinc-700 truncate max-w-[150px]" title={conta.titular_conta || conta.funcionario?.nome}>
                                    {conta.titular_conta || <span className="text-zinc-400 italic">O Próprio</span>}
                                 </p>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex flex-col gap-2 items-start">
                                    <span className={`px-3 py-1 mr-2 rounded-lg text-[9px] font-black uppercase inline-block ${conta.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                       {conta.status}
                                    </span>
                                    {conta.principal && <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase inline-block bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200">Principal</span>}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <div className="py-20 text-center flex flex-col items-center">
                  <FileText className="text-zinc-200 mb-4" size={48} />
                  <p className="text-zinc-400 font-bold max-w-sm">Nenhum registo encontrado para os filtros selecionados.</p>
               </div>
            )}
         </div>
      </div>
   );
};

export default ContasBancariasPage;
