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
    Layers
} from 'lucide-react';
import { formatAOA } from '../constants';
import Button from '../components/ui/Button';
import { useSaaS } from '../src/contexts/SaaSContext';

const SubscriptionPage: React.FC = () => {
    const { subscription: saasSub, loading: saasLoading, refreshSubscription } = useSaaS();
    const [uploading, setUploading] = useState(false);
    const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Need saasSub.id and saasSub.tenant_id from the expanded SubscriptionStatus
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
                    data_pagamento: new Date().toISOString()
                })
                .eq('id', saasSub.id);

            if (updateError) throw updateError;

            await refreshSubscription();
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

    const planName = saasSub?.saas_plans?.nome || '';
    const PlanIcon = plans_icons[planName] || Zap;

    // Determine modules list from the plan
    const planModules: string[] = (() => {
        const mods = saasSub?.saas_plans?.modules;
        if (!mods) return [];
        if (Array.isArray(mods)) return mods;
        // If it's an object { RH: true, FIN: false }, convert to array
        return Object.entries(mods as Record<string, boolean>).map(([key, active]) => ({ key, active })) as any;
    })();

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-zinc-900 tracking-tighter uppercase leading-none">
                        Licenciamento <span className="text-yellow-500">&</span> SaaS
                    </h1>
                    <p className="text-zinc-500 font-bold mt-4 max-w-lg">
                        Controle o acesso, módulos e faturamento da sua plataforma ERP de forma centralizada.
                    </p>
                </div>

                {saasSub && (
                    <div className="flex items-center gap-3 p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${saasSub.status === 'ativo' ? 'bg-green-500' :
                                saasSub.status === 'expirado' ? 'bg-red-500' : 'bg-orange-500'
                            }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 pr-3">
                            Sistema {saasSub.status === 'ativo' ? 'Protegido' : 'Limitado'}
                        </span>
                    </div>
                )}
            </header>

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
                                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">Plano Atual</h3>
                                            <p className="text-4xl font-black text-zinc-900 uppercase tracking-tight">{planName || 'ERP PRO'}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-3xl font-black text-zinc-900">{formatAOA(saasSub.valor_pago)}</p>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {saasSub.created_at ? `Pago em ${new Date(saasSub.created_at).toLocaleDateString()}` : 'Licença Activa'}
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
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Módulos Ativos</p>
                                                <p className="text-sm font-black text-zinc-800 uppercase">{saasSub.modules.length} Módulos</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 flex items-center justify-between group/toggle">
                                            <div>
                                                <p className="text-sm font-black text-zinc-800">Renovação Automática</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">Evite suspensões por atraso</p>
                                            </div>
                                            <button
                                                onClick={toggleAutoRenew}
                                                disabled={updatingAutoRenew || !saasSub.id}
                                                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${saasSub.auto_renew ? 'bg-zinc-900' : 'bg-zinc-200'} disabled:opacity-50`}
                                            >
                                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 transform ${saasSub.auto_renew ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 px-2">
                                            <RefreshCcw size={12} className="text-zinc-400" />
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest italic">A renovação ocorre 24h antes do vencimento.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Modules section */}
                        {saasSub.modules.length > 0 && (
                            <section className="bg-zinc-50 p-10 rounded-[3.5rem] border border-zinc-200">
                                <div className="flex items-center justify-between mb-8 px-4">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Módulos Inclusos</h3>
                                    <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                        Licença Corporativa
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {saasSub.modules.map((mod) => (
                                        <div key={mod} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                                            <CheckCircle2 size={14} className="text-green-500" />
                                            <span className="text-[10px] font-black uppercase text-zinc-800 tracking-tighter">{mod}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar: Billing & Actions */}
                    <div className="space-y-8">
                        <div className="bg-zinc-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
                            <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12">
                                <CreditCard size={300} strokeWidth={1} />
                            </div>

                            <div className="relative z-10 flex-1">
                                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em] mb-8">Pagamento e Fatura</h3>

                                {saasSub.status === 'pendente' ? (
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
                                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <RefreshCcw className="text-yellow-500 animate-spin" size={32} />
                                        </div>
                                        <p className="text-lg font-black uppercase tracking-tight mb-2">Aguardando Validação</p>
                                        <p className="text-xs text-zinc-400 leading-relaxed font-medium">Nosso time financeiro está verificando o comprovativo enviado. Isso geralmente leva menos de 4h.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Dados para Transferência</p>
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Empresa Beneficiária</p>
                                                    <p className="text-sm font-bold">Amazing Corporation Software LDA</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Banco e IBAN (BAI)</p>
                                                    <p className="text-sm font-mono text-yellow-500 select-all">AO06 0000 0000 8921 3451 2</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Upload de Comprovativo</p>
                                            <label className="block group cursor-pointer">
                                                <div className={`w-full py-10 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center gap-4 ${uploading ? 'border-yellow-500/50 bg-yellow-500/5 opacity-50' : 'border-white/10 hover:border-yellow-500/50 hover:bg-white/5'
                                                    }`}>
                                                    <Upload size={32} className={uploading ? 'animate-bounce text-yellow-500' : 'text-zinc-500 group-hover:text-yellow-500'} />
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white">
                                                            {uploading ? 'Processando Arquivo...' : 'Clique para Enviar'}
                                                        </p>
                                                        <p className="text-[9px] text-zinc-500 mt-1 font-bold">PDF, PNG ou JPEG de até 5MB</p>
                                                    </div>
                                                </div>
                                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadProof} disabled={uploading || saasSub.status === 'pendente'} />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative z-10 pt-8 mt-8 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={16} className="text-yellow-500" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Transação Encriptada e Segura</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-24 rounded-[3.5rem] text-center border border-zinc-100 shadow-xl shadow-zinc-200/50">
                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <FileText size={48} className="text-zinc-300" />
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 uppercase mb-4">Sem Assinatura Ativa</h2>
                    <p className="text-zinc-500 font-bold max-w-sm mx-auto mb-10 leading-relaxed">Não encontramos nenhuma licença vinculada à sua conta. Se você é o administrador, por favor contacte o suporte técnico.</p>
                    <Button variant="primary" className="px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">
                        Contatar Comercial
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPage;
