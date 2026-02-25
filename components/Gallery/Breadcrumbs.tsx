
import React from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';

interface BreadcrumbProps {
    path: { id: string; nome: string }[];
    onNavigate: (id: string | null) => void;
}

const Breadcrumbs: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
    return (
        <nav className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest overflow-x-auto no-scrollbar pb-2">
            <button
                onClick={() => onNavigate(null)}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors shrink-0"
            >
                <Home size={14} />
                <span>Galeria</span>
            </button>

            {path.map((folder, index) => (
                <React.Fragment key={folder.id}>
                    <ChevronRight size={12} className="text-zinc-300 shrink-0" />
                    <button
                        onClick={() => onNavigate(folder.id)}
                        className={`flex items-center gap-2 transition-colors shrink-0 ${index === path.length - 1 ? 'text-yellow-500' : 'text-zinc-400 hover:text-zinc-900'
                            }`}
                    >
                        <Folder size={14} />
                        <span className="max-w-[150px] truncate">{folder.nome}</span>
                    </button>
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
