import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../src/lib/supabase';
import { RhVaga } from '../types';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Briefcase, FileText, CheckCircle2, ChevronLeft, Building2, UploadCloud, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';

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
        disponibilidade: '',
        morada: '',
        provincia: '',
        naturalidade: '',
        pretensao_salarial: '',
        expectativa_5_anos: '',
        sobre_mim: '',
        mensagem: '',
        cvFile: null as File | null
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
            const file = e.target.files[0];
            // Validar PDF ou DOC
            if (!file.type.match(/(pdf|msword|document)/)) {
                alert('Apenas ficheiros PDF ou Word são permitidos.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                alert('O ficheiro é demasiado grande. Máximo 5MB.');
                return;
            }
            setFormData({ ...formData, cvFile: file });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vaga) return;
        
        setIsSubmitting(true);
        
        try {
            let cv_path = '';
            
            // 1. Upload do CV para o Storage (Se existir)
            if (formData.cvFile) {
                const fileExt = formData.cvFile.name.split('.').pop();
                const fileName = `cv_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `candidaturas/${fileName}`;
                
                // Nota: Requer bucket público ou permissão anon.
                const { error: uploadError } = await supabase.storage
                    .from('cvs')
                    .upload(filePath, formData.cvFile);
                    
                if (uploadError) {
                    // Fallback (se bucket não existir, submete na mesma mas sem CV fásico)
                    console.warn("Storage upload falhou, certifique-se que o bucket 'cvs' existe e permite INSERT para anon.", uploadError);
                } else {
                    const { data } = supabase.storage.from('cvs').getPublicUrl(filePath);
                    cv_path = data.publicUrl;
                }
            }
            
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
                disponibilidade: formData.disponibilidade,
                morada: formData.morada,
                provincia: formData.provincia,
                naturalidade: formData.naturalidade,
                pretensao_salarial: formData.pretensao_salarial,
                expectativa_5_anos: formData.expectativa_5_anos,
                sobre_mim: formData.sobre_mim,
                mensagem: formData.mensagem,
                cv_path: cv_path,
                status: 'pendente'
            });
            
            if (dbError) throw dbError;
            
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
        <div className="min-h-screen bg-sky-50 font-sans pb-24">
            {/* CABEÇALHO SIMPLES */}
            <header className="bg-zinc-950 border-b border-white/10 sticky top-0 z-50 shadow-xl">
                <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
                    <div className="w-64 brightness-0 invert opacity-95 transition-transform hover:scale-105 duration-300 ml-[-1rem]"><Logo /></div>
                    
                    <button onClick={() => navigate('/carreiras')} className="px-6 py-3 text-zinc-400 border border-white/10 hover:border-yellow-500/50 hover:bg-zinc-900 hover:text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm bg-white/5 backdrop-blur-md">
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
                                    <p className="text-zinc-500 mb-8 font-medium">
                                        O seu perfil foi encaminhado para a nossa equipa de Recursos Humanos. Entraremos em contacto brevemente.
                                    </p>
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
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={formData.curso}
                                                    onChange={e => setFormData({...formData, curso: e.target.value})}
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
                                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Currículo (PDF/DOC) *</label>
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                                                    ${formData.cvFile ? 'border-green-400 bg-green-50' : 'border-zinc-200 bg-zinc-50 hover:border-yellow-400 hover:bg-yellow-50/10'}`}
                                            >
                                                <input 
                                                    ref={fileInputRef}
                                                    type="file" 
                                                    accept=".pdf,.doc,.docx"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                {formData.cvFile ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileText className="text-green-500" size={32} />
                                                        <span className="text-sm font-bold text-green-700 truncate w-full px-4">{formData.cvFile.name}</span>
                                                        <span className="text-xs font-semibold text-green-600/70">{(formData.cvFile.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                                                            <UploadCloud className="text-zinc-400" size={24} />
                                                        </div>
                                                        <span className="text-sm font-bold text-zinc-600">Clique para anexar o seu CV</span>
                                                        <span className="text-xs font-medium text-zinc-400">PDF, DOC (Max: 5MB)</span>
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
                                                disabled={isSubmitting || !formData.cvFile}
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
