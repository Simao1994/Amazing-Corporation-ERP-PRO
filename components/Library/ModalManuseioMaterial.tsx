
import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Check, Loader2, Save } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import Input from '../ui/Input';

interface ModalManuseioMaterialProps {
    material?: any; // Se existir, é edição. Se não, é criação.
    categorias: any[];
    user: any;
    onClose: () => void;
    onRefresh: () => void;
}

const ModalManuseioMaterial: React.FC<ModalManuseioMaterialProps> = ({ material, categorias, user, onClose, onRefresh }) => {
    const isEditing = !!material;

    const [formData, setFormData] = useState({
        titulo: material?.titulo || '',
        subtitulo: material?.subtitulo || '',
        autor: material?.autor || '',
        editora: material?.editora || '',
        ano_publicacao: material?.ano_publicacao || new Date().getFullYear(),
        isbn: material?.isbn || '',
        categoria_id: material?.categoria_id || (categorias[0]?.id || ''),
        palavras_chave: material?.palavras_chave || '',
        idioma: material?.idioma || 'Português',
        numero_paginas: material?.numero_paginas || 0,
        descricao: material?.descricao || '',
        tipo_material: material?.tipo_material || 'livro',
        formato: material?.formato || 'fisico',
        capa_url: material?.capa_url || '',
        arquivo_url: material?.arquivo_url || ''
    });

    const [loading, setLoading] = useState(false);
    const [uploadingCapa, setUploadingCapa] = useState(false);
    const [uploadingArquivo, setUploadingArquivo] = useState(false);

    const capaRef = useRef<HTMLInputElement>(null);
    const arquivoRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'capa' | 'arquivo') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'capa') setUploadingCapa(true);
        else setUploadingArquivo(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `biblioteca/${type}s/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('galeria') // Using existing bucket for simplicity, or we could create a new one if permissions allowed
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('galeria')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [type === 'capa' ? 'capa_url' : 'arquivo_url']: publicUrl }));
        } catch (err) {
            alert("Erro no upload: " + (err as any).message);
        } finally {
            if (type === 'capa') setUploadingCapa(false);
            else setUploadingArquivo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('biblioteca_materiais')
                    .update(formData)
                    .eq('id', material.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('biblioteca_materiais')
                    .insert([{
                        ...formData,
                        usuario_id: user.id,
                        status_atual: 'disponivel'
                    }]);
                if (error) throw error;
            }

            onRefresh();
            onClose();
        } catch (err) {
            alert("Erro ao gravar material.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-zinc-900 shadow-lg">
                            {isEditing ? <Save size={24} /> : <Upload size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 uppercase">{isEditing ? 'Editar Material' : 'Novo Registro de Acervo'}</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{isEditing ? 'Atualizar metadados e arquivos' : 'Adicionar nova obra ao catálogo'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-zinc-400 transition-all active:scale-95"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                        {/* Column 1: Media (Capa & Archive) */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Capa da Obra</label>
                                <div
                                    onClick={() => capaRef.current?.click()}
                                    className="aspect-[3/4] bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2rem] flex flex-col items-center justify-center text-zinc-400 cursor-pointer hover:border-yellow-500 hover:bg-yellow-50/30 transition-all overflow-hidden relative group"
                                >
                                    {formData.capa_url ? (
                                        <img src={formData.capa_url} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <>
                                            {uploadingCapa ? <Loader2 size={32} className="animate-spin text-yellow-500" /> : <ImageIcon size={32} strokeWidth={1} />}
                                            <span className="text-[9px] font-black uppercase mt-2">Carregar Imagem</span>
                                        </>
                                    )}
                                    <input type="file" ref={capaRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'capa')} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ficheiro Digital (Opcional)</label>
                                <div
                                    onClick={() => arquivoRef.current?.click()}
                                    className="p-6 bg-zinc-900 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800 transition-all shadow-xl group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-yellow-500">
                                            {uploadingArquivo ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">
                                                {formData.arquivo_url ? 'Arquivo Pronto' : 'Selecionar PDF'}
                                            </p>
                                            <p className="text-[8px] text-zinc-500 font-bold uppercase">Formatos: PDF, EPUB</p>
                                        </div>
                                    </div>
                                    {formData.arquivo_url && <Check size={16} className="text-green-500" />}
                                    <input type="file" ref={arquivoRef} className="hidden" accept=".pdf,.epub" onChange={(e) => handleUpload(e, 'arquivo')} />
                                </div>
                            </div>
                        </div>

                        {/* Column 2 & 3: Metadata */}
                        <div className="md:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Título Principal</label>
                                    <input name="titulo" value={formData.titulo} onChange={handleChange} required className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all" placeholder="Ex: O Capital, Volume 1" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Autor</label>
                                    <input name="autor" value={formData.autor} onChange={handleChange} required className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all" placeholder="Ex: Karl Marx" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Categoria</label>
                                    <select name="categoria_id" value={formData.categoria_id} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all appearance-none">
                                        {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Ano Publicação</label>
                                    <input type="number" name="ano_publicacao" value={formData.ano_publicacao} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">ISBN / Referência</label>
                                    <input name="isbn" value={formData.isbn} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all" placeholder="Ex: 978-3-16-148410-0" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Tipo</label>
                                    <select name="tipo_material" value={formData.tipo_material} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all appearance-none">
                                        <option value="livro">Livro</option>
                                        <option value="artigo">Artigo</option>
                                        <option value="manual">Manual</option>
                                        <option value="relatorio">Relatório</option>
                                        <option value="revista">Revista</option>
                                        <option value="tese">Tese</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Formato</label>
                                    <select name="formato" value={formData.formato} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all appearance-none">
                                        <option value="fisico">Físico</option>
                                        <option value="digital">Digital</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Sinopse / Descrição</label>
                                <textarea name="descricao" value={formData.descricao} onChange={handleChange} rows={4} className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] px-5 py-4 text-sm font-medium focus:ring-2 ring-yellow-500/20 outline-none transition-all resize-none" placeholder="Breve resumo da obra..." />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Palavras-Chave (Separadas por vírgula)</label>
                                <input name="palavras_chave" value={formData.palavras_chave} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none transition-all" placeholder="Ex: Economia, Política, História" />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex gap-4">
                    <button onClick={onClose} type="button" className="px-8 py-4 bg-white border border-zinc-200 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all active:scale-95">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="text-yellow-500" />}
                        {isEditing ? 'Guardar Alterações' : 'Finalizar Registro'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalManuseioMaterial;
