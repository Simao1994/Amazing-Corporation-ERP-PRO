
import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import CardMidia from './CardMidia';

interface GradeGaleriaProps {
    items: any[];
    loading: boolean;
    onPreview: (item: any) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onDownload: (item: any) => void;
}

const GradeGaleria: React.FC<GradeGaleriaProps> = ({ items, loading, onPreview, onDelete, onToggleFavorite, onDownload }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">Carregando Galeria...</p>
            </div>
        );
    }

    if (items.length === 0) {
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
