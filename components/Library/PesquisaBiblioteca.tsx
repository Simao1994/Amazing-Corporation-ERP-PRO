
import React from 'react';
import { Search, Filter, BookOpen, Layers } from 'lucide-react';
import Input from '../ui/Input';

interface PesquisaBibliotecaProps {
    search: string;
    onSearchChange: (val: string) => void;
    categoria: string;
    onCategoriaChange: (val: string) => void;
    categorias: any[];
    tipo: string;
    onTipoChange: (val: string) => void;
}

const PesquisaBiblioteca: React.FC<PesquisaBibliotecaProps> = ({
    search,
    onSearchChange,
    categoria,
    onCategoriaChange,
    categorias,
    tipo,
    onTipoChange
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-sky-100 shadow-sm">
            <div className="flex-1 w-full">
                <Input
                    icon={<Search size={18} />}
                    placeholder="Pesquisar por título, autor, ISBN ou palavras-chave..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="border-none bg-zinc-50 rounded-2xl h-12"
                />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {/* Categorias */}
                <div className="flex items-center gap-2 px-4 bg-zinc-50 rounded-2xl border border-zinc-100 h-12">
                    <Layers size={16} className="text-zinc-400" />
                    <select
                        value={categoria}
                        onChange={(e) => onCategoriaChange(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-600 min-w-[120px]"
                    >
                        <option value="all">Todas as Categorias</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                    </select>
                </div>

                {/* Tipo de Material */}
                <div className="flex items-center gap-2 px-4 bg-zinc-50 rounded-2xl border border-zinc-100 h-12">
                    <BookOpen size={16} className="text-zinc-400" />
                    <select
                        value={tipo}
                        onChange={(e) => onTipoChange(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-600"
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="livro">Livro</option>
                        <option value="artigo">Artigo</option>
                        <option value="manual">Manual</option>
                        <option value="relatorio">Relatório</option>
                        <option value="revista">Revista</option>
                        <option value="tese">Tese</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default PesquisaBiblioteca;
