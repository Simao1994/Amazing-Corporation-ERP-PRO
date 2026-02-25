import React from 'react';
import { FileText, Image as ImageIcon, FileCode, Archive, FileSpreadsheet, Download, Trash2, Eye, Calendar, User, Tag } from 'lucide-react';
import { FileDocument, FilesService } from '../../utils/filesService';

interface CartaoArquivoProps {
    doc: FileDocument;
    onDelete: (id: string, caminho: string, nome: string) => void;
    onPreview: (doc: FileDocument) => void;
}

const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif'].includes(t)) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (['pdf'].includes(t)) return <FileText className="w-8 h-8 text-red-500" />;
    if (['doc', 'docx', 'txt'].includes(t)) return <FileText className="w-8 h-8 text-indigo-500" />;
    if (['xls', 'xlsx'].includes(t)) return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    if (['zip', 'rar'].includes(t)) return <Archive className="w-8 h-8 text-amber-500" />;
    return <FileCode className="w-8 h-8 text-slate-500" />;
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const CartaoArquivo: React.FC<CartaoArquivoProps> = ({ doc, onDelete, onPreview }) => {
    const downloadUrl = FilesService.getFileUrl(doc.caminho);

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
            {/* Visual Header */}
            <div className="h-24 bg-slate-50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 flex flex-wrap gap-2 p-2 pointer-events-none">
                    {Array(20).fill(0).map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded bg-indigo-500 rotate-12" />
                    ))}
                </div>
                <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {getFileIcon(doc.tipo_arquivo)}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2" title={doc.titulo}>
                        {doc.titulo}
                    </h4>
                </div>

                <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">
                    {doc.descricao || 'Sem descrição.'}
                </p>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.criado_em).toLocaleDateString('pt-PT')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium overflow-hidden">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{doc.responsavel?.nome || 'Operador'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Tag className="w-3 h-3" />
                        {doc.categoria?.nome || 'Geral'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium font-mono uppercase">
                        {doc.tipo_arquivo} • {formatSize(doc.tamanho_arquivo)}
                    </div>
                </div>

                {/* Tags */}
                {doc.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                        {doc.tags.split(',').map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200">
                                #{tag.trim()}
                            </span>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onPreview(doc)}
                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Eye className="w-4 h-4" />
                        Ver
                    </button>
                    <a
                        href={downloadUrl}
                        download={doc.nome_arquivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Baixar
                    </a>
                    <button
                        onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este documento permanentemente?')) {
                                onDelete(doc.id, doc.caminho, doc.nome_arquivo);
                            }
                        }}
                        className="w-10 h-10 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartaoArquivo;
