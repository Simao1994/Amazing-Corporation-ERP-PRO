import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { useTenant } from '../src/components/TenantProvider';
import { CreditCard, Calendar, AlertTriangle, CheckCircle2, Upload, FileText, Building2 } from 'lucide-react';
import { formatAOA } from '../constants';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const SubscriptionPage: React.FC = () => {
    const { tenant } = useTenant();
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscription = async () => {
        if (!tenant) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('saas_subscriptions')
                .select('*, saas_plans(*)')
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw fetchError;
            }
            setSubscription(data);
        } catch (err: any) {
            console.error('Error fetching subscription:', err);
            setError(err.message || 'Erro ao carregar subscrição');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [tenant]);

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenant || !subscription) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${tenant.id}/${subscription.id}_proof.${fileExt}`;
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
                    status: 'pendente'
                })
                .eq('id', subscription.id);

            if (updateError) throw updateError;

            fetchSubscription();
            (window as any).notify?.('Comprovativo enviado com sucesso! Aguarde validação.', 'success');
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenant) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${tenant.id}/logo.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('saas_assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('saas_assets')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('saas_tenants')
                .update({ logo_url: publicUrl })
                .eq('id', tenant.id);

            if (updateError) throw updateError;

            (window as any).notify?.('Logótipo actualizado! Recarregue para ver as alterações.', 'success');
            window.location.reload();
        } catch (err: any) {
            (window as any).notify?.(err.message || 'Erro ao actualizar logótipo', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] border border-red-100 shadow-xl text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-black text-zinc-900 uppercase mb-2">Erro de Carregamento</h2>
                <p className="text-zinc-500 text-sm mb-8">{error}</p>
                <Button onClick={fetchSubscription} variant="primary" className="w-full">
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">
                    Minha <span className="text-yellow-500">Subscrição</span>
                </h1>
                <p className="text-zinc-500 font-bold mt-2">Gira o plano e pagamentos da sua empresa</p>
            </header>

            {subscription ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-sky-100 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Plano Actual</h3>
                                    <p className="text-2xl font-black text-zinc-900 uppercase">{subscription.saas_plans?.nome}</p>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${subscription.status === 'ativo' ? 'bg-green-100 text-green-700' :
                                    subscription.status === 'pendente' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {subscription.status}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-zinc-600">
                                    <Calendar size={18} className="text-yellow-500" />
                                    <span className="text-sm font-bold">Expira em: {new Date(subscription.data_expiracao).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-4 text-zinc-600">
                                    <CreditCard size={18} className="text-yellow-500" />
                                    <span className="text-sm font-bold">Valor: {formatAOA(subscription.valor_pago)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-zinc-100">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 italic">
                                {subscription.status === 'ativo' ? 'O seu plano está tudo em ordem.' : 'O seu acesso pode estar limitado até a validação.'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -right-8 -bottom-8 opacity-10"><Upload size={180} /></div>

                        <div className="relative z-10">
                            <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em] mb-6">Renovação / Pagamento</h3>

                            {subscription.status === 'expirado' || subscription.status === 'suspenso' ? (
                                <div className="space-y-6">
                                    <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-start gap-3">
                                        <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                        <p className="text-xs font-medium text-red-200 leading-relaxed">
                                            A sua licença expirou. Para continuar a utilizar todas as funcionalidades, efectue o pagamento e envie o comprovativo.
                                        </p>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">Dados Bancários</p>
                                        <p className="text-sm font-bold">Banco: BAI</p>
                                        <p className="text-sm font-bold">IBAN: AO06 0000 1234 5678 9012 3</p>
                                        <p className="text-sm font-bold">Titular: Amazing Corp LDA</p>
                                    </div>
                                </div>
                            ) : subscription.status === 'pendente' ? (
                                <div className="text-center py-6">
                                    <CheckCircle2 size={48} className="text-yellow-500 mx-auto mb-4" />
                                    <p className="text-sm font-bold">Comprovativo em análise</p>
                                    <p className="text-xs text-zinc-400 mt-2">Validamos os pagamentos em até 24h úteis.</p>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400">Tudo pronto! Se precisar de ajuda técnica, contacte o suporte.</p>
                            )}
                        </div>

                        {subscription.status !== 'pendente' && (
                            <div className="mt-8 relative z-10">
                                <label className="block w-full cursor-pointer group">
                                    <div className={`w-full py-4 rounded-2xl border-2 border-dashed border-zinc-700 group-hover:border-yellow-500 transition-all flex flex-col items-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
                                        <Upload size={24} className="text-zinc-500 group-hover:text-yellow-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">
                                            {uploading ? 'A Enviar...' : 'Enviar Comprovativo (PDF/JPG)'}
                                        </span>
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadProof} disabled={uploading} />
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-20 rounded-[3rem] text-center border border-sky-100 shadow-sm">
                    <FileText size={48} className="mx-auto mb-4 text-zinc-200" />
                    <p className="text-zinc-500 font-bold">Nenhuma informação de subscrição encontrada para esta empresa.</p>
                </div>
            )}

            {/* Branding Section */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-sky-100">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Identidade Visual (Branding)</h3>
                <div className="flex items-center gap-8">
                    <div className="w-24 h-24 rounded-3xl bg-zinc-100 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden">
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="text-zinc-300" size={32} />
                        )}
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-zinc-900">Logótipo da Empresa</p>
                        <p className="text-xs text-zinc-500">Este logótipo aparecerá no menu lateral e documentos.</p>
                        <label className="inline-block px-4 py-2 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer hover:bg-zinc-800 transition-all mt-2">
                            Alterar Logótipo
                            <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
