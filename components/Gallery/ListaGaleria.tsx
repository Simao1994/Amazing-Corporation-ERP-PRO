
import React from 'react';
import { FileText, Image as ImageIcon, Video, MoreVertical, Download, Trash2, Heart, Globe, Lock } from 'lucide-react';

interface ListaGaleriaProps {
    items: any[];
    onPreview: (item: any) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onDownload: (item: any) => void;
}

const ListaGaleria: React.FC<ListaGaleriaProps> = ({ items, onPreview, onDelete, onToggleFavorite, onDownload }) => {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (items.length === 0) return null;

    return (
        <div className="bg-white rounded-[2rem] border border-zinc-100 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Arquivo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tamanho</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acções</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                    {items.map((item) => (
                        <tr
                            key={item.id}
                            className="group hover:bg-zinc-50/50 transition-all cursor-pointer"
                            onClick={() => onPreview(item)}
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 overflow-hidden shrink-0">
                                        {item.tipo === 'image' ? (
                                            <img src={item.url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <Video size={18} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 truncate flex items-center gap-2">
                                            {item.nome}
                                            {item.favorito && <Heart size={12} className="text-yellow-500" fill="currentColor" />}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {item.privacidade === 'public' ? <Globe size={10} className="text-sky-400" /> : <Lock size={10} className="text-yellow-500" />}
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase">{item.formato}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-zinc-100 text-[10px] font-black text-zinc-500 rounded-full uppercase tracking-widest">
                                    {item.tipo}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-bold text-zinc-500">{formatSize(item.tamanho)}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-bold text-zinc-500">{new Date(item.criado_em).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                                        className={`p-2 rounded-lg transition-all ${item.favorito ? 'text-yellow-500 bg-yellow-50' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`}
                                    >
                                        <Heart size={16} fill={item.favorito ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="group-hover:hidden">
                                    <MoreVertical size={16} className="text-zinc-300 ml-auto" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ListaGaleria;
