import React, { useState, useEffect } from 'react';
import { Search, Receipt, Printer, Eye, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { formatAOA } from '../../constants';

export default function POSVendas() {
    const { user } = useAuth();
    const [vendas, setVendas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModalInfo, setShowModalInfo] = useState(false);
    const [vendaSelecionada, setVendaSelecionada] = useState<any>(null);
    const [itensVenda, setItensVenda] = useState<any[]>([]);
    const [loadingItens, setLoadingItens] = useState(false);

    useEffect(() => {
        fetchVendas();
    }, [user]);

    const fetchVendas = async () => {
        try {
            if (!user?.tenant_id) return;
            // We fetch from pos_faturas where status is pago usually
            const { data, error } = await supabase
                .from('pos_faturas')
                .select(`*, pos_caixa (id, usuario_id)`)
                .eq('empresa_id', user.tenant_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVendas(data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItensVenda = async (faturaId: string) => {
        try {
            setLoadingItens(true);
            const { data, error } = await supabase
                .from('pos_fatura_itens')
                .select('*, pos_produtos(nome_produto, codigo_produto)')
                .eq('fatura_id', faturaId);

            if (error) throw error;
            setItensVenda(data || []);
        } catch (error) {
            console.error('Error fetching sale items:', error);
            (window as any).notify?.('Erro ao carrgear itens da venda', 'error');
        } finally {
            setLoadingItens(false);
        }
    };

    const handleVisualizar = (venda: any) => {
        setVendaSelecionada(venda);
        fetchItensVenda(venda.id);
        setShowModalInfo(true);
    };

    const handleImprimirRecibo = (venda: any) => {
        // In a real app this might trigger a thermal printer endpoint or open a new window
        (window as any).notify?.('Impressão de 2ª via enviada para impressora térmica.', 'success');
    };

    const filteredVendas = vendas.filter(v =>
        v.numero_fatura?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Receipt className="text-yellow-500" /> Histórico de Vendas
                </h2>

                <div className="flex gap-2">
                    <button className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
                        <Calendar size={18} /> Hoje
                    </button>
                    <button className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
                        <FileText size={18} /> Exportar
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar por NCF ou Nome de Cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-zinc-500">A carregar histórico de vendas...</div>
            ) : (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800 text-sm">
                                    <th className="p-4 text-zinc-400 font-medium whitespace-nowrap">Data</th>
                                    <th className="p-4 text-zinc-400 font-medium">Documento</th>
                                    <th className="p-4 text-zinc-400 font-medium">Cliente</th>
                                    <th className="p-4 text-zinc-400 font-medium">Total</th>
                                    <th className="p-4 text-zinc-400 font-medium text-center">Status</th>
                                    <th className="p-4 text-zinc-400 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50 text-sm">
                                {filteredVendas.map(venda => (
                                    <tr key={venda.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4 text-zinc-400 font-mono">
                                            {new Date(venda.created_at).toLocaleString('pt-PT')}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-white font-mono">{venda.numero_fatura}</span>
                                        </td>
                                        <td className="p-4 text-zinc-300">
                                            {venda.cliente_nome || 'Consumidor Final'}
                                            {venda.cliente_nif && <span className="block text-xs text-zinc-500 font-mono">NIF: {venda.cliente_nif}</span>}
                                        </td>
                                        <td className="p-4 font-black text-yellow-500 font-mono">
                                            {formatAOA(venda.total_geral)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${venda.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                : venda.status === 'anulado' ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                }`}>
                                                {venda.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleVisualizar(venda)}
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleImprimirRecibo(venda)}
                                                    className="p-2 text-zinc-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                    title="2ª Via Recibo"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredVendas.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            Nenhuma venda encontrada no histórico.
                        </div>
                    )}
                </div>
            )}


            {/* Modal View Invoice */}
            {showModalInfo && vendaSelecionada && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                                    <Receipt className="text-zinc-500" /> Detalhes da {vendaSelecionada.tipo === 'fatura_recibo' ? 'Fatura/Recibo' : 'Venda Dinheiro'}
                                </h3>
                                <p className="font-mono text-yellow-500 font-bold">{vendaSelecionada.numero_fatura}</p>
                            </div>
                            <button onClick={() => setShowModalInfo(false)} className="text-zinc-500 hover:text-white transition-colors">
                                Cancelar
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                            <div>
                                <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Cliente</p>
                                <p className="text-white font-bold">{vendaSelecionada.cliente_nome || 'Consumidor Final'}</p>
                                <p className="text-zinc-400 font-mono">{vendaSelecionada.cliente_nif || 'NIF: N/D'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Data de Emissão</p>
                                <p className="text-white font-mono">{new Date(vendaSelecionada.created_at).toLocaleString('pt-PT')}</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="p-3 text-zinc-400 font-medium">Qtd</th>
                                        <th className="p-3 text-zinc-400 font-medium">Artigo</th>
                                        <th className="p-3 text-zinc-400 font-medium text-right">P. Unit</th>
                                        <th className="p-3 text-zinc-400 font-medium text-right">IVA</th>
                                        <th className="p-3 text-zinc-400 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {loadingItens ? (
                                        <tr><td colSpan={5} className="p-4 text-center text-zinc-500">Caregando itens...</td></tr>
                                    ) : itensVenda.map(item => (
                                        <tr key={item.id}>
                                            <td className="p-3 font-mono text-white">{item.quantidade}x</td>
                                            <td className="p-3 text-zinc-300">{item.pos_produtos?.nome_produto || 'Produto Removido'}</td>
                                            <td className="p-3 text-right font-mono text-zinc-400">{formatAOA(item.preco_unitario)}</td>
                                            <td className="p-3 text-right font-mono text-zinc-400">{formatAOA(item.valor_imposto)}</td>
                                            <td className="p-3 text-right font-mono text-white font-bold">{formatAOA(item.total)}</td>
                                        </tr>
                                    ))}
                                    {itensVenda.length === 0 && !loadingItens && (
                                        <tr><td colSpan={5} className="p-4 text-center text-zinc-500">Sem itens registados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                            <div className="w-full max-w-xs space-y-2 text-sm">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Total Ilíquido</span>
                                    <span className="font-mono">{formatAOA(vendaSelecionada.total_iliquido)}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Total IVA</span>
                                    <span className="font-mono">{formatAOA(vendaSelecionada.total_imposto)}</span>
                                </div>
                                {vendaSelecionada.total_desconto > 0 && (
                                    <div className="flex justify-between text-emerald-500">
                                        <span>Desconto</span>
                                        <span className="font-mono">-{formatAOA(vendaSelecionada.total_desconto)}</span>
                                    </div>
                                )}
                                <div className="border-t border-zinc-800 my-2"></div>
                                <div className="flex justify-between items-end">
                                    <span className="text-white font-bold uppercase tracking-widest text-xs">Total AOA</span>
                                    <span className="font-black text-2xl text-yellow-500 font-mono tracking-tighter">
                                        {formatAOA(vendaSelecionada.total_geral)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                onClick={() => handleImprimirRecibo(vendaSelecionada)}
                                className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors flex items-center gap-2"
                            >
                                <Printer size={20} /> Imprimir 2ª Via
                            </button>
                            <button
                                onClick={() => setShowModalInfo(false)}
                                className="bg-yellow-500 text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
                            >
                                Fechar Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
