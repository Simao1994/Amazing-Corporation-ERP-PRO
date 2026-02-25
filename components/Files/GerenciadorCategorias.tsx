import React, { useState } from 'react';
import { Tag, Plus, Trash2, X, Hash } from 'lucide-react';
import { FilesService } from '../../utils/filesService';
import { FileCategory, User } from '../../types';

interface GerenciadorCategoriasProps {
    user: User | null;
    categories: FileCategory[];
    onRefresh: () => void;
    onClose: () => void;
}

const GerenciadorCategorias: React.FC<GerenciadorCategoriasProps> = ({ user, categories, onRefresh, onClose }) => {
    const [newCat, setNewCat] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCat.trim()) return;
        setLoading(true);
        console.log('[GERENCIADOR_CATEGORIAS] Creating category:', { newCat, userId: user?.id, userObject: user });
        try {
            await FilesService.createCategory(newCat.trim(), user?.id);
            setNewCat('');
            console.log('Category created successfully, refreshing list...');
            await onRefresh();
        } catch (err: any) {
            console.error('Detailed error in handleCreate:', err);
            const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
            alert(`Erro ao criar categoria: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cat: FileCategory) => {
        if (!confirm(`Excluir categoria "${cat.nome}"? Documentos nesta categoria ficarão sem categoria (não serão excluídos).`)) return;
        try {
            await FilesService.deleteCategory(cat.id, cat.nome);
            onRefresh();
        } catch (err) {
            alert('Erro ao excluir categoria.');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl">
                        <Tag className="w-6 h-6 text-indigo-600" />
                        Categorias
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleCreate} className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                value={newCat}
                                onChange={e => setNewCat(e.target.value)}
                                placeholder="Nova categoria..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                            />
                        </div>
                        <button
                            disabled={loading || !newCat.trim()}
                            className="px-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </form>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {categories.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm italic">Nenhuma categoria criada.</p>
                        ) : (
                            categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-all">
                                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                        {cat.nome}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(cat)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-all font-semibold text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GerenciadorCategorias;
