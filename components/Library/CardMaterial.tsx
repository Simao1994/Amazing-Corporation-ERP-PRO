
import React from 'react';
import { Book, FileText, Download, Bookmark, Clock, CheckCircle, Info } from 'lucide-react';

interface CardMaterialProps {
    material: any;
    onPreview: (material: any) => void;
}

const CardMaterial: React.FC<CardMaterialProps> = ({ material, onPreview }) => {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'disponivel': return 'bg-green-100 text-green-700 border-green-200';
            case 'emprestado': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'atrasado': return 'bg-red-100 text-red-700 border-red-200';
            case 'reservado': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'disponivel': return <CheckCircle size={10} />;
            case 'emprestado': return <Clock size={10} />;
            case 'reservado': return <Bookmark size={10} />;
            default: return <Info size={10} />;
        }
    };

    return (
        <div
            onClick={() => onPreview(material)}
            className="group bg-white rounded-[2rem] border border-zinc-100 p-5 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/5 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="flex gap-5">
                {/* Book Cover Placeholder or Image */}
                <div className="w-24 h-32 rounded-xl bg-zinc-50 border border-zinc-100 flex-shrink-0 flex items-center justify-center text-zinc-300 overflow-hidden relative shadow-sm group-hover:shadow-md transition-all">
                    {material.capa_url ? (
                        <img src={material.capa_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={material.titulo} />
                    ) : (
                        <Book size={32} />
                    )}
                    {material.formato === 'digital' && (
                        <div className="absolute top-2 right-2 p-1 bg-yellow-500 rounded-lg text-zinc-900 shadow-md transform -rotate-12 group-hover:rotate-0 transition-all">
                            <Download size={10} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 ${getStatusStyles(material.status_atual)}`}>
                                {getStatusIcon(material.status_atual)} {material.status_atual}
                            </div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{material.tipo_material}</span>
                        </div>
                        <h3 className="text-sm font-black text-zinc-900 leading-tight group-hover:text-yellow-600 transition-colors line-clamp-2 uppercase">
                            {material.titulo}
                        </h3>
                        <p className="text-[11px] font-bold text-zinc-500 mt-1 truncate">
                            {material.autor}
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-dashed border-zinc-100">
                        <span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">
                            {material.isbn || material.ano_publicacao || 'Sem Ref.'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all">
                                <Bookmark size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle Gradient Overlay */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-50/50 to-transparent pointer-events-none group-hover:from-yellow-50/50" />
        </div>
    );
};

export default CardMaterial;
