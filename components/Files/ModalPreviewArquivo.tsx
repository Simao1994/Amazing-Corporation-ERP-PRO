import React from 'react';
import { X, Download, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { FileDocument, FilesService } from '../../utils/filesService';

interface ModalPreviewArquivoProps {
    doc: FileDocument;
    onClose: () => void;
}

const ModalPreviewArquivo: React.FC<ModalPreviewArquivoProps> = ({ doc, onClose }) => {
    const url = FilesService.getFileUrl(doc.caminho);
    const type = doc.tipo_arquivo.toLowerCase();

    const renderPreview = () => {
        if (['png', 'jpg', 'jpeg', 'gif'].includes(type)) {
            return (
                <div className="flex flex-col items-center justify-center h-full max-h-[70vh] p-4">
                    <img src={url} alt={doc.titulo} className="max-w-full max-h-full object-contain rounded-lg shadow-xl" />
                </div>
            );
        }

        if (type === 'pdf') {
            return (
                <iframe
                    src={`${url}#toolbar=0`}
                    className="w-full h-[70vh] rounded-lg border border-slate-200 shadow-inner"
                    title={doc.titulo}
                />
            );
        }

        if (type === 'txt') {
            return (
                <iframe
                    src={url}
                    className="w-full h-[60vh] rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm"
                    title={doc.titulo}
                />
            );
        }

        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mb-6 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                    <FileText className="w-12 h-12" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Pré-visualização não disponível</h4>
                <p className="text-slate-500 max-w-sm mb-8 italic">
                    Arquivos do tipo .{type} precisam ser descarregados para serem visualizados no seu computador.
                </p>
                <div className="flex gap-4">
                    <a
                        href={url}
                        download={doc.nome_arquivo}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Baixar Arquivo
                    </a>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Abrir em Separador
                    </a>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 lg:p-10 overflow-y-auto">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-none">{doc.titulo}</h3>
                            <p className="text-xs text-slate-500 mt-1">{doc.nome_arquivo} • {(doc.tamanho_arquivo / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            download={doc.nome_arquivo}
                            className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                            title="Download"
                        >
                            <Download className="w-5 h-5" />
                        </a>
                        <button
                            onClick={onClose}
                            className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                            title="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-hidden bg-slate-100">
                    {renderPreview()}
                </div>

                {/* Footer Info */}
                <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                        {doc.tags?.split(',').map((tag, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold">
                                #{tag.trim()}
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 italic flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Visualizando versão mais recente de {new Date(doc.atualizado_em).toLocaleString('pt-PT')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ModalPreviewArquivo;
