
import React, { useState } from 'react';
import { X, Trash2, Edit2, Plus, Layers, Info } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface GestorCategoriasProps {
    categorias: any[];
    onRefresh: () => void;
    onClose: () => void;
}

const GestorCategorias: React.FC<GestorCategoriasProps> = ({ categorias, onRefresh, onClose }) => {
    const [novoNome, setNovoNome] = useState('');
    const [novaDescricao, setNovaDescricao] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novoNome) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('biblioteca_categorias').insert({
                nome: novoNome,
                descricao: novaDescricao
            });
            if (error) throw error;
            setNovoNome('');
            setNovaDescricao('');
            await onRefresh();
        } catch (err: any) {
            console.error('Error creating library category:', err);
            alert(`Erro ao criar categoria: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem a certeza? Materiais nesta categoria ficarão órfãos.")) return;
        try {
            await supabase.from('biblioteca_categorias').delete().eq('id', id);
            onRefresh();
        } catch (err) {
            alert("Erro ao apagar categoria.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-zinc-900 shadow-lg">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 uppercase">Gestor de Categorias</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Organização lateral do acervo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-zinc-400 transition-all active:scale-95"><X size={24} /></button>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                    {/* Form Novo */}
                    <form onSubmit={handleCreate} className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Plus size={16} className="text-yellow-600" />
                            <h3 className="text-xs font-black text-zinc-700 uppercase tracking-widest">Nova Categoria</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none"
                                placeholder="Nome da Categoria..."
                                value={novoNome}
                                onChange={(e) => setNovoNome(e.target.value)}
                            />
                            <input
                                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-yellow-500/20 outline-none"
                                placeholder="Descrição Breve..."
                                value={novaDescricao}
                                onChange={(e) => setNovaDescricao(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !novoNome}
                            className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
                        >
                            {loading ? 'A Adicionar...' : 'Adicionar Categoria'}
                        </button>
                    </form>

                    {/* Lista Existente */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Categorias Registadas ({categorias.length})</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {categorias.map(cat => (
                                <div key={cat.id} className="p-4 border border-zinc-100 rounded-2xl flex items-center justify-between group hover:bg-zinc-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 font-black text-xs">
                                            {cat.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-zinc-900 uppercase">{cat.nome}</p>
                                            <p className="text-[10px] text-zinc-500 font-bold">{cat.descricao || 'Sem descrição'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-zinc-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestorCategorias;
