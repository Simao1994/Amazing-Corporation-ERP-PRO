
import React from 'react';
import { Folder, Plus, ChevronRight, FolderPlus, MoreHorizontal } from 'lucide-react';

interface Album {
    id: string;
    nome: string;
    count: number;
}

interface GestorAlbunsProps {
    albuns: Album[];
    activeAlbum: string | null;
    onSelectAlbum: (id: string | null) => void;
    onCreateAlbum: () => void;
}

const GestorAlbuns: React.FC<GestorAlbunsProps> = ({ albuns, activeAlbum, onSelectAlbum, onCreateAlbum }) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b border-zinc-50 flex justify-between items-center">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                    <Folder size={18} className="text-yellow-500" /> Álbuns
                </h3>
                <button
                    onClick={onCreateAlbum}
                    className="p-2 bg-zinc-900 text-yellow-500 rounded-xl hover:scale-110 active:scale-90 transition-all shadow-md"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="p-4 space-y-1">
                <button
                    onClick={() => onSelectAlbum(null)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${activeAlbum === null ? 'bg-zinc-900 text-white shadow-xl' : 'hover:bg-zinc-50 text-zinc-600'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Globe size={18} className={activeAlbum === null ? 'text-yellow-500' : 'text-zinc-400'} />
                        <span className="text-xs font-bold">Todos os Arquivos</span>
                    </div>
                    <ChevronRight size={14} className={activeAlbum === null ? 'text-zinc-500' : 'text-zinc-300'} />
                </button>

                {albuns.map((album) => (
                    <button
                        key={album.id}
                        onClick={() => onSelectAlbum(album.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${activeAlbum === album.id ? 'bg-zinc-900 text-white shadow-xl' : 'hover:bg-zinc-50 text-zinc-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Folder size={18} className={activeAlbum === album.id ? 'text-yellow-500' : 'text-sky-400'} />
                            <span className="text-xs font-bold truncate max-w-[120px]">{album.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black ${activeAlbum === album.id ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {album.count}
                            </span>
                            <ChevronRight size={14} className={activeAlbum === album.id ? 'text-zinc-500' : 'text-zinc-300'} />
                        </div>
                    </button>
                ))}

                {albuns.length === 0 && (
                    <div className="py-8 text-center px-4">
                        <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FolderPlus size={20} className="text-zinc-300" />
                        </div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                            Nenhum álbum<br />criado ainda.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simplified Globe for the "All" item
const Globe = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

export default GestorAlbuns;
