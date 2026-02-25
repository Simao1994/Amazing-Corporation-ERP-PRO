import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { FilesService, FILE_LIMIT_MB, ALLOWED_FORMATS } from '../../utils/filesService';

interface AreaUploadProps {
    onSuccess: () => void;
    categories: { id: string, nome: string }[];
}

const AreaUpload: React.FC<AreaUploadProps> = ({ onSuccess, categories }) => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        categoria_id: '',
        tags: ''
    });

    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (selectedFile: File) => {
        setError('');
        setSuccess('');
        const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

        if (!ALLOWED_FORMATS.includes(ext)) {
            setError(`Formato .${ext} não permitido.`);
            return;
        }

        if (selectedFile.size > FILE_LIMIT_MB * 1024 * 1024) {
            setError(`Arquivo excede ${FILE_LIMIT_MB}MB.`);
            return;
        }

        setFile(selectedFile);
        setFormData(prev => ({ ...prev, titulo: selectedFile.name }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');
        try {
            await FilesService.uploadFile(file, formData);
            setSuccess('Arquivo enviado com sucesso!');
            setFile(null);
            setFormData({ titulo: '', descricao: '', categoria_id: '', tags: '' });
            setTimeout(() => {
                setSuccess('');
                onSuccess();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar arquivo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-600" />
                    Novo Documento
                </h3>
            </div>

            <div className="p-6">
                {!file ? (
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                        />
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-indigo-600">
                            <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-slate-700 font-medium">Arraste seu arquivo aqui</p>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            PDF, Word, Excel, Images, Zip, TXT (Máx. {FILE_LIMIT_MB}MB)
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFile(null)}
                                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.titulo}
                                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                    placeholder="Nome do documento"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</label>
                                <select
                                    value={formData.categoria_id}
                                    onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                >
                                    <option value="">Sem Categoria</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</label>
                            <textarea
                                value={formData.descricao}
                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all h-20 resize-none"
                                placeholder="Breve descrição do conteúdo..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags (separadas por vírgula)</label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                placeholder="ex: contrato, 2024, jurídico"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Finalizar Upload
                                </>
                            )}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-2 text-sm animate-shake">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-100 text-green-600 rounded-lg flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        {success}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AreaUpload;
