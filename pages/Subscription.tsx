import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import {
    CreditCard,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Upload,
    FileText,
    Zap,
    Trophy,
    ShieldCheck,
    RefreshCcw,
    Layers,
    X,
    XCircle
} from 'lucide-react';
import { formatAOA } from '../constants';
import Button from '../components/ui/Button';
import { useSaaS } from '../src/contexts/SaaSContext';

const SubscriptionPage: React.FC = () => {
    const { subscription: saasSub, loading: saasLoading, refreshSubscription } = useSaaS();
    const [uploading, setUploading] = useState(false);
    const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [ibanCopied, setIbanCopied] = useState(false);
    const [upgradeModalPlan, setUpgradeModalPlan] = useState<any | null>(null);
    const [requestingUpgrade, setRequestingUpgrade] = useState(false);
    const [upgradeNote, setUpgradeNote] = useState('');
    const [bancoInfo, setBancoInfo] = useState<any>(null);

    const fetchExtraData = async () => {
        if (!saasSub?.tenant_id) return;
        setHistoryLoading(true);
        try {
            const [histRes, plansRes, configRes] = await Promise.all([
                supabase.from('saas_subscriptions')
                    .select('*, saas_plans(nome)')
                    .eq('tenant_id', saasSub.tenant_id)
                    .order('created_at', { ascending: false }),
                supabase.from('saas_plans').select('*').order('valor', { ascending: true }),
                supabase.from('saas_config').select('*').single()
            ]);
            setHistory(histRes.data || []);
            setAvailablePlans(plansRes.data || []);
            setBancoInfo(configRes.data || {
                banco: 'Banco BAI',
                iban: 'AO06 0000 0000 8921 3451 2',
                beneficiario: 'Amazing Corporation Software LDA'
            });
        } catch (err) {
            console.error('Error fetching extra saas data:', err);
        } finally {
            setHistoryLoading(false);
        }
    };


    React.useEffect(() => {
        if (saasSub?.tenant_id) {
            fetchExtraData();
        }
    }, [saasSub?.tenant_id]);

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !saasSub?.id || !saasSub?.tenant_id) {
            (window as any).notify?.('Não foi possível identificar a subscrição.', 'error');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${saasSub.tenant_id}/${saasSub.id}_proof_${Date.now()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('saas_assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('saas_assets')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('saas_subscriptions')
                .update({
                    comprovativo_url: publicUrl,
                    status: 'pendente',
                    data_pagamento: new Date().toISOString(),
                    rejection_reason: null // Clear reason on new upload
                })
                .eq('id', saasSub.id);

            if (updateError) throw updateError;

            await refreshSubscription();
            await fetchExtraData();
            (window as any).notify?.('Comprovativo enviado com sucesso! Aguarde validação.', 'success');
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const toggleAutoRenew = async () => {
        if (!saasSub?.id || updatingAutoRenew) return;
        setUpdatingAutoRenew(true);
        try {
            const newAutoRenew = !saasSub.auto_renew;
            const { error } = await supabase
                .from('saas_subscriptions')
                .update({ auto_renew: newAutoRenew })
                .eq('id', saasSub.id);

            if (error) throw error;
            await refreshSubscription();
            (window as any).notify?.(`Renovação automática ${newAutoRenew ? 'ativada' : 'desativada'}`, 'success');
        } catch (err: any) {
            (window as any).notify?.('Erro ao atualizar renovação automática', 'error');
        } finally {
            setUpdatingAutoRenew(false);
        }
    };

    const handleCopyIban = (iban: string) => {
        navigator.clipboard.writeText(iban.replace(/\s/g, ''));
        setIbanCopied(true);
        setTimeout(() => setIbanCopied(false), 2000);
    };

    const handleRequestUpgrade = async () => {
        if (!upgradeModalPlan || !saasSub?.tenant_id) return;
        setRequestingUpgrade(true);
        try {
            // Create a new pending subscription for the requested plan
            const startDate = new Date().toISOString().split('T')[0];
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + (upgradeModalPlan.duracao_meses || 12));
            const { error } = await supabase.from('saas_subscriptions').insert([{
                tenant_id: saasSub.tenant_id,
                plan_id: upgradeModalPlan.id,
                data_inicio: startDate,
                data_expiracao: expiryDate.toISOString().split('T')[0],
                valor_pago: upgradeModalPlan.valor,
                status: 'pendente',
                auto_renew: false,
            }]);
            if (error) throw error;
            setUpgradeModalPlan(null);
            setUpgradeNote('');
            await refreshSubscription();
            (window as any).notify?.(`Pedido de upgrade para ${upgradeModalPlan.nome} enviado! Aguarde confirmação.`, 'success');
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        } finally {
            setRequestingUpgrade(false);
        }
    };

    if (saasLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando subscrição...</p>
            </div>
        );
    }

    const plans_icons: Record<string, any> = {
        'Starter': Zap,
        'Business': Trophy,
        'Enterprise': ShieldCheck
    };

    const planName = saasSub?.saas_plans?.nome || 'Utilizador Base';
    const PlanIcon = plans_icons[planName] || Zap;

    const parsePlanData = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return data.split(',').map(s => s.trim()); }
        }
        if (typeof data === 'object') {
            return Object.entries(data).filter(([_, v]) => v === true).map(([k]) => k);
        }
        return [];
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-zinc-900 tracking-tighter uppercase leading-none pointer-events-none select-none">
                        Licenciamento <span className="text-yellow-500">&</span> SaaS
                    </h1>
                    <p className="text-zinc-500 font-bold mt-4 max-w-lg">
                        Controle o acesso, módulos e faturização da sua plataforma ERP de forma centralizada e transparente.
                    </p>
                </div>

                {saasSub && (
                    <div className="flex items-center gap-3 p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${saasSub.status === 'ativo' ? 'bg-green-500' :
                            saasSub.status === 'expirado' ? 'bg-red-500' : 'bg-orange-500'
                            }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 pr-3">
                            Status: {saasSub.status === 'ativo' ? 'Protegido' : 'Acção Necessária'}
                        </span>
                    </div>
                )}
            </header>

            {/* Rejection Alert */}
            {saasSub?.status === 'expirado' && saasSub.rejection_reason && (
                <div className="bg-red-50 border border-red-200 p-8 rounded-[2.5rem] flex items-center gap-6 animate-pulse">
                    <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                        <XCircle size={28} />
                    </div>
                    <div>
                        <h4 className="font-black text-red-900 uppercase text-xs tracking-widest mb-1">Pagamento Rejeitado</h4>
                        <p className="text-sm text-red-700 font-bold">{saasSub.rejection_reason}</p>
                        <p className="text-[10px] text-red-600 mt-2 font-medium uppercase tracking-widest">Por favor, verifique os dados e envie um novo comprovativo.</p>
                    </div>
                </div>
            )}

            {saasSub ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Card: Plan Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-white p-12 rounded-[3.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50/50 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-yellow-100/50 transition-colors duration-700" />

                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-yellow-500 shadow-2xl shadow-zinc-900/20 transform group-hover:scale-110 transition-transform duration-500">
                                            <PlanIcon size={40} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">Assinatura Actual</h3>
                                            <p className="text-4xl font-black text-zinc-900 uppercase tracking-tight">{planName || 'ERP PRO'}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-3xl font-black text-zinc-900">{formatAOA(saasSub.valor_pago || 0)}</p>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {saasSub.data_inicio ? `Iniciada em ${new Date(saasSub.data_inicio).toLocaleDateString()}` : 'Licença Activa'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 border border-zinc-100">
                                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-yellow-600 shadow-sm">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Vencimento em</p>
                                                <p className="text-sm font-black text-zinc-800 uppercase">
                                                    {saasSub.data_expiracao
                                                        ? new Date(saasSub.data_expiracao).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 border border-zinc-100">
                                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                                                <Layers size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Utilizadores</p>
                                                <p className="text-sm font-black text-zinc-800 uppercase">Até {saasSub.maxUsers} Colaboradores</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 flex items-center justify-between group/toggle">
                                            <div>
                                                <p className="text-sm font-black text-zinc-800">Renovação Automática</p>
                                                <p className="text-[10px] text-zinc-500 font-medium font-bold uppercase tracking-widest">Garantir continuidade</p>
                                            </div>
                                            <button
                                                onClick={toggleAutoRenew}
                                                disabled={updatingAutoRenew || !saasSub.id}
                                                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${saasSub.auto_renew ? 'bg-yellow-500' : 'bg-zinc-200'} disabled:opacity-50 shadow-inner`}
                                            >
                                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 transform ${saasSub.auto_renew ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 px-2">
                                            <RefreshCcw size={12} className="text-zinc-400" />
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest italic">Facturado automaticamente 2 dias antes.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Modules section */}
                        {saasSub.modules && saasSub.modules.length > 0 && (
                            <section className="bg-zinc-50 p-10 rounded-[3.5rem] border border-zinc-200">
                                <div className="flex items-center justify-between mb-8 px-4">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Módulos Activos no Plano</h3>
                                    <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                        Licença Corporativa
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {saasSub.modules.map((mod) => (
                                        <div key={mod} className="flex items-center gap-2 px-5 py-3 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:border-yellow-500/50 transition-colors group">
                                            <CheckCircle2 size={14} className="text-yellow-500 transition-transform group-hover:scale-125" />
                                            <span className="text-[10px] font-black uppercase text-zinc-800 tracking-tighter">{mod}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Available Plans / Upgrade section */}
                        <section className="space-y-6">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] px-4">Expandir Operação / Upgrade</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {availablePlans.filter(p => p.id !== saasSub.plan_id).map(plan => (
                                    <div key={plan.id} className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-yellow-500/30 transition-all group cursor-pointer" onClick={() => setUpgradeModalPlan(plan)}>
                                        <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 mb-4 transition-colors">
                                            {plans_icons[plan.nome] ? React.createElement(plans_icons[plan.nome], { size: 20 }) : <Zap size={20} />}
                                        </div>
                                        <p className="text-sm font-black text-zinc-900 uppercase mb-1">{plan.nome}</p>
                                        <p className="text-xl font-black text-zinc-800 mb-2">{formatAOA(plan.valor)}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase mb-4 leading-relaxed">
                                            {parsePlanData(plan.features)[0] || 'Vantagens exclusivas'}
                                        </p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUpgradeModalPlan(plan); }}
                                            className="w-full py-2.5 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Zap size={12} /> Solicitar Upgrade
                                        </button>
                                    </div>
                                ))}
                                {availablePlans.filter(p => p.id !== saasSub.plan_id).length === 0 && (
                                    <div className="col-span-3 py-10 text-center text-zinc-400 font-bold text-sm">
                                        Já está no plano mais completo disponível. 🏆
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Billing History */}
                        <div className="bg-white rounded-[3rem] border border-zinc-100 overflow-hidden shadow-sm">
                            <div className="px-10 py-6 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Histórico de Facturação</h3>
                                <FileText size={16} className="text-zinc-300" />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-zinc-50/30 border-b border-zinc-50">
                                            <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400">Data</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400">Plano</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400">Valor</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {history.map(item => (
                                            <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                                                <td className="px-8 py-4 text-[11px] font-bold text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td className="px-8 py-4 text-[11px] font-black text-zinc-800 uppercase tracking-tighter">{item.saas_plans?.nome}</td>
                                                <td className="px-8 py-4 text-[11px] font-bold text-zinc-700">{formatAOA(item.valor_pago || 0)}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${item.status === 'ativo' ? 'bg-green-100 text-green-700' :
                                                        item.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {item.comprovativo_url ? (
                                                        <a href={item.comprovativo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700">
                                                            <FileText size={12} /> Ver
                                                        </a>
                                                    ) : <span className="text-[9px] text-zinc-300 font-bold">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {history.length === 0 && (
                                            <tr><td colSpan={5} className="px-8 py-8 text-center text-xs text-zinc-400 font-bold">Nenhum histórico de facturação disponível.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {history.length > 0 && (
                                <div className="px-10 py-4 border-t border-zinc-50 flex items-center justify-between text-zinc-400">
                                    <p className="text-[9px] font-black uppercase tracking-widest">{history.length} registo(s) encontrado(s)</p>
                                    <p className="text-[9px] font-bold">Total pago: <span className="font-black text-zinc-700">{formatAOA(history.reduce((a, i) => a + (Number(i.valor_pago) || 0), 0))}</span></p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Billing & Actions */}
                    <div className="space-y-8">
                        <div className="bg-zinc-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[500px] sticky top-8">
                            <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12">
                                <CreditCard size={300} strokeWidth={1} />
                            </div>

                            <div className="relative z-10 flex-1">
                                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em] mb-8">Pagamento e Factura</h3>

                                {saasSub.status === 'pendente' ? (
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-center backdrop-blur-xl animate-pulse">
                                        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <RefreshCcw className="text-yellow-500 animate-spin" size={32} />
                                        </div>
                                        <p className="text-xl font-black uppercase tracking-tight mb-2 leading-none">A Validação em Curso</p>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed font-bold uppercase tracking-widest mt-4">Verificamos o comprovativo em média em 2 horas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] px-2">Dados de Transferência</p>
                                            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6">
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Beneficiário</p>
                                                    <p className="text-sm font-bold tracking-tight">{bancoInfo?.beneficiario || 'Carregando...'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-2">IBAN {bancoInfo?.banco || ''}</p>
                                                    <button
                                                        onClick={() => handleCopyIban(bancoInfo?.iban || '')}
                                                        disabled={!bancoInfo}
                                                        className={`text-sm font-mono font-bold select-all transition-all flex items-center gap-2 px-3 py-2 rounded-xl border ${ibanCopied
                                                            ? 'text-green-400 border-green-500/30 bg-green-500/10'
                                                            : 'text-yellow-500 border-white/10 hover:border-yellow-500/30 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {ibanCopied ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                                                        {ibanCopied ? 'Copiado!' : (bancoInfo?.iban || 'Carregando...')}
                                                    </button>
                                                    <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">Clique para copiar</p>
                                                </div>
                                                <div className="pt-2 border-t border-white/5">
                                                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Valor a Pagar</p>
                                                    <p className="text-2xl font-black text-yellow-500">{formatAOA(saasSub.valor_pago || 0)}</p>
                                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Referente ao plano {saasSub.saas_plans?.nome}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] px-2">Submeter Prova de Pagamento</p>
                                            <label className="block group cursor-pointer">
                                                <div className={`w-full py-12 rounded-[2.5rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center gap-4 ${uploading ? 'border-yellow-500/50 bg-yellow-500/5 opacity-50' : 'border-white/10 hover:border-yellow-500/50 hover:bg-white/5'
                                                    }`}>
                                                    <Upload size={40} className={uploading ? 'animate-bounce text-yellow-500' : 'text-zinc-500 group-hover:text-yellow-500'} />
                                                    <div className="text-center">
                                                        <p className="text-[11px] font-black uppercase tracking-widest text-white">
                                                            {uploading ? 'Processando Arquivo...' : 'Carregar Comprovativo'}
                                                        </p>
                                                        <p className="text-[9px] text-zinc-500 mt-1 font-bold uppercase">PDF, PNG ou JPEG</p>
                                                    </div>
                                                </div>
                                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadProof} disabled={uploading || saasSub.status === 'pendente'} />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative z-10 pt-8 mt-8 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={16} className="text-yellow-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Transação Segura</p>
                                </div>
                                <Trophy size={20} className="text-zinc-800" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-24 rounded-[4rem] text-center border border-zinc-100 shadow-xl shadow-zinc-200/50">
                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <FileText size={48} className="text-zinc-300" />
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 uppercase mb-4 tracking-tighter">Sem Assinatura Activa</h2>
                    <p className="text-zinc-500 font-bold max-w-sm mx-auto mb-10 leading-relaxed">Não encontramos nenhuma licença operacional para a sua empresa. Contacte o suporte técnico Amazing ERP.</p>
                    <Button variant="primary" className="px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                        Falar com Consultor
                    </Button>
                </div>
            )}

            {/* ===== UPGRADE MODAL ===== */}
            {upgradeModalPlan && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">Pedido de Upgrade</p>
                                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">{upgradeModalPlan.nome}</h2>
                            </div>
                            <button onClick={() => setUpgradeModalPlan(null)} className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Valor do Plano</p>
                                    <p className="text-3xl font-black text-zinc-900">{formatAOA(upgradeModalPlan.valor)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Validade</p>
                                    <p className="text-lg font-black text-zinc-700">{upgradeModalPlan.duracao_meses} meses</p>
                                </div>
                            </div>
                            {parsePlanData(upgradeModalPlan.features).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Incluído neste plano</p>
                                    {parsePlanData(upgradeModalPlan.features).map((f: string) => (
                                        <div key={f} className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
                                            <CheckCircle2 size={14} className="text-yellow-500" /> {f}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl text-[10px] text-yellow-800 font-bold leading-relaxed">
                                ⚡ Ao confirmar, será criada uma subscrição pendente. Efectue a transferência e carregue o comprovativo para activação.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setUpgradeModalPlan(null)}
                                    className="flex-1 py-4 bg-zinc-100 text-zinc-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRequestUpgrade}
                                    disabled={requestingUpgrade}
                                    className="flex-1 py-4 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-yellow-500 hover:text-zinc-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {requestingUpgrade ? <RefreshCcw size={14} className="animate-spin" /> : <Zap size={14} />}
                                    Confirmar Upgrade
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPage;
