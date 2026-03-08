import React, { useState } from 'react';
import {
    ShoppingCart, Package, Tags, CreditCard,
    BarChart, QrCode, TrendingUp, Settings2
} from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { formatAOA } from '../constants';

import POSProdutos from '../components/Sales/POSProdutos';
import POSCategorias from '../components/Sales/POSCategorias';
import POSStock from '../components/Sales/POSStock';
import POSCaixa from '../components/Sales/POSCaixa';
import POSVendas from '../components/Sales/POSVendas';

export default function SalesHub() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'Panorama Geral', icon: <TrendingUp size={20} /> },
        { id: 'vendas', label: 'Histórico de Vendas', icon: <ShoppingCart size={20} /> },
        { id: 'produtos', label: 'Produtos', icon: <Package size={20} /> },
        { id: 'categorias', label: 'Categorias', icon: <Tags size={20} /> },
        { id: 'estoque', label: 'Controle de Estoque', icon: <BarChart size={20} /> },
        { id: 'caixa', label: 'Gestão de Caixa', icon: <CreditCard size={20} /> },
        { id: 'pos', label: 'Abrir POS', icon: <QrCode size={20} /> },
    ];

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

                <button
                    onClick={() => window.open('#/pos', '_blank')}
                    className="bg-yellow-500 text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                >
                    <QrCode size={20} />
                    Terminal POS (Nova Guia)
                </button>
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
                    <div className="text-center py-20 animate-in fade-in">
                        <div className="w-24 h-24 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <TrendingUp size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Módulo em Desenvolvimento</h2>
                        <p className="text-zinc-400 max-w-md mx-auto">
                            Os relatórios e indicadores da área de Vendas & POS ficarão disponíveis após a sincronização da base de dados.
                        </p>
                    </div>
                )}

                {activeTab === 'produtos' && <POSProdutos />}
                {activeTab === 'categorias' && <POSCategorias />}
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
