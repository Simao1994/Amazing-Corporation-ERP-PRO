import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Search, User } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';

export default function POSClientes() {
    const { user } = useAuth();
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nome: '',
        nif: '',
        email: '',
        telefone: '',
        morada: ''
    });

    useEffect(() => {
        fetchClientes();
    }, [user]);

    const fetchClientes = async () => {
        try {
            if (!user?.tenant_id) return;
            const { data, error } = await supabase
                .from('pos_clientes')
                .select('*')
                .eq('tenant_id', user.tenant_id)
                .order('nome', { ascending: true });

            if (error) throw error;
            setClientes(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
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
                ...formData,
                tenant_id: user.tenant_id
            };

            if (editingId) {
                const { error } = await supabase
                    .from('pos_clientes')
                    .update(payload)
                    .eq('id', editingId)
                    .eq('tenant_id', user.tenant_id);
                if (error) throw error;
                (window as any).notify?.('Cliente atualizado com sucesso', 'success');
            } else {
                const { error } = await supabase
                    .from('pos_clientes')
                    .insert([payload]);
                if (error) throw error;
                (window as any).notify?.('Cliente cadastrado com sucesso', 'success');
            }

            setShowModal(false);
            resetForm();
            fetchClientes();
        } catch (error: any) {
            console.error('Error saving client:', error);
            (window as any).notify?.('Erro ao salvar: ' + (error.message || 'Verifique sua conexão'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente eliminar este cliente?')) return;

        try {
            const { error } = await supabase
                .from('pos_clientes')
                .delete()
                .eq('id', id)
                .eq('tenant_id', user?.tenant_id);
            
            if (error) throw error;
            (window as any).notify?.('Cliente removido', 'success');
            fetchClientes();
        } catch (error) {
            console.error('Error deleting client:', error);
            (window as any).notify?.('Erro ao eliminar cliente', 'error');
        }
    };

    const handleEdit = (cliente: any) => {
        setFormData({
            nome: cliente.nome,
            nif: cliente.nif || '',
            email: cliente.email || '',
            telefone: cliente.telefone || '',
            morada: cliente.morada || ''
        });
        setEditingId(cliente.id);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ nome: '', nif: '', email: '', telefone: '', morada: '' });
        setEditingId(null);
    };

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nif && c.nif.includes(searchTerm))
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <User className="text-yellow-500" /> Gestão de Clientes
                </h2>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-yellow-500 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar por nome ou NIF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-zinc-500">A carregar clientes...</div>
            ) : (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800 text-sm">
                                    <th className="p-4 text-zinc-400 font-medium">Nome</th>
                                    <th className="p-4 text-zinc-400 font-medium">NIF</th>
                                    <th className="p-4 text-zinc-400 font-medium">Contacto</th>
                                    <th className="p-4 text-zinc-400 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredClientes.map(c => (
                                    <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-white">{c.nome}</p>
                                            <p className="text-xs text-zinc-500">{c.email}</p>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400 font-mono">{c.nif || 'N/D'}</td>
                                        <td className="p-4 text-sm text-zinc-400">{c.telefone || 'N/D'}</td>
                                        <td className="p-4 text-sm text-zinc-400 truncate max-w-[150px]">{c.morada || 'N/D'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(c)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredClientes.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">Nenhum cliente cadastrado.</div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Nome Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">NIF (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.nif}
                                        onChange={e => setFormData({ ...formData, nif: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Telefone</label>
                                    <input
                                        type="text"
                                        value={formData.telefone}
                                        onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Morada / Endereço</label>
                                    <textarea
                                        value={formData.morada}
                                        onChange={e => setFormData({ ...formData, morada: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 min-h-[80px]"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 border-t border-zinc-800">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-yellow-500 text-zinc-900 px-4 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    {isSubmitting ? 'A salvar...' : 'Salvar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
