
import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import Input from '../ui/Input';

interface FiltroGaleriaProps {
    search: string;
    onSearchChange: (val: string) => void;
    tipo: string;
    onTipoChange: (val: string) => void;
    sort: string;
    onSortChange: (val: string) => void;
}

const FiltroGaleria: React.FC<FiltroGaleriaProps> = ({ search, onSearchChange, tipo, onTipoChange, sort, onSortChange }) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-sky-100 shadow-sm">
            <div className="flex-1 w-full">
                <Input
                    icon={<Search size={18} />}
                    placeholder="Pesquisar por nome ou tag..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="border-none bg-zinc-50 rounded-2xl h-12"
                />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {/* Tipo Filter */}
                <div className="flex items-center gap-2 px-4 bg-zinc-50 rounded-2xl border border-zinc-100 h-12">
                    <Filter size={16} className="text-zinc-400" />
                    <select
                        value={tipo}
                        onChange={(e) => onTipoChange(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-600"
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="image">Imagens</option>
                        <option value="video">Vídeos</option>
                    </select>
                </div>

                {/* Sort Filter */}
                <div className="flex items-center gap-2 px-4 bg-zinc-50 rounded-2xl border border-zinc-100 h-12">
                    <ArrowUpDown size={16} className="text-zinc-400" />
                    <select
                        value={sort}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-600"
                    >
                        <option value="date-desc">Mais Recentes</option>
                        <option value="date-asc">Mais Antigos</option>
                        <option value="name-asc">Nome (A-Z)</option>
                        <option value="name-desc">Nome (Z-A)</option>
                        <option value="size-desc">Maior Tamanho</option>
                        <option value="size-asc">Menor Tamanho</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default FiltroGaleria;
