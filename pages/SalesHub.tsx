import React, { useState, useEffect } from 'react';
import {
    ShoppingCart, Package, Tags, CreditCard,
    BarChart, QrCode, TrendingUp, Settings2, User as UserIcon,
    RefreshCw, Clock, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { formatAOA } from '../constants';
import { supabase, safeQuery } from '../src/lib/supabase';

import POSProdutos from '../components/Sales/POSProdutos';
import POSCategorias from '../components/Sales/POSCategorias';
import POSStock from '../components/Sales/POSStock';
import POSCaixa from '../components/Sales/POSCaixa';
import POSVendas from '../components/Sales/POSVendas';
import POSClientes from '../components/Sales/POSClientes';

export default function SalesHub() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [metrics, setMetrics] = useState({
        today: 0,
        month: 0,
        count: 0,
        lowStock: 0
    });
    const [recentSales, setRecentSales] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);

    const tabs = [
        { id: 'dashboard', label: 'Panorama Geral', icon: <TrendingUp size={20} /> },
        { id: 'vendas', label: 'Histórico de Vendas', icon: <ShoppingCart size={20} /> },
        { id: 'produtos', label: 'Produtos', icon: <Package size={20} /> },
        { id: 'categorias', label: 'Categorias', icon: <Tags size={20} /> },
        { id: 'clientes', label: 'Clientes', icon: <UserIcon size={20} /> },
        { id: 'estoque', label: 'Controle de Estoque', icon: <BarChart size={20} /> },
        { id: 'caixa', label: 'Gestão de Caixa', icon: <CreditCard size={20} /> },
        { id: 'pos', label: 'Abrir POS', icon: <QrCode size={20} /> },
    ];

    useEffect(() => {
        if (user?.tenant_id) {
            fetchDashboardStats();
        }
    }, [user?.tenant_id]);

    const fetchDashboardStats = async () => {
        if (!user?.tenant_id) return;
        setStatsLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const [todayRes, monthRes, stockRes, lastRes] = await Promise.all([
                safeQuery(() => supabase.from('pos_faturas').select('total').eq('tenant_id', user.tenant_id).gte('created_at', today.toISOString()).eq('status', 'PAGA')),
                safeQuery(() => supabase.from('pos_faturas').select('total').eq('tenant_id', user.tenant_id).gte('created_at', firstDayMonth.toISOString()).eq('status', 'PAGA')),
                safeQuery(() => supabase.from('pos_estoque').select('id, quantidade_atual, pos_produtos(stock_minimo)').eq('tenant_id', user.tenant_id)),
                safeQuery(() => supabase.from('pos_faturas').select('id, numero_fatura, total, created_at, status, cliente_nome').eq('tenant_id', user.tenant_id).order('created_at', { ascending: false }).limit(5))
            ]);

            const sumTotal = (data: any[] | null) => (data || []).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

            setMetrics({
                today: sumTotal(todayRes.data),
                month: sumTotal(monthRes.data),
                count: monthRes.data?.length || 0,
                lowStock: (stockRes.data || []).filter((s: any) => s.quantidade_atual <= (s.pos_produtos?.stock_minimo || 0)).length
            });
            setRecentSales(lastRes.data || []);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    return (
        <div className="p-8 pb-32 w-full animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <ShoppingCart className="text-yellow-500" size={32} />
                        Vendas & POS
                    </h1>
                    <p className="text-zinc-400 mt-1 font-medium">
                        Gestão Integrada de Faturação e Estoque
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={fetchDashboardStats}
                        className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                    >
                        <RefreshCw size={20} className={statsLoading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => window.open('#/pos', '_blank')}
                        className="bg-yellow-500 text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                    >
                        <QrCode size={20} />
                        Terminal POS (Nova Guia)
                    </button>
                </div>
            </div>

            {/* Separadores */}
            <div className="flex overflow-x-auto gap-2 mb-8 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-yellow-500 text-zinc-900 shadow-lg'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Área de Conteúdo */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 min-h-[500px]">
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Cartões de Métricas */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                                <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-zinc-800/20 group-hover:text-yellow-500/10 transition-colors" />
                                <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Vendas Hoje</h3>
                                <p className="text-3xl font-black text-white">{formatAOA(metrics.today)}</p>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                                <BarChart className="absolute -right-4 -bottom-4 w-24 h-24 text-zinc-800/20 group-hover:text-emerald-500/10 transition-colors" />
                                <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Volume Mensal</h3>
                                <p className="text-3xl font-black text-white">{formatAOA(metrics.month)}</p>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                                <ShoppingCart className="absolute -right-4 -bottom-4 w-24 h-24 text-zinc-800/20 group-hover:text-blue-500/10 transition-colors" />
                                <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Transações (Mês)</h3>
                                <p className="text-3xl font-black text-white">{metrics.count}</p>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                                <AlertTriangle className="absolute -right-4 -bottom-4 w-24 h-24 text-zinc-800/20 group-hover:text-red-500/10 transition-colors" />
                                <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Alertas de Stock</h3>
                                <p className={`text-3xl font-black ${metrics.lowStock > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{metrics.lowStock}</p>
                            </div>
                        </div>

                        {/* Atividade e Stock Baixo */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-zinc-950/50 border border-zinc-800 rounded-3xl overflow-hidden">
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <Clock className="text-yellow-500" size={18} /> Últimas Vendas
                                    </h3>
                                    <button onClick={() => setActiveTab('vendas')} className="text-xs font-black text-yellow-500 hover:underline uppercase tracking-widest">
                                        Ver Tudo
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500">
                                            <tr>
                                                <th className="p-4">NCF / Documento</th>
                                                <th className="p-4">Cliente</th>
                                                <th className="p-4">Data</th>
                                                <th className="p-4 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {recentSales.map(sale => (
                                                <tr key={sale.id} className="hover:bg-zinc-800/30 transition-colors">
                                                    <td className="p-4 font-bold text-white font-mono">{sale.numero_fatura}</td>
                                                    <td className="p-4 text-zinc-400">{sale.cliente_nome || 'Consumidor Final'}</td>
                                                    <td className="p-4 text-xs text-zinc-500">{new Date(sale.created_at).toLocaleDateString('pt-PT')}</td>
                                                    <td className="p-4 text-right font-black text-white">{formatAOA(sale.total)}</td>
                                                </tr>
                                            ))}
                                            {recentSales.length === 0 && !statsLoading && (
                                                <tr><td colSpan={4} className="p-10 text-center text-zinc-600">Sem atividade recente.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-3xl p-6">
                                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                    <Package className="text-yellow-500" size={18} /> Resumo de Operações
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Estado do Terminal</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-white font-bold text-sm">Pronto para Vendas</span>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Sincronização</p>
                                        <div className="flex items-center gap-2">
                                            <RefreshCw size={12} className="text-blue-500" />
                                            <span className="text-white font-bold text-sm">Base de Dados Online</span>
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            onClick={() => window.open('#/pos', '_blank')}
                                            className="w-full bg-yellow-500 text-zinc-900 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-yellow-400 transition-colors"
                                        >
                                            Abrir Caixa no POS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'produtos' && <POSProdutos />}
                {activeTab === 'categorias' && <POSCategorias />}
                {activeTab === 'clientes' && <POSClientes />}
                {activeTab === 'estoque' && <POSStock />}
                {activeTab === 'caixa' && <POSCaixa />}
                {activeTab === 'vendas' && <POSVendas />}

                {activeTab === 'pos' && (
                    <div className="text-center py-20 animate-in fade-in">
                        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <QrCode size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-6">Ir para Terminal PDV</h2>
                        <button
                            onClick={() => window.open('#/pos', '_blank')}
                            className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 mx-auto"
                        >
                            <ShoppingCart size={24} />
                            Iniciar Ponto de Venda
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
