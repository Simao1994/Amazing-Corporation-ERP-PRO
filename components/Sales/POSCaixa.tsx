import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, Unlock, ArrowRightLeft, Search, FileText } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { formatAOA } from '../../constants';

export default function POSCaixa() {
    const { user } = useAuth();
    const [caixaAtivo, setCaixaAtivo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [movimentos, setMovimentos] = useState<any[]>([]);

    const [showModalAbrir, setShowModalAbrir] = useState(false);
    const [showModalFechar, setShowModalFechar] = useState(false);

    const [valorAbertura, setValorAbertura] = useState(0);
    const [valorFechamento, setValorFechamento] = useState(0);
    const [observacoes, setObservacoes] = useState('');

    useEffect(() => {
        fetchCaixaAtivo();
    }, [user]);

    const fetchCaixaAtivo = async () => {
        try {
            if (!user?.tenant_id) return;

            const { data, error } = await supabase
                .from('pos_caixa')
                .select('*')
                .eq('empresa_id', user.tenant_id)
                .eq('status', 'aberto')
                .order('data_abertura', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 é não encontrado

            setCaixaAtivo(data || null);

            if (data) {
                fetchMovimentos(data.id);
            } else {
                setMovimentos([]);
            }
        } catch (error) {
            console.error('Error fetching caixa:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMovimentos = async (caixaId: string) => {
        try {
            const { data, error } = await supabase
                .from('pos_movimentos_caixa')
                .select('*')
                .eq('caixa_id', caixaId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMovimentos(data || []);
        } catch (error) {
            console.error('Error fetching movimentos:', error);
        }
    };

    const handleAbrirCaixa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.tenant_id) return;

        try {
            const { data, error } = await supabase
                .from('pos_caixa')
                .insert([{
                    empresa_id: user.tenant_id,
                    operador_id: user.id || null, // garantir fallback genérico
                    saldo_inicial: valorAbertura,
                    saldo_atual: valorAbertura,
                    status: 'aberto'
                }])
                .select()
                .single();

            if (error) throw error;

            (window as any).notify?.('Caixa aberto com sucesso', 'success');
            setShowModalAbrir(false);
            setValorAbertura(0);
            setCaixaAtivo(data);
            fetchMovimentos(data.id);
        } catch (error: any) {
            console.error('Error open caixa:', error);
            (window as any).notify?.('Erro ao abrir caixa', 'error');
        }
    };

    const handleFecharCaixa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!caixaAtivo) return;

        const diferenca = valorFechamento - caixaAtivo.saldo_atual;

        try {
            const fechoPayload = {
                caixa_id: caixaAtivo.id,
                valor_informado: valorFechamento,
                valor_sistema: caixaAtivo.saldo_atual,
                diferenca: diferenca,
                observacoes: observacoes
            };

            await supabase.from('pos_fechamento_caixa').insert([fechoPayload]);

            await supabase
                .from('pos_caixa')
                .update({ status: 'fechado', data_fechamento: new Date().toISOString() })
                .eq('id', caixaAtivo.id);

            (window as any).notify?.('Caixa fechado com sucesso', 'success');
            setShowModalFechar(false);
            setValorFechamento(0);
            setObservacoes('');
            fetchCaixaAtivo();
        } catch (error: any) {
            console.error('Error closing caixa:', error);
            (window as any).notify?.('Erro ao fechar caixa', 'error');
        }
    };

    if (loading) return <div className="text-center py-12 text-zinc-500">A carregar informações de caixa...</div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CreditCard className="text-yellow-500" /> Gestão de Caixa
                </h2>

                {!caixaAtivo ? (
                    <button
                        onClick={() => setShowModalAbrir(true)}
                        className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <Unlock size={20} />
                        Abrir Caixa
                    </button>
                ) : (
                    <button
                        onClick={() => setShowModalFechar(true)}
                        className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20"
                    >
                        <Lock size={20} />
                        Fechar Caixa
                    </button>
                )}
            </div>

            {!caixaAtivo ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center animate-in fade-in">
                    <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={48} className="text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Caixa Fechado</h3>
                    <p className="text-zinc-400 max-w-sm mx-auto">
                        Não há nenhum caixa aberto no momento. Abra um novo caixa para começar a registar vendas e movimentos.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative overflow-hidden">
                        {/* Brilho de fundo para o caixa ativo e aberto */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative z-10">
                            <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Saldo Inicial</h3>
                            <p className="text-3xl font-black text-white font-mono">{formatAOA(caixaAtivo.saldo_inicial)}</p>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative z-10">
                            <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Entradas (Vendas)</h3>
                            <p className="text-3xl font-black text-emerald-500 font-mono">
                                {formatAOA(movimentos.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0))}
                            </p>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative z-10 shadow-lg border-b-2 border-b-yellow-500">
                            <h3 className="text-yellow-500 text-sm font-bold uppercase tracking-widest mb-2">Saldo Atual</h3>
                            <p className="text-4xl font-black text-white tracking-tighter font-mono">{formatAOA(caixaAtivo.saldo_atual)}</p>
                        </div>
                    </div>

                    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <ArrowRightLeft size={18} className="text-zinc-500" /> Movimentos do Turno
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-900 border-b border-zinc-800 text-sm">
                                        <th className="p-4 text-zinc-400 font-medium">Data/Hora</th>
                                        <th className="p-4 text-zinc-400 font-medium">Descrição</th>
                                        <th className="p-4 text-zinc-400 font-medium">Método</th>
                                        <th className="p-4 text-zinc-400 font-medium text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50 text-sm">
                                    {movimentos.map(mov => (
                                        <tr key={mov.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="p-4 text-zinc-400 font-mono">
                                                {new Date(mov.created_at).toLocaleString('pt-PT')}
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold text-zinc-200">{mov.descricao}</span>
                                                <span className={`ml-3 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${mov.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {mov.tipo}
                                                </span>
                                            </td>
                                            <td className="p-4 text-zinc-400 capitalize">{mov.metodo_pagamento || 'N/A'}</td>
                                            <td className={`p-4 text-right font-black font-mono ${mov.tipo === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {mov.tipo === 'entrada' ? '+' : '-'}{formatAOA(mov.valor)}
                                            </td>
                                        </tr>
                                    ))}
                                    {movimentos.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-zinc-500">
                                                Nenhum movimento registado neste turno.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}


            {/* Modal de Abertura */}
            {showModalAbrir && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Unlock className="text-emerald-500" /> Abertura de Caixa
                            </h3>
                        </div>
                        <form onSubmit={handleAbrirCaixa} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Troco / Fundo de Maneio (AOA) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={valorAbertura}
                                    onChange={e => setValorAbertura(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-xl"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModalAbrir(false)} className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors">Confirmar Abertura</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Fechamento */}
            {showModalFechar && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Lock className="text-red-500" /> Fechamento de Caixa
                            </h3>
                        </div>

                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6 text-center">
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Saldo Registado no Sistema</p>
                            <p className="text-2xl font-black text-white font-mono">{formatAOA(caixaAtivo?.saldo_atual || 0)}</p>
                        </div>

                        <form onSubmit={handleFecharCaixa} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Valor Dinheiro na Gaveta (AOA) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={valorFechamento}
                                    onChange={e => setValorFechamento(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-mono text-xl"
                                />
                            </div>

                            {valorFechamento - (caixaAtivo?.saldo_atual || 0) !== 0 && (
                                <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${valorFechamento > (caixaAtivo?.saldo_atual || 0) ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    }`}>
                                    <FileText size={16} />
                                    Diferença: {formatAOA(valorFechamento - (caixaAtivo?.saldo_atual || 0))}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Observações / Justificação</label>
                                <textarea
                                    value={observacoes}
                                    onChange={e => setObservacoes(e.target.value)}
                                    required={(valorFechamento - (caixaAtivo?.saldo_atual || 0)) !== 0}
                                    placeholder={(valorFechamento - (caixaAtivo?.saldo_atual || 0)) !== 0 ? "Obrigatório justificar quebra ou sobra" : "Opcional"}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 min-h-[80px]"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModalFechar(false)} className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors">Confirmar Fechamento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
