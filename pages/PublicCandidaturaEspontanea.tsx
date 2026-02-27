import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    UploadCloud,
    FileText,
    CheckCircle2,
    RefreshCw,
    Home
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { enviarEmailCandidatura } from '../src/lib/email';
import Logo from '../components/Logo';

const PublicCandidaturaEspontanea: React.FC = () => {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        telefone_alternativo: '',
        bi: '',
        estado_civil: '',
        genero: '',
        data_nascimento: '',
        nacionalidade: 'Angolana',
        naturalidade: '',
        morada: '',
        provincia: '',
        nivel_academico: '',
        curso: '',
        carta_conducao: '',
        disponibilidade: '',
        pretensao_salarial: '',
        expectativa_5_anos: '',
        linkedin_url: '',
        sobre_mim: '',
        mensagem: '',
        cvFiles: [] as File[]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            
            if (formData.cvFiles.length + newFiles.length > 4) {
                alert('Pode anexar no máximo 4 ficheiros.');
                return;
            }

            const validFiles = newFiles.filter((file: any) => {
                const allowedTypes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];
                if (!allowedTypes.includes(file.type)) {
                    alert(`O ficheiro ${file.name} não é válido. Apenas PDF ou Word.`);
                    return false;
                }
                if (file.size > 5 * 1024 * 1024) {
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

        if (formData.cvFiles.length === 0) {
            alert('Por favor, anexe o seu Currículo profissional.');
            return;
        }

        setIsSubmitting(true);

        try {
            let cv_paths: string[] = [];

            // Upload the files
            for (let i = 0; i < formData.cvFiles.length; i++) {
                const file = formData.cvFiles[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `espontanea_${formData.bi.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}_${i}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('cvs')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Erro no upload do anexo:", uploadError);
                    throw new Error('Falha ao armazenar um ou mais documentos. Tente de novo.');
                }

                const { data: publicUrlData } = supabase.storage
                    .from('cvs')
                    .getPublicUrl(filePath);

                cv_paths.push(publicUrlData.publicUrl);
            }

            const finalCvPath = cv_paths.join(',');

            // Separar o nome completo no primeiro (nome) e no resto (sobrenome)
            const parts = formData.nome.trim().split(' ');
            const primeiroNome = parts[0] || '';
            const restoNome = parts.slice(1).join(' ') || '';
            const generatedId = Math.random().toString(36).substr(2, 6).toUpperCase();

            // Calcular a idade com base na data de nascimento
            let idadeCalculada = 0;
            if (formData.data_nascimento) {
                const hoje = new Date();
                const nasc = new Date(formData.data_nascimento);
                idadeCalculada = hoje.getFullYear() - nasc.getFullYear();
                const m = hoje.getMonth() - nasc.getMonth();
                if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
                    idadeCalculada--;
                }
            }

            // Save Application to DB -> No specific job ID (vaga_id = null)
            const novaCandidatura = {
                short_id: generatedId,
                nome: primeiroNome,
                sobrenome: restoNome,
                email: formData.email,
                telefone: formData.telefone,
                bi_numero: formData.bi,
                estado_civil: formData.estado_civil,
                genero: formData.genero,
                data_nascimento: formData.data_nascimento || null,
                idade: idadeCalculada,
                nacionalidade: formData.nacionalidade,
                naturalidade: formData.naturalidade,
                morada: formData.morada,
                provincia: formData.provincia,
                escolaridade: formData.nivel_academico,
                curso: formData.curso,
                carta_conducao: formData.carta_conducao,
                disponibilidade: formData.disponibilidade,
                pretensao_salarial: Number(formData.pretensao_salarial.replace(/[^0-9]/g, '')) || 0,
                linkedin_url: formData.linkedin_url,
                notas_internas: `Pretensões (5 Anos): ${formData.expectativa_5_anos}\n\nSobre mim: ${formData.sobre_mim}\n\nMensagem: ${formData.mensagem || 'Candidatura Espontânea (Sem Vaga Específica)'}`,
                experiencia: `Telefone Alternativo: ${formData.telefone_alternativo}`,
                doc_cv: finalCvPath,
                status: 'pendente'
            };

            const { error: dbError } = await supabase
                .from('recr_candidaturas')
                .insert([novaCandidatura]);

            if (dbError) {
                console.error("DB Insert Error", dbError);
                throw new Error("Erro ao guardar a candidatura spontânea na base de dados.");
            }

            // Enviar notificação por email para o candidato via EmailJS
            await enviarEmailCandidatura(primeiroNome, formData.email, 'Candidatura Espontânea Institucional');

            setIsSuccess(true);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Houve um impedimento técnico. Por favor, tente de novo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-200 text-zinc-900 font-['Times_New_Roman',_Times,_serif] relative overflow-x-hidden">
            {/* Premium Black Header */}
            <div className="fixed top-0 left-0 w-full bg-zinc-950 py-3 px-4 md:px-12 shadow-xl z-50 border-b border-zinc-800">
                <div className="w-full flex justify-between items-center">
                    <Logo className="h-10 md:h-12" />
                    <div className="flex gap-4">
                        <Link to="/" className="flex items-center gap-2 font-bold text-xs md:text-sm uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
                            <Home size={18} /> Início
                        </Link>
                    </div>
                </div>
            </div>

            <div className="py-12 pt-24 md:pt-28 px-6 relative z-10">
                {/* Background elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-400/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-200/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>

            {isSuccess ? (
                <div className="w-full max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] border border-zinc-200 shadow-2xl mt-12 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">Candidatura Registada!</h2>
                        <p className="text-zinc-500 font-medium text-lg max-w-2xl mx-auto">O seu perfil espontâneo foi submetido com sucesso à base de talentos da Amazing Corporation.</p>
                    </div>
                    
                    <div className="mt-8 max-w-md mx-auto bg-sky-50 text-sky-800 p-6 rounded-2xl flex flex-col items-center justify-center border border-sky-100">
                        <span className="font-black text-lg flex items-center gap-2 mb-2">📬 Verifique o seu Email</span>
                        <span className="text-sky-600 font-medium text-sm">Enviamos agora mesmo uma confirmação da sua candidatura.</span>
                    </div>

                    <Link to="/" className="inline-flex mt-10 py-5 px-10 bg-yellow-500 text-zinc-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all shadow-xl active:scale-95 items-center justify-center gap-3">
                        <Home size={18} /> Voltar ao Portal Corporativo
                    </Link>
                </div>
            ) : (
                <div className="w-full max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] border border-zinc-200 shadow-2xl mt-4 text-left animate-in slide-in-from-bottom-8 duration-700">
                    <div className="border-b border-zinc-100 pb-6 mb-8">
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tighter">Candidatura <span className="text-yellow-500">Espontânea</span>.</h1>
                        <p className="text-zinc-500 font-medium text-lg mt-3 leading-relaxed">Envie-nos o seu currículo a qualquer momento. A equipa de recrutamento do Grupo Amazing Corporation analisará o seu perfil de forma confidencial para futuras oportunidades compatíveis com a sua experiência profissional.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* IDENTIFICAÇÃO BÁSICA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome Completo *</label>
                                <input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" placeholder="Primeiro e Último Nome" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Email *</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" placeholder="o-seu-email@exemplo.com" />
                            </div>
                        </div>

                        {/* CONTACTOS E BI */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Telefone *</label>
                                <input required type="tel" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" placeholder="+244 9..." />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Alternativo *</label>
                                <input required type="tel" value={formData.telefone_alternativo} onChange={e => setFormData({ ...formData, telefone_alternativo: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nº de BI *</label>
                                <input required type="text" value={formData.bi} onChange={e => setFormData({ ...formData, bi: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" />
                            </div>
                        </div>

                        {/* DADOS PESSOAIS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Data de Nasc. *</label>
                                <input required type="date" value={formData.data_nascimento} onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Idade (Calculada)</label>
                                <input 
                                    readOnly
                                    type="text" 
                                    value={formData.data_nascimento ? `${Math.floor(Math.abs(new Date().valueOf() - new Date(formData.data_nascimento).valueOf()) / (1000 * 60 * 60 * 24 * 365.25))} anos` : ''}
                                    placeholder="Auto"
                                    className="w-full bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-xl p-4 text-sm font-bold cursor-not-allowed outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Género *</label>
                                <select required value={formData.genero} onChange={e => setFormData({ ...formData, genero: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Prefiro não dizer">Prefiro não dizer</option>
                                </select>
                            </div>
                        </div>

                        {/* ESTADO CIVIL E DEMOGRAFIA */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Estado Civil *</label>
                                <select required value={formData.estado_civil} onChange={e => setFormData({ ...formData, estado_civil: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nacionalidade *</label>
                                <input required type="text" value={formData.nacionalidade} onChange={e => setFormData({ ...formData, nacionalidade: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Naturalidade *</label>
                                <input required type="text" value={formData.naturalidade} onChange={e => setFormData({ ...formData, naturalidade: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" />
                            </div>
                        </div>

                        {/* MORADA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Morada Actual *</label>
                                <input required type="text" value={formData.morada} onChange={e => setFormData({ ...formData, morada: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Província Actual *</label>
                                <select required value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Bengo">Bengo</option>
                                    <option value="Benguela">Benguela</option>
                                    <option value="Bié">Bié</option>
                                    <option value="Cabinda">Cabinda</option>
                                    <option value="Cassai-Zambeze">Cassai-Zambeze</option>
                                    <option value="Cuando Cubango">Cuando Cubango</option>
                                    <option value="Cuanza Norte">Cuanza Norte</option>
                                    <option value="Cuanza Sul">Cuanza Sul</option>
                                    <option value="Cunene">Cunene</option>
                                    <option value="Huambo">Huambo</option>
                                    <option value="Huíla">Huíla</option>
                                    <option value="Icolo e Bengo">Icolo e Bengo</option>
                                    <option value="Luanda">Luanda</option>
                                    <option value="Lunda Norte">Lunda Norte</option>
                                    <option value="Lunda Sul">Lunda Sul</option>
                                    <option value="Malanje">Malanje</option>
                                    <option value="Moxico">Moxico</option>
                                    <option value="Moxico Leste">Moxico Leste</option>
                                    <option value="Namibe">Namibe</option>
                                    <option value="Uíge">Uíge</option>
                                    <option value="Zaire">Zaire</option>
                                    <option value="Exterior">Exterior</option>
                                </select>
                            </div>
                        </div>

                        {/* EDUCAÇÃO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Grau Académico *</label>
                                <select required value={formData.nivel_academico} onChange={e => setFormData({ ...formData, nivel_academico: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Ensino Médio">Ensino Médio</option>
                                    <option value="Ensino Superior / Bacharel">Ensino Superior / Licenciatura</option>
                                    <option value="Mestrado">Mestrado</option>
                                    <option value="Doutoramento">Doutoramento</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Formação Predominante *</label>
                                <select required value={formData.curso} onChange={e => setFormData({ ...formData, curso: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
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

                        {/* EXTRAS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Carta de Condução *</label>
                                <select required value={formData.carta_conducao} onChange={e => setFormData({ ...formData, carta_conducao: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Nenhuma">Nenhuma</option>
                                    <option value="Ligeiro">Passageiros (Ligeiro)</option>
                                    <option value="Pesado">Carga (Pesado)</option>
                                    <option value="Ambas">Ambas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Pretensão Salarial Mínima *</label>
                                <input required type="text" value={formData.pretensao_salarial} onChange={e => setFormData({ ...formData, pretensao_salarial: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" placeholder="Ex. 150.000 Kz" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Disponibilidade *</label>
                                <select required value={formData.disponibilidade} onChange={e => setFormData({ ...formData, disponibilidade: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Imediata">Imediata</option>
                                    <option value="15 Dias">Em 15 Dias</option>
                                    <option value="30 Dias">Em 30 Dias</option>
                                </select>
                            </div>
                        </div>

                        {/* TextAreas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Sobre as tuas expectativas (5 Anos) *</label>
                                <textarea required rows={4} value={formData.expectativa_5_anos} onChange={e => setFormData({ ...formData, expectativa_5_anos: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all resize-none" ></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Resume a tua paixão e perfil *</label>
                                <textarea required rows={4} value={formData.sobre_mim} onChange={e => setFormData({ ...formData, sobre_mim: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all resize-none" ></textarea>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">URL do LinkedIn (Opcional)</label>
                            <input type="url" value={formData.linkedin_url} onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-sm font-bold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:font-normal" placeholder="https://linkedin.com/in/o-seu-perfil" />
                        </div>

                        <div className="pt-4 border-t border-zinc-100">
                            <div className="flex items-center gap-2 mb-4">
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest">Currículo e Anexos (PDF/DOC) *</label>
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Até 4 arquivos</span>
                            </div>
                            <div
                                onClick={() => formData.cvFiles.length < 4 ? fileInputRef.current?.click() : null}
                                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all relative overflow-hidden hover:bg-zinc-50
                                     ${formData.cvFiles.length > 0 ? 'border-green-500/50 bg-green-50' : 'border-zinc-200 bg-zinc-50/50 hover:border-yellow-500/50'}
                                     ${formData.cvFiles.length < 4 ? 'cursor-pointer' : 'opacity-80'}`}
                            >
                                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" multiple={true} />
                                
                                {formData.cvFiles.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
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
                                        <div className="w-16 h-16 bg-white shadow-sm border border-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                                            <UploadCloud size={28} />
                                        </div>
                                        <span className="text-base font-bold text-zinc-700">Anexe ou solte os seus ficheiros</span>
                                        <span className="text-xs text-zinc-400 font-medium">Pode anexar até 4 ficheiros (PDF, DOC - Max: 5MB/cada)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={isSubmitting || formData.cvFiles.length === 0}
                                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-900 py-6 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-yellow-500/20"
                            >
                                {isSubmitting ? <><RefreshCw className="animate-spin" size={20} /> A gravar candidatura...</> : 'Enviar Candidatura Institucional'}
                            </button>
                            <p className="text-[10px] text-zinc-500 text-center mt-6 font-medium">Ao submeter, os seus dados estarão encriptados e seguros de acordo com a nossa política rígida de confidencialidade de RH corporativo.</p>
                        </div>
                    </form>
                </div>
            )}
            </div>
        </div>
    );
};

export default PublicCandidaturaEspontanea;
