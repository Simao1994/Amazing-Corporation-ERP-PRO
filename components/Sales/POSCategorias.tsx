import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Search } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';

export default function POSCategorias() {
    const { user } = useAuth();
    const [categorias, setCategorias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        nome_categoria: '',
        descricao: ''
    });

    useEffect(() => {
        fetchCategorias();
    }, [user]);

    const fetchCategorias = async () => {
        try {
            if (!user?.tenant_id) return;
            const { data, error } = await supabase
                .from('pos_categorias')
                .select('*')
                .eq('tenant_id', user.tenant_id)
                .order('nome_categoria', { ascending: true });

            if (error) throw error;
            setCategorias(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.tenant_id || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const payload = {
                nome_categoria: formData.nome_categoria.trim(),
                descricao: formData.descricao.trim(),
                tenant_id: user.tenant_id
            };

            console.log('[POSCategorias] Iniciando gravação...', payload);

            // Timeout de 15 segundos para a operação
            const operationPromise = editingId 
                ? supabase.from('pos_categorias').update(payload).eq('id', editingId).eq('tenant_id', user.tenant_id)
                : supabase.from('pos_categorias').insert([payload]);

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Tempo limite excedido na comunicação com o servidor. Verifique sua conexão.')), 15000)
            );

            const { error } = await Promise.race([operationPromise, timeoutPromise]) as any;

            if (error) throw error;
            
            (window as any).notify?.(editingId ? 'Categoria atualizada' : 'Categoria criada', 'success');
            setShowModal(false);
            resetForm();
            fetchCategorias();
        } catch (error: any) {
            console.error('Error saving category:', error);
            (window as any).notify?.('Erro ao salvar: ' + (error.message || 'Erro desconhecido'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem a certeza que deseja eliminar esta categoria? Produtos associados ficarão sem categoria.')) return;

        try {
            if (!user?.tenant_id) return;
            await supabase.from('pos_categorias')
                .delete()
                .eq('id', id)
                .eq('tenant_id', user.tenant_id);
            (window as any).notify?.('Categoria eliminada', 'success');
            fetchCategorias();
        } catch (error) {
            console.error('Error deleting category:', error);
            (window as any).notify?.('Erro ao eliminar categoria', 'error');
        }
    };

    const handleEdit = (cat: any) => {
        setFormData({
            nome_categoria: cat.nome_categoria,
            descricao: cat.descricao || ''
        });
        setEditingId(cat.id);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ nome_categoria: '', descricao: '' });
        setEditingId(null);
    };

    const filteredCategorias = categorias.filter(c =>
        c.nome_categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white">Categorias de Produtos</h2>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-yellow-500 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nova Categoria
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-zinc-500">A carregar categorias...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategorias.map(cat => (
                        <div key={cat.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl group hover:border-zinc-700 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white">{cat.nome_categoria}</h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(cat)} className="text-zinc-400 hover:text-white transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-400 line-clamp-2">{cat.descricao || 'Sem descrição'}</p>
                        </div>
                    ))}
                    {filteredCategorias.length === 0 && (
                        <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                            Nenhuma categoria encontrada.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Nome da Categoria</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome_categoria}
                                    onChange={e => setFormData({ ...formData, nome_categoria: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    placeholder="Ex: Bebidas"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Descrição (Opcional)</label>
                                <textarea
                                    value={formData.descricao}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 min-h-[100px]"
                                    placeholder="Descrição da categoria..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-yellow-500 text-zinc-900 px-4 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={20} className={isSubmitting ? "animate-pulse" : ""} />
                                    {isSubmitting ? 'A salvar...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
