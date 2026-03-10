import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Search, QrCode } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { formatAOA } from '../../constants';
// @ts-ignore
import QRCode from 'qrcode';

export default function POSProdutos() {
    const { user } = useAuth();
    const [produtos, setProdutos] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        nome_produto: '',
        codigo_produto: '',
        categoria_id: '',
        preco_compra: 0,
        preco_venda: 0,
        unidade: 'UN',
        stock_minimo: 0,
        ativo: true
    });

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            if (!user?.tenant_id) return;

            const [prodRes, catRes] = await Promise.all([
                supabase.from('pos_produtos').select('*, pos_categorias(nome_categoria)').eq('tenant_id', user.tenant_id).order('nome_produto'),
                supabase.from('pos_categorias').select('id, nome_categoria').eq('tenant_id', user.tenant_id)
            ]);

            if (prodRes.error) throw prodRes.error;
            if (catRes.error) throw catRes.error;

            setProdutos(prodRes.data || []);
            setCategorias(catRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async (text: string) => {
        try {
            if (!text) return null;
            return await QRCode.toDataURL(text);
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.tenant_id || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const qr_code = await generateQRCode(formData.codigo_produto);
            const payload = {
                ...formData,
                tenant_id: user.tenant_id,
                qr_code
            };

            console.log('[POSProdutos] Iniciando gravação...', payload);

            // Timeout de 15 segundos
            const operationPromise = editingId
                ? supabase.from('pos_produtos').update(payload).eq('id', editingId).eq('tenant_id', user.tenant_id)
                : supabase.from('pos_produtos').insert([payload]);

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Tempo limite excedido ao salvar produto. Verifique sua conexão.')), 15000)
            );

            const { error } = await Promise.race([operationPromise, timeoutPromise]) as any;

            if (error) throw error;
            
            (window as any).notify?.(editingId ? 'Produto atualizado' : 'Produto criado', 'success');
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            console.error('Error saving product:', error);
            (window as any).notify?.('Erro ao salvar: ' + (error.message || 'Erro desconhecido'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem a certeza que deseja eliminar este produto? O histórico de vendas será afetado.')) return;

        try {
            if (!user?.tenant_id) return;
            await supabase.from('pos_produtos')
                .delete()
                .eq('id', id)
                .eq('tenant_id', user.tenant_id);
            (window as any).notify?.('Produto eliminado', 'success');
            fetchData();
        } catch (error) {
            console.error('Error deleting product:', error);
            (window as any).notify?.('Erro ao eliminar produto', 'error');
        }
    };

    const handleEdit = (prod: any) => {
        setFormData({
            nome_produto: prod.nome_produto,
            codigo_produto: prod.codigo_produto,
            categoria_id: prod.categoria_id || '',
            preco_compra: prod.preco_compra,
            preco_venda: prod.preco_venda,
            unidade: prod.unidade || 'UN',
            stock_minimo: prod.stock_minimo || 0,
            ativo: prod.ativo
        });
        setQrCodeDataUrl(prod.qr_code);
        setEditingId(prod.id);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            nome_produto: '',
            codigo_produto: `PRD${Date.now().toString().slice(-6)}`, // Gerar código simples automaticamente
            categoria_id: '',
            preco_compra: 0,
            preco_venda: 0,
            unidade: 'UN',
            stock_minimo: 0,
            ativo: true
        });
        setQrCodeDataUrl(null);
        setEditingId(null);
    };

    const filteredProdutos = produtos.filter(p =>
        p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_produto.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white">Gestão de Produtos</h2>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-yellow-500 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-zinc-500">A carregar produtos...</div>
            ) : (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800 text-sm">
                                    <th className="p-4 text-zinc-400 font-medium">Produto</th>
                                    <th className="p-4 text-zinc-400 font-medium">Categoria</th>
                                    <th className="p-4 text-zinc-400 font-medium whitespace-nowrap">C. Compra</th>
                                    <th className="p-4 text-zinc-400 font-medium whitespace-nowrap">P. Venda</th>
                                    <th className="p-4 text-zinc-400 font-medium text-center">Status</th>
                                    <th className="p-4 text-zinc-400 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredProdutos.map(prod => (
                                    <tr key={prod.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-bold text-white">{prod.nome_produto}</p>
                                                <p className="text-xs text-zinc-500 font-mono mt-1">{prod.codigo_produto}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-300">
                                            {prod.pos_categorias?.nome_categoria || '-'}
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400 font-mono">
                                            {formatAOA(prod.preco_compra)}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-yellow-500 font-mono">
                                            {formatAOA(prod.preco_venda)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${prod.ativo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {prod.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(prod)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(prod.id)} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredProdutos.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            Nenhum produto encontrado.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200 mt-10 mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Produto' : 'Novo Produto'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Nome do Produto *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nome_produto}
                                        onChange={e => setFormData({ ...formData, nome_produto: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Código Barra/Referência *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={formData.codigo_produto}
                                            onChange={e => setFormData({ ...formData, codigo_produto: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono"
                                        />
                                        {qrCodeDataUrl && (
                                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 shrink-0">
                                                <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Categoria</label>
                                    <select
                                        value={formData.categoria_id}
                                        onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    >
                                        <option value="">Sem Categoria</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nome_categoria}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Custo de Compra (AOA) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={formData.preco_compra}
                                        onChange={e => setFormData({ ...formData, preco_compra: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Preço de Venda (AOA) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={formData.preco_venda}
                                        onChange={e => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Unidade</label>
                                    <select
                                        value={formData.unidade}
                                        onChange={e => setFormData({ ...formData, unidade: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    >
                                        <option value="UN">Unidade (UN)</option>
                                        <option value="KG">Quilograma (KG)</option>
                                        <option value="L">Litro (L)</option>
                                        <option value="CX">Caixa (CX)</option>
                                        <option value="M">Metro (M)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Alerta de Stock Mínimo</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.stock_minimo}
                                        onChange={e => setFormData({ ...formData, stock_minimo: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    />
                                </div>

                                <div className="md:col-span-2 mt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.ativo}
                                            onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                                            className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-yellow-500/50"
                                        />
                                        <span className="text-white font-medium group-hover:text-yellow-500 transition-colors">Produto ativo para venda no PDV</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 border-t border-zinc-800">
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
