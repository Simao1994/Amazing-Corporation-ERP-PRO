import React from 'react';
import { Camera, RefreshCw, Folder } from 'lucide-react';
import CardMidia from './CardMidia';

interface GradeGaleriaProps {
    items: any[];
    folders?: any[];
    loading: boolean;
    onPreview: (item: any) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onDownload: (item: any) => void;
    onOpenFolder?: (id: string) => void;
}

const GradeGaleria: React.FC<GradeGaleriaProps> = ({ items, folders = [], loading, onPreview, onDelete, onToggleFavorite, onDownload, onOpenFolder }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">Carregando Galeria...</p>
            </div>
        );
    }

    if (items.length === 0 && folders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-6 bg-zinc-50/50 rounded-[3rem] border-2 border-dashed border-zinc-100">
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300">
                    <Camera size={40} />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-xl font-black text-zinc-900 uppercase">Nenhuma mídia encontrada</p>
                    <p className="text-zinc-500 font-medium">Experimente mudar o filtro ou carregar novos arquivos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {folders.map((folder) => (
                <div
                    key={folder.id}
                    onClick={() => onOpenFolder?.(folder.id)}
                    className="group bg-white p-6 rounded-[2.5rem] border border-sky-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center space-y-4 min-h-[180px]"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-yellow-50 transition-colors" />

                    <div className="w-16 h-16 bg-zinc-900 text-yellow-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                        <Folder size={32} />
                    </div>

                    <div className="text-center">
                        <p className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate max-w-[150px]">
                            {folder.nome}
                        </p>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            {folder.count} Arquivos
                        </span>
                    </div>
                </div>
            ))}

            {items.map((item) => (
                <CardMidia
                    key={item.id}
                    item={item}
                    onPreview={onPreview}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    onDownload={onDownload}
                />
            ))}
        </div>
    );
};

export default GradeGaleria;
