import React from 'react';
import { Search, Filter, Hash, FileType, RotateCw } from 'lucide-react';
import { FileCategory } from '../../utils/filesService';

interface BarraFiltrosProps {
    categories: FileCategory[];
    filters: any;
    setFilters: (f: any) => void;
    onRefresh: () => void;
}

const BarraFiltros: React.FC<BarraFiltrosProps> = ({ categories, filters, setFilters, onRefresh }) => {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Pesquisar por título, nome do arquivo ou tag..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                />
            </div>

            <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                {/* Category Filter */}
                <div className="relative shrink-0">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500" />
                    <select
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                        <option value="all">Todas Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                    </select>
                </div>

                {/* Type Filter */}
                <div className="relative shrink-0">
                    <FileType className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500" />
                    <select
                        value={filters.type}
                        onChange={e => setFilters({ ...filters, type: e.target.value })}
                        className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                        <option value="all">Todos Tipos</option>
                        <option value="pdf">Documentos PDF</option>
                        <option value="doc">Word (.doc/x)</option>
                        <option value="xls">Excel (.xls/x)</option>
                        <option value="png">Imagens (PNG/JPG)</option>
                        <option value="zip">Arquivos (ZIP/RAR)</option>
                        <option value="txt">Texto (TXT)</option>
                    </select>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={onRefresh}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-xl transition-all active:scale-95 shrink-0"
                    title="Atualizar lista"
                >
                    <RotateCw className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default BarraFiltros;
