import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { RhCandidaturaPublica, RhVaga } from '../types';
import { Search, ChevronLeft, CheckCircle2, AlertCircle, Clock, Eye, Briefcase } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';

// Extensão manual para conter a relação da vaga
interface CandidaturaCompleta extends RhCandidaturaPublica {
    rh_vagas: RhVaga;
}

const STATUS_MESSAGES = {
    pendente: {
        icon: <Clock size={32} className="text-orange-500" />,
        title: "Candidatura Pendente",
        message: "O seu currículo foi recebido na nossa base de dados com sucesso e encontra-se na fila de espera. A nossa equipa de Recrutamento irá analisá-lo com a maior brevidade possível.",
        color: "bg-orange-50 border-orange-200 text-orange-800"
    },
    em_analise: {
        icon: <Eye size={32} className="text-blue-500" />,
        title: "Em Análise",
        message: "O seu perfil está atualmente a ser avaliado pelos diretores e gestores de Recursos Humanos. Fique atento aos seus contactos para uma potencial entrevista.",
        color: "bg-blue-50 border-blue-200 text-blue-800"
    },
    aprovado: {
        icon: <CheckCircle2 size={32} className="text-green-500" />,
        title: "Candidatura Aprovada",
        message: "O seu perfil foi formalmente aprovado para a fase seguinte! A nossa equipa irá contactá-lo nas próximas horas para o agendamento oficial dos próximos passos.",
        color: "bg-green-50 border-green-200 text-green-800"
    },
    rejeitado: {
        icon: <AlertCircle size={32} className="text-red-500" />,
        title: "Candidatura Não Selecionada",
        message: "Agradecemos o seu tempo, no entanto, após cuidada análise não seguiremos com a sua candidatura para esta posição. O seu currículo ficará guardado para eventuais oportunidades futuras.",
        color: "bg-red-50 border-red-200 text-red-800"
    }
};

const PublicCandidaturaStatus: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [candidaturas, setCandidaturas] = useState<CandidaturaCompleta[]>([]);
    
    const [credentials, setCredentials] = useState({
        email: '',
        bi: ''
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSearched(false);
        
        try {
            // Nota: RLS para candidaturas permite SELECT se fizermos eq nos nossos próprios dados.
            // Para não quebrar RLS de segurança dos CVs dos outros, precisamos que a RLS permita SELECT aos próprios.
            // O sistema permite anon SELECT se for sem auth? Depende da RLS configurada.
            // Mas vamos buscar apenas registos onde o email E bi coincidam com precisão absoluta.
            const { data, error } = await supabase
                .from('rh_candidaturas')
                .select(`
                    *,
                    rh_vagas ( id, titulo, localizacao, tipo_contrato )
                `)
                .eq('email', credentials.email.trim())
                .eq('bi', credentials.bi.trim())
                .order('data_envio', { ascending: false });

            if (error) throw error;
            
            setCandidaturas(data as any);
            setSearched(true);
        } catch (error) {
            console.error('Erro na consulta:', error);
            alert("Não foi possível aceder ao servidor de estados.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
            {/* HEADER SIMPLES */}
            <header className="bg-zinc-900 border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <button onClick={() => navigate('/carreiras')} className="text-zinc-400 hover:text-white font-bold text-sm transition-colors flex items-center gap-2">
                        <ChevronLeft size={20} /> Ver Vagas
                    </button>
                    <div className="w-32 brightness-0 invert opacity-90"><Logo /></div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-20 flex flex-col items-center">
                
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 bg-yellow-500/10 rounded-full mb-6">
                        <Search size={32} className="text-yellow-600" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-4">
                        Consultar Estado da Candidatura
                    </h1>
                    <p className="text-zinc-500 font-medium text-lg leading-relaxed max-w-xl mx-auto">
                        Introduza os dados fornecidos durante a sua última candidatura para verificar em que fase do processo o seu perfil se encontra.
                    </p>
                </div>

                {/* SEARCH FORM */}
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-zinc-100 w-full mb-12">
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Seu E-mail Institucional / Pessoal *</label>
                                <input 
                                    required
                                    type="email" 
                                    value={credentials.email}
                                    onChange={e => setCredentials({...credentials, email: e.target.value})}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nº do seu Bilhete de Identidade *</label>
                                <input 
                                    required
                                    type="text" 
                                    value={credentials.bi}
                                    onChange={e => setCredentials({...credentials, bi: e.target.value})}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                    placeholder="Ex: 000000000LA000"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !credentials.email || !credentials.bi}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white py-5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Pesquisando...</>
                            ) : (
                                <><Search size={20} /> Verificar Estado</>
                            )}
                        </button>
                    </form>
                </div>

                {/* RESULTS */}
                {searched && candidaturas.length === 0 && (
                    <div className="text-center p-12 bg-zinc-100 rounded-[2rem] border border-zinc-200 border-dashed w-full animate-in zoom-in-95">
                        <AlertCircle size={48} className="mx-auto text-zinc-400 mb-4" />
                        <h3 className="text-xl font-black text-zinc-800 mb-2">Nenhuma candidatura encontrada</h3>
                        <p className="text-zinc-500 font-medium">Não conseguimos localizar registos ativos com o E-mail e BI introduzidos. Confirme se enviou e submeteu corretamente o formulário ou tente novamente submeter a vaga.</p>
                        <Link to="/carreiras" className="inline-block mt-6 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 rounded-xl font-bold transition-all">
                            Ver Vagas Abertas
                        </Link>
                    </div>
                )}

                {searched && candidaturas.length > 0 && (
                    <div className="w-full space-y-8 animate-in slide-in-from-bottom flex flex-col items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Resultados Encontrados ({candidaturas.length})</span>
                        
                        {candidaturas.map((cand) => {
                            // Cast status para a key do nosso objeto ou default
                            const statusKey = cand.status as keyof typeof STATUS_MESSAGES;
                            const statusInfo = STATUS_MESSAGES[statusKey] || STATUS_MESSAGES.pendente;

                            return (
                                <div key={cand.id} className={`w-full p-8 md:p-10 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden ${statusInfo.color}`}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        {statusInfo.icon}
                                    </div>
                                    
                                    {/* CABEÇALHO */}
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 bg-white/50 rounded-2xl flex-shrink-0">
                                            {statusInfo.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black">{statusInfo.title}</h3>
                                            <p className="font-semibold opacity-80 mt-1">
                                                Candidatura efetuada a {new Date(cand.data_envio).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* MENSAGEM */}
                                    <div className="bg-white/60 p-6 rounded-2xl mb-8 border border-white/50 shadow-inner">
                                        <p className="font-medium text-lg leading-relaxed">
                                            {statusInfo.message}
                                        </p>
                                    </div>

                                    {/* VAGA TARGET */}
                                    <div className="flex bg-white/80 items-center justify-between p-4 rounded-2xl border border-white/60">
                                        <div className="flex items-center gap-4">
                                            <Briefcase className="text-zinc-400" size={24} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Vaga Aplicada</p>
                                                <p className="font-bold">{cand.rh_vagas?.titulo || 'Vaga Não Especificada'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </main>
        </div>
    );
};

export default PublicCandidaturaStatus;
