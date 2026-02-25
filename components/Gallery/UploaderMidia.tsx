
import React, { useRef, useState } from 'react';
import { Upload, X, FileCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface UploaderMidiaProps {
    onUpload: (files: File[]) => Promise<void>;
    onClose: () => void;
}

const UploaderMidia: React.FC<UploaderMidiaProps> = ({ onUpload, onClose }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const addFiles = (newFiles: File[]) => {
        // Validate types
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
        const filteredFiles = newFiles.filter(f => validTypes.includes(f.type));

        if (filteredFiles.length < newFiles.length) {
            alert("Alguns ficheiros foram ignorados por terem formatos não suportados.");
        }

        setFiles(prev => [...prev, ...filteredFiles]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        try {
            await onUpload(files);
            setFiles([]);
            onClose();
        } catch (err) {
            alert("Erro durante o upload. Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-zinc-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 uppercase">Enviar Mídia</h2>
                        <p className="text-zinc-500 font-medium text-sm">Organize a sua galeria com novos ficheiros.</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-50 rounded-2xl text-zinc-400 hover:text-red-500 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div
                        className={`relative border-2 border-dashed rounded-[2.5rem] p-12 transition-all flex flex-col items-center justify-center text-center ${dragActive ? 'border-yellow-500 bg-yellow-50/50' : 'border-zinc-200 hover:border-zinc-300'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
                        />
                        <div className="w-20 h-20 bg-zinc-900 text-yellow-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                        </div>
                        <p className="text-lg font-black text-zinc-900">Arraste os ficheiros aqui</p>
                        <p className="text-zinc-500 text-sm mt-1">ou clique para procurar no computador</p>
                        <div className="mt-6 flex gap-2">
                            <span className="px-3 py-1 bg-zinc-100 text-[10px] font-black text-zinc-500 rounded-full uppercase tracking-widest">IMAGENS</span>
                            <span className="px-3 py-1 bg-zinc-100 text-[10px] font-black text-zinc-500 rounded-full uppercase tracking-widest">VÍDEOS</span>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">{files.length} Ficheiros Seleccionados</p>
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 group">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-100">
                                        <FileCheck size={20} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold text-zinc-900 truncate">{file.name}</p>
                                        <p className="text-[10px] text-zinc-400 font-medium capitalize">{(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.split('/')[1]}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-2xl text-sky-700">
                        <AlertCircle size={20} />
                        <p className="text-xs font-bold">Respeite os direitos de autor e politicas de privacidade da Amazing Corp.</p>
                    </div>
                </div>

                <div className="p-8 bg-zinc-50/50 flex gap-4">
                    <button
                        disabled={files.length === 0 || isUploading}
                        onClick={handleSubmit}
                        className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:bg-zinc-800"
                    >
                        {isUploading ? <RefreshCw className="animate-spin" /> : <Upload size={18} />}
                        {isUploading ? 'A Carregar...' : `Enviar ${files.length} Ficheiros`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploaderMidia;
