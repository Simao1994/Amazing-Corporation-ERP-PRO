import React, { useState, useEffect } from 'react';
import {
    Search, ShoppingCart, User, Plus, Minus, Trash2,
    CreditCard, Banknote, Printer, ChevronLeft, LogOut
} from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';
import { formatAOA } from '../constants';
import { Link, useNavigate } from 'react-router-dom';

export default function POS() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [cart, setCart] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [caixaAtivo, setCaixaAtivo] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const subtotal = cart.reduce((acc, item) => acc + (item.preco_venda * item.qnt), 0);
    const iva = subtotal * 0.14; // IVA Padrão a 14%
    const total = subtotal + iva;

    useEffect(() => {
        if (user?.tenant_id) {
            fetchProducts();
            fetchCaixaAtivo();
        }
    }, [user]);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('pos_produtos')
                .select('*, pos_estoque(quantidade_atual)')
                .eq('empresa_id', user.tenant_id)
                .eq('ativo', true)
                .order('nome_produto');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCaixaAtivo = async () => {
        try {
            const { data, error } = await supabase
                .from('pos_caixa')
                .select('*')
                .eq('empresa_id', user.tenant_id)
                .eq('status', 'ABERTO')
                .order('data_abertura', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setCaixaAtivo(data || null);
        } catch (error) {
            console.error('Error fetching active caixa:', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_produto.includes(searchTerm)
    );

    const addToCart = (product: any) => {
        const stock = product.pos_estoque?.[0]?.quantidade_atual || 0;

        setCart(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) {
                if (exists.qnt >= stock) {
                    (window as any).notify?.('Stock insuficiente', 'error');
                    return prev;
                }
                return prev.map(item =>
                    item.id === product.id ? { ...item, qnt: item.qnt + 1 } : item
                );
            }
            if (stock <= 0) {
                (window as any).notify?.('Produto sem stock', 'error');
                return prev;
            }
            return [...prev, { ...product, qnt: 1 }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQnt = item.qnt + delta;
                const stock = item.pos_estoque?.[0]?.quantidade_atual || 0;

                if (newQnt > stock) {
                    (window as any).notify?.('Stock insuficiente', 'error');
                    return item;
                }

                return newQnt > 0 ? { ...item, qnt: newQnt } : item;
            }
            return item;
        }));
    };

    const handleCheckout = async (metodo: string) => {
        if (!caixaAtivo) {
            (window as any).notify?.('Erro: Necessário abrir o caixa primeiro!', 'error');
            return;
        }

        if (cart.length === 0) return;

        setIsProcessing(true);
        try {
            const ncf = `NCF${Date.now()}`;
            console.log('Gerando fatura:', ncf);

            // 1. Criar Fatura (empresa_id automático)
            const { data: fatura, error: faturaError } = await supabase
                .from('pos_faturas')
                .insert([{
                    numero_fatura: ncf,
                    usuario_id: user.id,
                    caixa_id: caixaAtivo.id,
                    subtotal: subtotal,
                    iva_total: iva,
                    total: total,
                    valor_recebido: total,
                    troco: 0,
                    metodo_pagamento: metodo,
                    status: 'PAGA'
                }])
                .select()
                .single();

            if (faturaError) {
                console.error('Erro ao criar fatura:', faturaError);
                throw new Error(`Erro ao criar fatura: ${faturaError.message}`);
            }

            console.log('Fatura criada com ID:', fatura.id);

            // 2. Inserir Itens e Atualizar Stock
            for (const item of cart) {
                console.log('Processando item:', item.nome_produto);

                // Item da Fatura
                const { error: itemError } = await supabase.from('pos_fatura_itens').insert([{
                    fatura_id: fatura.id,
                    produto_id: item.id,
                    quantidade: item.qnt,
                    preco_compra: item.preco_compra || 0,
                    preco_venda: item.preco_venda,
                    iva: item.preco_venda * 0.14,
                    lucro: (item.preco_venda - (item.preco_compra || 0)) * item.qnt,
                    total: (item.preco_venda * 1.14) * item.qnt
                }]);

                if (itemError) {
                    console.error('Erro ao inserir item:', itemError);
                    throw new Error(`Erro no item ${item.nome_produto}: ${itemError.message}`);
                }

                // Movimento de Stock (empresa_id automático)
                const { error: stockMovError } = await supabase.from('pos_movimento_stock').insert([{
                    produto_id: item.id,
                    tipo_movimento: 'VENDA',
                    quantidade: item.qnt,
                    referencia: ncf,
                    usuario_id: user.id
                }]);

                if (stockMovError) console.error('Aviso: Erro ao registrar movimento de stock:', stockMovError);

                // Atualizar Quantidade Atual (empresa_id necessário para o match do UPDATE se RLS permitir apenas via WHERE)
                // Mas o update usa .eq('empresa_id', user.tenant_id). 
                // Se o RLS já filtra por get_auth_tenant(), podemos tentar omiti-lo no eq() se o DB permitir.
                // No entanto, para updates, é mais seguro manter o filtro se o tenant_id estiver correto no user.
                const currentStock = item.pos_estoque?.[0]?.quantidade_atual || 0;
                const { error: stockUpdateError } = await supabase.from('pos_estoque')
                    .update({ quantidade_atual: currentStock - item.qnt })
                    .eq('produto_id', item.id)
                    .eq('empresa_id', user.tenant_id);

                if (stockUpdateError) console.error('Aviso: Erro ao atualizar stock:', stockUpdateError);
            }

            // 3. Registrar Movimento de Caixa (empresa_id automático)
            console.log('Registrando movimento de caixa...');
            const { error: caixaMovError } = await supabase.from('pos_movimentos_caixa').insert([{
                caixa_id: caixaAtivo.id,
                tipo: 'VENDA',
                valor: total,
                descricao: `Venda ${ncf}`,
                usuario_id: user.id
            }]);

            if (caixaMovError) {
                console.error('Erro ao registrar movimento de caixa:', caixaMovError);
                (window as any).notify?.('Aviso: Venda salva, mas erro ao registrar no caixa.', 'warning');
            }

            (window as any).notify?.('Venda finalizada com sucesso!', 'success');
            setCart([]);
            fetchProducts();
            fetchCaixaAtivo();

            // Simular Impressão com confirmação para não bloquear
            const shouldPrint = window.confirm('Venda finalizada com sucesso! Deseja imprimir o recibo agora?');
            if (shouldPrint) {
                window.print();
            }

        } catch (error: any) {
            console.error('Checkout error:', error);
            (window as any).notify?.('Erro ao processar venda: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row overflow-hidden font-sans">

            {/* PAINEL ESQUERDO: PRODUTOS E PESQUISA */}
            <div className="flex-1 flex flex-col h-screen border-r border-zinc-900 bg-[#0a0a0a]">
                {/* Cabeçalho */}
                <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/vendas" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black uppercase text-white tracking-widest flex items-center gap-2">
                                <ShoppingCart className="text-yellow-500" /> POS Terminal
                            </h1>
                            <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Operador: {user?.nome || 'Sistema'}</p>
                        </div>
                    </div>
                    {caixaAtivo ? (
                        <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                            Caixa Aberto: {formatAOA(caixaAtivo.valor_inicial)}
                        </div>
                    ) : (
                        <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                            Caixa Fechado
                        </div>
                    )}
                </div>

                {/* Pesquisa */}
                <div className="p-4 bg-[#0a0a0a]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                        <input
                            type="text"
                            placeholder="Pesquisar por nome, código ou ler QRCode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-mono"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Grelha de Produtos */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse">
                            Carregando produtos...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(produto => (
                                <button
                                    key={produto.id}
                                    onClick={() => addToCart(produto)}
                                    className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:border-yellow-500/50 hover:bg-zinc-800/80 transition-all text-left group flex flex-col h-full"
                                >
                                    <div className="flex-1">
                                        <span className="text-xs text-zinc-500 font-mono mb-2 block">{produto.codigo_produto}</span>
                                        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-yellow-400 transition-colors line-clamp-2">{produto.nome_produto}</h3>
                                    </div>
                                    <div className="mt-4 flex items-end justify-between">
                                        <span className="text-lg font-black text-white">{formatAOA(produto.preco_venda)}</span>
                                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${(produto.pos_estoque?.[0]?.quantidade_atual || 0) > 0
                                            ? 'text-emerald-500 bg-emerald-500/10'
                                            : 'text-red-500 bg-red-500/10'
                                            }`}>
                                            Stock: {produto.pos_estoque?.[0]?.quantidade_atual || 0}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* PAINEL DIREITO: CARRINHO E FINALIZAÇÃO */}
            <div className="w-full md:w-[400px] lg:w-[450px] bg-zinc-900 h-screen flex flex-col shadow-2xl relative z-10">

                {/* Cabeçalho do Carrinho */}
                <div className="p-6 pb-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-wider">Fatura Atual</h2>
                        <span className="bg-yellow-500 text-zinc-900 text-xs font-black px-3 py-1 rounded-full">
                            {cart.length} ITENS
                        </span>
                    </div>

                    <button className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                                <User size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-zinc-300">Cliente Standard</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Consumidor Final</p>
                            </div>
                        </div>
                        <Plus size={16} className="text-zinc-500 group-hover:text-white" />
                    </button>
                </div>

                {/* Itens do Carrinho */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
                            <ShoppingCart size={64} className="text-zinc-700" />
                            <p className="text-sm uppercase tracking-widest font-bold">Carrinho Vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-zinc-200 truncate">{item.nome_produto}</h4>
                                    <p className="text-xs text-yellow-500 font-mono mt-1">{formatAOA(item.preco_venda)} x {item.qnt}</p>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md">
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-bold text-white">{item.qnt}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Totais e Pagamento */}
                <div className="p-6 bg-zinc-950 border-t border-zinc-800 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.5)]">
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500 uppercase tracking-widest font-bold">Subtotal</span>
                            <span className="font-mono text-zinc-300">{formatAOA(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500 uppercase tracking-widest font-bold">IVA (14%)</span>
                            <span className="font-mono text-zinc-300">{formatAOA(iva)}</span>
                        </div>
                        <div className="h-px bg-zinc-800 w-full my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-zinc-400 uppercase tracking-widest font-black text-sm mb-1">Total MZN</span>
                            <span className="font-mono text-3xl font-black text-yellow-500 tracking-tighter">
                                {formatAOA(total)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={() => handleCheckout('DINHEIRO')}
                            disabled={cart.length === 0 || !caixaAtivo || isProcessing}
                            className="bg-zinc-900 border border-zinc-800 text-white p-4 justify-center rounded-2xl flex items-center gap-2 hover:bg-zinc-800 hover:border-zinc-700 transition-all group disabled:opacity-50"
                        >
                            <Banknote className="text-emerald-500 group-hover:scale-110 transition-transform" />
                            <span className="font-bold">Dinheiro</span>
                        </button>
                        <button
                            onClick={() => handleCheckout('MULTICAIXA')}
                            disabled={cart.length === 0 || !caixaAtivo || isProcessing}
                            className="bg-zinc-900 border border-zinc-800 text-white p-4 justify-center rounded-2xl flex items-center gap-2 hover:bg-zinc-800 hover:border-zinc-700 transition-all group disabled:opacity-50"
                        >
                            <CreditCard className="text-sky-500 group-hover:scale-110 transition-transform" />
                            <span className="font-bold">Multicaixa</span>
                        </button>
                    </div>

                    <button
                        onClick={() => handleCheckout('DINHEIRO')}
                        disabled={cart.length === 0 || !caixaAtivo || isProcessing}
                        className="w-full bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all shadow-[0_0_30px_rgba(234,179,8,0.2)] disabled:shadow-none relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Printer size={20} />
                            {isProcessing ? 'Processando...' : 'Finalizar & Imprimir'}
                        </span>
                        {!isProcessing && <div className="absolute inset-0 w-full h-full bg-yellow-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out z-0"></div>}
                    </button>
                </div>

            </div>
        </div>
    );
}

