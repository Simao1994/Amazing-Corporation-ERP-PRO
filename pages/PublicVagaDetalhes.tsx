import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../src/lib/supabase';
import { RhVaga } from '../types';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Briefcase, FileText, CheckCircle2, ChevronLeft, Building2, UploadCloud, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { enviarEmailCandidatura } from '../src/lib/email';

const PublicVagaDetalhes: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [vaga, setVaga] = useState<RhVaga | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Formulário de Candidatura
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        telefone_alternativo: '',
        nivel_academico: '',
        curso: '',
        bi: '',
        estado_civil: '',
        genero: '',
        data_nascimento: '',
        nacionalidade: 'Angolana',
        carta_conducao: '',
        disponibilidade: '',
        morada: '',
        provincia: '',
        naturalidade: '',
        pretensao_salarial: '',
        linkedin_url: '',
        expectativa_5_anos: '',
        sobre_mim: '',
        mensagem: '',
        cvFiles: [] as File[]
    });

    useEffect(() => {
        if (id) fetchVagaDetalhes();
    }, [id]);

    const fetchVagaDetalhes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rh_vagas')
            .select('*')
            .eq('id', id)
            .single();
            
        if (!error && data) {
            setVaga(data);
        }
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            
            // Limit to 4 files total
            if (formData.cvFiles.length + newFiles.length > 4) {
                alert('Pode anexar no máximo 4 ficheiros.');
                return;
            }

            const validFiles = newFiles.filter((file: any) => {
                if (!file.type.match(/(pdf|msword|document)/)) {
                    alert(`O ficheiro ${file.name} não é válido. Apenas PDF ou Word.`);
                    return false;
                }
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    alert(`O ficheiro ${file.name} é demasiado grande. Máximo 5MB.`);
                    return false;
                }
                return true;
            });

            if (validFiles.length > 0) {
                setFormData(prev => ({ 
                    ...prev, 
                    cvFiles: [...prev.cvFiles, ...validFiles].slice(0, 4) 
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vaga) return;
        
        setIsSubmitting(true);
        
        try {
            let userAge = null;
            if (formData.data_nascimento) {
                const diffTime = Math.abs(new Date().valueOf() - new Date(formData.data_nascimento).valueOf());
                userAge = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
            }

            let cv_paths: string[] = [];
            
            // 1. Upload dos CVs para o Storage
            if (formData.cvFiles && formData.cvFiles.length > 0) {
                for (let i = 0; i < formData.cvFiles.length; i++) {
                    const file = formData.cvFiles[i];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `cv_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `candidaturas/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('cvs')
                        .upload(filePath, file);
                        
                    if (uploadError) {
                        console.warn(`Storage upload falhou para ${file.name}:`, uploadError);
                    } else {
                        const { data } = supabase.storage.from('cvs').getPublicUrl(filePath);
                        cv_paths.push(data.publicUrl);
                    }
                }
            }
            
            // Generate single string for doc_cv from array of URLs
            const finalCvPath = cv_paths.join(',');

            // 2. Gravar Registo na Tabela
            const { error: dbError } = await supabase.from('rh_candidaturas').insert({
                vaga_id: vaga.id,
                nome: formData.nome,
                email: formData.email,
                telefone: formData.telefone,
                telefone_alternativo: formData.telefone_alternativo,
                nivel_academico: formData.nivel_academico,
                curso: formData.curso,
                bi: formData.bi,
                estado_civil: formData.estado_civil,
                genero: formData.genero,
                data_nascimento: formData.data_nascimento,
                idade: userAge,
                nacionalidade: formData.nacionalidade,
                carta_conducao: formData.carta_conducao,
                disponibilidade: formData.disponibilidade,
                morada: formData.morada,
                provincia: formData.provincia,
                naturalidade: formData.naturalidade,
                pretensao_salarial: formData.pretensao_salarial,
                linkedin_url: formData.linkedin_url,
                expectativa_5_anos: formData.expectativa_5_anos,
                sobre_mim: formData.sobre_mim,
                mensagem: formData.mensagem,
                cv_path: finalCvPath,
                status: 'pendente'
            });
            
            if (dbError) throw dbError;
            
            // Notification via email
            await enviarEmailCandidatura(formData.nome.split(' ')[0] || formData.nome, formData.email, vaga.titulo);

            setIsSuccess(true);
            
        } catch (error: any) {
            alert('Não foi possível submeter a candidatura. Tente novamente.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                 <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!vaga) {
        return (
            <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
                 <div className="w-40 brightness-0 opacity-20 mb-8"><Logo /></div>
                 <h1 className="text-3xl font-black text-zinc-900 mb-4">Vaga Não Encontrada</h1>
                 <p className="text-zinc-500 mb-8 max-w-md">Esta oportunidade pode ter sido encerrada ou o link é inválido.</p>
                 <button onClick={() => navigate('/carreiras')} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-8 py-4 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2">
                     <ChevronLeft size={20} /> Voltar às Oportunidades
                 </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-100 font-sans pb-24">
            {/* CABEÇALHO PRETO PREMIUM E LOGO A ESQUERDA HOMOGENEO */}
            <header className="bg-zinc-950 border-b border-black sticky top-0 z-50 shadow-2xl">
                <div className="max-w-[1400px] mx-auto px-6 h-28 flex items-center justify-between">
                    
                    {/* Logo volta à ESQUERDA, bem grande, MAS MANTENDO CORES ORIGINAIS */}
                    <div className="w-56 md:w-64 transition-transform hover:scale-105 duration-300 -ml-4"><Logo /></div>
                    
                    {/* Botão Voltar passa para a DIREITA */}
                    <button onClick={() => navigate('/carreiras')} className="px-6 py-3 text-zinc-300 border border-zinc-700 hover:border-yellow-500/50 hover:bg-zinc-800 hover:text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm bg-zinc-900/50">
                        <ChevronLeft size={20} /> Voltar à Lista
                    </button>

                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-12">
                <div className="max-w-4xl mx-auto space-y-16">
                    
                    {/* PARTE SUPERIOR: DETALHES DA VAGA */}
                    <div className="space-y-8">
                        <div>
                            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                                Vaga Aberta
                            </span>
                            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tighter leading-tight mb-6">
                                {vaga.titulo}
                            </h1>
                            
                            <div className="flex flex-wrap gap-4 border-y border-zinc-100 py-6 mb-8">
                                <div className="flex items-center gap-2 text-zinc-600 font-medium">
                                    <MapPin className="text-sky-500" size={20} />
                                    <span>{vaga.localizacao}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 font-medium">
                                    <Clock className="text-green-500" size={20} />
                                    <span>{vaga.tipo_contrato}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 font-medium">
                                    <Building2 className="text-purple-500" size={20} />
                                    <span>{vaga.nivel_experiencia}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 font-medium">
                                    <Building2 className="text-purple-500" size={20} />
                                    <span>{vaga.nivel_experiencia}</span>
                                </div>
                                {(vaga as any).quantidade && (
                                    <div className="flex items-center gap-2 text-zinc-600 font-medium">
                                        <span className="text-zinc-400 font-black tracking-widest uppercase text-[10px] bg-zinc-100 px-2 py-1 rounded">Vagas: {(vaga as any).quantidade}</span>
                                    </div>
                                )}
                                {(vaga as any).data_encerramento && (
                                    <div className="flex items-center gap-2 text-zinc-600 font-medium">
                                        <Clock className="text-red-400" size={20} />
                                        <span>Encerra a: {new Date((vaga as any).data_encerramento).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CONTEÚDO */}
                        <div className="prose prose-zinc max-w-none">
                            <h3 className="text-xl font-black text-zinc-900 mb-4">Sobre a Posição</h3>
                            <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap mb-8">
                                {vaga.descricao}
                            </p>

                            {vaga.requisitos && (
                                <>
                                    <h3 className="text-xl font-black text-zinc-900 mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="text-yellow-500" size={24} /> Requisitos
                                    </h3>
                                    <div className="bg-white p-6 rounded-2xl border border-zinc-100 mb-8 whitespace-pre-wrap text-zinc-600 leading-relaxed">
                                        {vaga.requisitos}
                                    </div>
                                </>
                            )}

                            {vaga.responsabilidades && (
                                <>
                                    <h3 className="text-xl font-black text-zinc-900 mb-4 flex items-center gap-2">
                                        <Briefcase className="text-sky-500" size={24} /> O que irá fazer
                                    </h3>
                                    <div className="bg-white p-6 rounded-2xl border border-zinc-100 whitespace-pre-wrap text-zinc-600 leading-relaxed">
                                        {vaga.responsabilidades}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* PARTE INFERIOR: FORMULÁRIO */}
                    <div>
                        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-zinc-100">
                            
                            {isSuccess ? (
                                <div className="text-center py-10 animate-in zoom-in duration-500">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 size={40} className="text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-zinc-900 mb-4">Candidatura Enviada!</h3>
                                    <p className="text-zinc-500 mb-6 font-medium">
                                        O seu perfil foi encaminhado para a nossa equipa de Recursos Humanos.
                                    </p>
                                    
                                    <div className="bg-sky-50 text-sky-800 p-5 rounded-2xl mb-8 flex flex-col items-center justify-center border border-sky-100 max-w-md mx-auto">
                                        <span className="font-black text-lg flex items-center gap-2 mb-1">📬 Verifique o seu Email</span>
                                        <span className="text-sky-600 text-sm font-medium">Enviamos agora mesmo uma confirmação da sua candidatura.</span>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/carreiras')}
                                        className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition-colors"
                                    >
                                        Ver outras vagas
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-black text-zinc-900 mb-2">Candidatar-me</h3>
                                    <p className="text-zinc-500 text-sm font-medium mb-8">Preencha os seus dados para submeter a candidatura a esta vaga.</p>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome Completo *</label>
                                            <input 
                                                required 
                                                type="text" 
                                                value={formData.nome}
                                                onChange={e => setFormData({...formData, nome: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                placeholder="Primeiro e Último Nome"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Email *</label>
                                            <input 
                                                required 
                                                type="email" 
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                placeholder="o-seu-email@exemplo.com"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Telefone *</label>
                                            <input 
                                                required
                                                type="tel" 
                                                value={formData.telefone}
                                                onChange={e => setFormData({...formData, telefone: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                placeholder="+244 900 000 000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Telefone Alternativo *</label>
                                            <input 
                                                required
                                                type="tel" 
                                                value={formData.telefone_alternativo}
                                                onChange={e => setFormData({...formData, telefone_alternativo: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nº Bilhete de Identidade *</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={formData.bi}
                                                onChange={e => setFormData({...formData, bi: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Estado Civil *</label>
                                                <select 
                                                    required
                                                    value={formData.estado_civil}
                                                    onChange={e => setFormData({...formData, estado_civil: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all appearance-none cursor-pointer" 
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                                    <option value="Casado(a)">Casado(a)</option>
                                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                                    <option value="Viúvo(a)">Viúvo(a)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Género *</label>
                                                <select 
                                                    required
                                                    value={formData.genero}
                                                    onChange={e => setFormData({...formData, genero: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all appearance-none cursor-pointer" 
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    <option value="Masculino">Masculino</option>
                                                    <option value="Feminino">Feminino</option>
                                                    <option value="Prefiro não dizer">Prefiro não dizer</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Data de Nascimento *</label>
                                                <input 
                                                    required
                                                    type="date" 
                                                    value={formData.data_nascimento}
                                                    onChange={e => setFormData({...formData, data_nascimento: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Idade (Calculada)</label>
                                                <input 
                                                    readOnly
                                                    type="text" 
                                                    value={formData.data_nascimento ? `${Math.floor(Math.abs(new Date().valueOf() - new Date(formData.data_nascimento).valueOf()) / (1000 * 60 * 60 * 24 * 365.25))} anos` : ''}
                                                    placeholder="Automático"
                                                    className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-500 cursor-not-allowed outline-none transition-all" 
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nacionalidade *</label>
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={formData.nacionalidade}
                                                    onChange={e => setFormData({...formData, nacionalidade: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Naturalidade *</label>
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={formData.naturalidade}
                                                    onChange={e => setFormData({...formData, naturalidade: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Morada *</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={formData.morada}
                                                onChange={e => setFormData({...formData, morada: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Província *</label>
                                            <select 
                                                required
                                                value={formData.provincia}
                                                onChange={e => setFormData({...formData, provincia: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all appearance-none cursor-pointer" 
                                            >
                                                <option value="" disabled>Selecione a Província...</option>
                                                <option value="Bengo">Bengo</option>
                                                <option value="Benguela">Benguela</option>
                                                <option value="Bié">Bié</option>
                                                <option value="Cabinda">Cabinda</option>
                                                <option value="Cassai Zambeze">Cassai Zambeze</option>
                                                <option value="Cuando">Cuando</option>
                                                <option value="Cuanza Norte">Cuanza Norte</option>
                                                <option value="Cuanza Sul">Cuanza Sul</option>
                                                <option value="Cubango">Cubango</option>
                                                <option value="Cunene">Cunene</option>
                                                <option value="Huambo">Huambo</option>
                                                <option value="Huíla">Huíla</option>
                                                <option value="Icolo e Bengo">Icolo e Bengo</option>
                                                <option value="Luanda">Luanda</option>
                                                <option value="Lunda Norte">Lunda Norte</option>
                                                <option value="Lunda Sul">Lunda Sul</option>
                                                <option value="Malanje">Malanje</option>
                                                <option value="Moxico">Moxico</option>
                                                <option value="Namibe">Namibe</option>
                                                <option value="Uíge">Uíge</option>
                                                <option value="Zaire">Zaire</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nível Académico *</label>
                                                <select 
                                                    required
                                                    value={formData.nivel_academico}
                                                    onChange={e => setFormData({...formData, nivel_academico: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all appearance-none cursor-pointer" 
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    <option value="Ensino Básico">Ensino Básico</option>
                                                    <option value="Ensino Médio / Técnico">Ensino Médio / Técnico</option>
                                                    <option value="Frequência Universitária">Frequência Universitária</option>
                                                    <option value="Licenciatura">Licenciatura</option>
                                                    <option value="Pós-Graduação / Especialização">Pós-Graduação / Especialização</option>
                                                    <option value="Mestrado">Mestrado</option>
                                                    <option value="Doutoramento">Doutoramento</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Curso / Formação *</label>
                                                <select 
                                                    required 
                                                    value={formData.curso} 
                                                    onChange={e => setFormData({ ...formData, curso: e.target.value })} 
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled>Selecione o Curso ou Área...</option>
                                                    <option value="Administração e Gestão">Administração e Gestão</option>
                                                    <option value="Arquitetura e Urbanismo">Arquitetura e Urbanismo</option>
                                                    <option value="Biologia e Ciências da Vida">Biologia e Ciências da Vida</option>
                                                    <option value="Ciências Contábeis e Finanças">Ciências Contábeis e Finanças</option>
                                                    <option value="Direito">Direito</option>
                                                    <option value="Economia">Economia</option>
                                                    <option value="Enfermagem">Enfermagem</option>
                                                    <option value="Engenharia Civil">Engenharia Civil</option>
                                                    <option value="Engenharia Informática / TI">Engenharia Informática / TI</option>
                                                    <option value="Engenharia Mecânica">Engenharia Mecânica</option>
                                                    <option value="Gestão de Recursos Humanos">Gestão de Recursos Humanos</option>
                                                    <option value="Logística e Transportes">Logística e Transportes</option>
                                                    <option value="Marketing e Comunicação">Marketing e Comunicação</option>
                                                    <option value="Medicina">Medicina</option>
                                                    <option value="Relações Internacionais">Relações Internacionais</option>
                                                    <option value="Outro (Técnico Profissional)">Outro (Técnico Profissional)</option>
                                                    <option value="Outro (Ciências Sociais)">Outro (Ciências Sociais)</option>
                                                    <option value="Outro (Engenharias)">Outro (Engenharias)</option>
                                                    <option value="Ensino Médio Geral">Ensino Médio Geral</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Carta de Condução *</label>
                                                <select 
                                                    required
                                                    value={formData.carta_conducao}
                                                    onChange={e => setFormData({...formData, carta_conducao: e.target.value})}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all appearance-none cursor-pointer" 
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    <option value="Nenhuma">Nenhuma</option>
                                                    <option value="Ligeiro">Ligeiro</option>
                                                    <option value="Pesado">Pesado</option>
                                                    <option value="Ambas">Ambas (Ligeiro e Pesado)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">URL do LinkedIn (Opcional)</label>
                                                <input 
                                                    type="url" 
                                                    value={formData.linkedin_url}
                                                    onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
                                                    placeholder="https://linkedin.com/in/exemplo"
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Disponibilidade de início *</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={formData.disponibilidade}
                                                onChange={e => setFormData({...formData, disponibilidade: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                placeholder="Ex: Imediato, Daqui a 1 mês..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Pretensão Salarial *</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={formData.pretensao_salarial}
                                                onChange={e => setFormData({...formData, pretensao_salarial: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
                                                placeholder="Ex: 50.000 Kz ou Negociável"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Onde espera chegar daqui a 5 anos? *</label>
                                            <textarea 
                                                required
                                                rows={2} 
                                                value={formData.expectativa_5_anos}
                                                onChange={e => setFormData({...formData, expectativa_5_anos: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all resize-none" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Fala-nos um pouco sobre ti *</label>
                                            <textarea 
                                                required
                                                rows={3} 
                                                value={formData.sobre_mim}
                                                onChange={e => setFormData({...formData, sobre_mim: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all resize-none" 
                                            />
                                        </div>

                                        {/* UPLOAD CV */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest">Currículo e Anexos (PDF/DOC) *</label>
                                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Até 4 arquivos</span>
                                            </div>
                                            <div 
                                                onClick={() => formData.cvFiles.length < 4 ? fileInputRef.current?.click() : null}
                                                className={`w-full border-2 border-dashed rounded-xl p-6 transition-all relative overflow-hidden
                                                    ${formData.cvFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-zinc-200 bg-zinc-50'}
                                                    ${formData.cvFiles.length < 4 ? 'cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/10' : 'opacity-80'}`}
                                            >
                                                <input 
                                                    ref={fileInputRef}
                                                    type="file" 
                                                    accept=".pdf,.doc,.docx"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    multiple={true}
                                                />
                                                
                                                {formData.cvFiles.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {formData.cvFiles.map((file, index) => (
                                                                <div key={index} className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-green-200 shadow-sm relative group">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <FileText className="text-green-500 shrink-0" size={20} />
                                                                        <div className="flex flex-col overflow-hidden">
                                                                            <span className="text-xs font-bold text-zinc-700 truncate">{file.name}</span>
                                                                            <span className="text-[10px] font-semibold text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newFiles = [...formData.cvFiles];
                                                                            newFiles.splice(index, 1);
                                                                            setFormData({...formData, cvFiles: newFiles});
                                                                        }}
                                                                        className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {formData.cvFiles.length < 4 && (
                                                            <div className="text-center pt-2 border-t border-green-200/50">
                                                                <span className="text-xs font-bold text-green-700 hover:text-green-800 underline transition-colors">Clique para adicionar mais ficheiros ({formData.cvFiles.length}/4 limit)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3 py-4">
                                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                                                            <UploadCloud className="text-zinc-400" size={24} />
                                                        </div>
                                                        <div className="text-center">
                                                            <span className="block text-sm font-bold text-zinc-600">Clique para anexar o seu CV</span>
                                                            <span className="block text-xs font-medium text-zinc-400">Pode anexar até 4 ficheiros (PDF, DOC - Max: 5MB/cada)</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Mensagem Curta (Opcional)</label>
                                            <textarea 
                                                rows={3} 
                                                value={formData.mensagem}
                                                onChange={e => setFormData({...formData, mensagem: e.target.value})}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-900 focus:ring-2 focus:ring-yellow-500 outline-none transition-all resize-none" 
                                                placeholder="Por que você seria um bom encaixe para esta vaga?"
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting || formData.cvFiles.length === 0}
                                                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-950 px-8 py-5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-3"
                                            >
                                                {isSubmitting ? (
                                                    <><div className="w-5 h-5 border-2 border-yellow-800 border-t-transparent rounded-full animate-spin"></div> A Enviar...</>
                                                ) : (
                                                    'Submeter Candidatura'
                                                )}
                                            </button>
                                        </div>

                                        <p className="text-[10px] text-zinc-400 font-medium text-center mt-4 flex justify-center items-center gap-1.5">
                                            <AlertCircle size={12} />
                                            Ao submeter concorda com as nossas políticas de privacidade de dados empresariais.
                                        </p>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicVagaDetalhes;
