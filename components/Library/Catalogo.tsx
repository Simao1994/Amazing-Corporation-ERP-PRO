
import React from 'react';
import CardMaterial from './CardMaterial';
import { BookOpen } from 'lucide-react';

interface CatalogoProps {
    items: any[];
    loading: boolean;
    onPreview: (material: any) => void;
}

const Catalogo: React.FC<CatalogoProps> = ({ items, loading, onPreview }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-44 bg-white rounded-[2rem] border border-zinc-100 shadow-sm" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-zinc-100 shadow-sm space-y-4">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200">
                    <BookOpen size={40} />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-black text-zinc-900 uppercase">Nenhum material encontrado</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Tente ajustar os seus filtros de pesquisa.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {items.map(item => (
                <CardMaterial
                    key={item.id}
                    material={item}
                    onPreview={onPreview}
                />
            ))}
        </div>
    );
};

export default Catalogo;
