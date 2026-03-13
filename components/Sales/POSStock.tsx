import React, { useState, useEffect } from 'react';
import { Package, Search, ArrowUpCircle, ArrowDownCircle, Info, RefreshCw } from 'lucide-react';
import { supabase, safeQuery } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { formatAOA } from '../../constants';

export default function POSStock() {
    const { user } = useAuth();
    const [estoque, setEstoque] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states for New Adjustment
    const [showModal, setShowModal] = useState(false);
    const [produtos, setProdutos] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        produto_id: '',
        tipo: 'entrada',
        quantidade: 1,
        motivo: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user?.tenant_id) {
            fetchData();
        }
    }, [user?.tenant_id]);

    const fetchData = async () => {
        if (!user?.tenant_id) return;
        setLoading(true);
        try {
            console.log('[POSStock] Buscando dados para tenant:', user.tenant_id);

            const [stockRes, prodRes] = await Promise.all([
                safeQuery(() =>
                    supabase
                        .from('pos_estoque')
                        .select(`
                            id, quantidade_atual, data_ultima_entrada, 
                            pos_produtos (id, nome_produto, codigo_produto, stock_minimo)
                        `)
                        .eq('tenant_id', user.tenant_id)
                ),
                safeQuery(() =>
                    supabase
                        .from('pos_produtos')
                        .select('id, nome_produto')
                        .eq('tenant_id', user.tenant_id)
                        .eq('ativo', true)
                        .order('nome_produto')
                )
            ]);

            if (stockRes.error) throw stockRes.error;
            if (prodRes.error) throw prodRes.error;

            console.log(`[POSStock] Sucesso: ${stockRes.data?.length || 0} registros de estoque, ${prodRes.data?.length || 0} produtos ativos.`);

            setEstoque(stockRes.data || []);
            setProdutos(prodRes.data || []);
        } catch (error: any) {
            console.error('[POSStock] Erro ao carregar dados:', error);
            (window as any).notify?.('Erro ao carregar dados: ' + (error.message || 'Erro de conexão'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.tenant_id || isSubmitting) return;

        try {
            setIsSubmitting(true);

            // 1. Verificar se o registo de stock existe
            const { data: existingStock, error: fetchError } = await safeQuery(() =>
                supabase
                    .from('pos_estoque')
                    .select('*')
                    .eq('produto_id', formData.produto_id)
                    .eq('tenant_id', user.tenant_id)
                    .maybeSingle()
            ) as any;

            if (fetchError) throw fetchError;

            let newAmount = formData.quantidade;

            if (existingStock) {
                if (formData.tipo === 'saida' || formData.tipo === 'ajuste') {
                    newAmount = (existingStock.quantidade_atual || 0) - formData.quantidade;
                } else {
                    newAmount = (existingStock.quantidade_atual || 0) + formData.quantidade;
                }

                const { error: updateError } = await safeQuery(() =>
                    supabase
                        .from('pos_estoque')
                        .update({
                            quantidade_atual: newAmount,
                            data_ultima_entrada: formData.tipo === 'entrada' ? new Date().toISOString() : existingStock.data_ultima_entrada
                        })
                        .eq('id', existingStock.id)
                        .eq('tenant_id', user.tenant_id)
                );

                if (updateError) throw updateError;
            } else {
                if (formData.tipo === 'saida' || formData.tipo === 'ajuste') {
                    (window as any).notify?.('Produto sem estoque inicial para deduzir.', 'error');
                    setIsSubmitting(false);
                    return;
                }
                const { error: insertError } = await safeQuery(() =>
                    supabase
                        .from('pos_estoque')
                        .insert([{
                            tenant_id: user.tenant_id,
                            produto_id: formData.produto_id,
                            quantidade_atual: formData.quantidade
                        }])
                );

                if (insertError) throw insertError;
            }

            // 2. Registar o movimento (Log)
            const { error: movError } = await safeQuery(() =>
                supabase
                    .from('pos_movimento_stock')
                    .insert([{
                        tenant_id: user.tenant_id,
                        produto_id: formData.produto_id,
                        usuario_id: user.id || null,
                        tipo_movimento: formData.tipo === 'entrada' ? 'ENTRADA' : (formData.tipo === 'saida' ? 'VENDA' : 'AJUSTE'),
                        quantidade: formData.quantidade,
                        referencia: formData.motivo || 'Ajuste manual'
                    }])
            );

            if (movError) console.error('Aviso: Movimento não logado corretamente:', movError);

            (window as any).notify?.('Movimento de stock registado com sucesso', 'success');
            setShowModal(false);
            setFormData({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '' });
            fetchData();
        } catch (error: any) {
            console.error('Adjustment error:', error);
            (window as any).notify?.('Falha ao registar movimento: ' + (error.message || 'Erro de conexão'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredEstoque = estoque.filter(item =>
        item.pos_produtos?.nome_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pos_produtos?.codigo_produto?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const checkLowStock = (item: any) => {
        return item.quantidade_atual <= (item.pos_produtos?.stock_minimo || 0);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="text-yellow-500" /> Controle de Estoque
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="p-3 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                        title="Atualizar"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl font-bold hover:bg-emerald-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <ArrowUpCircle size={20} />
                        Movimento / Ajuste
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-2">Total de Itens</h3>
                    <p className="text-3xl font-black text-white">{estoque.length}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-2">Stock Baixo Alertas</h3>
                    <p className="text-3xl font-black text-red-500">
                        {estoque.filter(i => checkLowStock(i)).length}
                    </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-2">Valor Estimado em Stock</h3>
                    <p className="text-3xl font-black text-yellow-500 tracking-tighter">N/D</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar por produto no estoque..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-zinc-500">A carregar inventário...</div>
            ) : (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800 text-sm">
                                    <th className="p-4 text-zinc-400 font-medium">Produto</th>
                                    <th className="p-4 text-zinc-400 font-medium text-center">Quantidade Atual</th>
                                    <th className="p-4 text-zinc-400 font-medium text-center">Status</th>
                                    <th className="p-4 text-zinc-400 font-medium text-right">Última Entrada</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredEstoque.map(item => {
                                    const isLowStock = checkLowStock(item);

                                    return (
                                        <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-bold text-white">{item.pos_produtos?.nome_produto || 'Produto Desconhecido'}</p>
                                                    <p className="text-xs text-zinc-500 font-mono mt-1">{item.pos_produtos?.codigo_produto}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center">
                                                    <span className={`text-xl font-black ${isLowStock ? 'text-red-500' : 'text-white'}`}>
                                                        {item.quantidade_atual}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${isLowStock
                                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    }`}>
                                                    {isLowStock ? 'Stock Baixo' : 'Normal'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right text-sm text-zinc-400">
                                                {item.data_ultima_entrada ? new Date(item.data_ultima_entrada).toLocaleDateString('pt-PT') : 'N/D'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredEstoque.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            Nenhum registo de estoque.
                        </div>
                    )}
                </div>
            )}

            {/* Modal Ajuste */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Registo de Movimento</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                X
                            </button>
                        </div>

                        <form onSubmit={handleAdjustment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Produto *</label>
                                <select
                                    required
                                    value={formData.produto_id}
                                    onChange={e => setFormData({ ...formData, produto_id: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                >
                                    <option value="">Selecione um produto</option>
                                    {produtos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nome_produto}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Tipo de Movimento *</label>
                                    <select
                                        required
                                        value={formData.tipo}
                                        onChange={e => setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida' | 'ajuste' })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    >
                                        <option value="entrada">Entrada (+) </option>
                                        <option value="saida">Saída (-)</option>
                                        <option value="ajuste">Ajuste Quebra/Perda (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Quantidade *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.quantidade}
                                        onChange={e => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Motivo / Observação</label>
                                <input
                                    type="text"
                                    value={formData.motivo}
                                    onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                                    placeholder="Ex: Compra a fornecedor, Quebra, etc."
                                />
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
                                    {isSubmitting ? 'A registar...' : 'Registar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
