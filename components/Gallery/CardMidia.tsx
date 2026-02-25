
import React from 'react';
import { Play, Heart, Download, Trash2, Globe, Lock } from 'lucide-react';

interface CardMidiaProps {
    item: {
        id: string;
        nome: string;
        tipo: 'image' | 'video';
        formato: string;
        tamanho: number;
        url: string;
        thumbnail: string | null;
        privacidade: 'public' | 'private';
        favorito: boolean;
        criado_em: string;
        usuario_nome?: string;
    };
    onPreview: (item: any) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onDownload: (item: any) => void;
}

const CardMidia: React.FC<CardMidiaProps> = ({ item, onPreview, onDelete, onToggleFavorite, onDownload }) => {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="group relative bg-white rounded-3xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-2xl transition-all duration-500">
            {/* Media Container */}
            <div
                className="aspect-square relative cursor-pointer overflow-hidden bg-zinc-100"
                onClick={() => onPreview(item)}
            >
                {item.tipo === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 relative">
                        {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.nome} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white ring-8 ring-white/5 group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-zinc-900 transition-all duration-300">
                                <Play size={24} fill="currentColor" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <img
                        src={item.url}
                        alt={item.nome}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                            className={`p-2 rounded-xl backdrop-blur-md transition-all ${item.favorito ? 'bg-yellow-500 text-zinc-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            <Heart size={16} fill={item.favorito ? "currentColor" : "none"} />
                        </button>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center gap-2 mb-1">
                            {item.privacidade === 'public' ? (
                                <Globe size={12} className="text-sky-400" />
                            ) : (
                                <Lock size={12} className="text-yellow-500" />
                            )}
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.tipo} • {item.formato.toUpperCase()}</span>
                        </div>
                        <p className="text-white font-bold text-sm truncate">{item.nome}</p>
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="p-4 flex items-center justify-between border-t border-zinc-50">
                <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                        {formatSize(item.tamanho)}
                    </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all" title="Download"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardMidia;
