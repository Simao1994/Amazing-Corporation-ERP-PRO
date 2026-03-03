import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { Building2, Users, CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, Search } from 'lucide-react';
import { formatAOA } from '../constants';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const MasterAdmin: React.FC = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: tenantsData } = await supabase
                .from('saas_tenants')
                .select('*, saas_subscriptions(*)');

            const { data: subsData } = await supabase
                .from('saas_subscriptions')
                .select('*, saas_tenants(nome), saas_plans(nome)')
                .order('created_at', { ascending: false });

            setTenants(tenantsData || []);
            setSubscriptions(subsData || []);
        } catch (error) {
            console.error('Error fetching master admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApproveSubscription = async (id: string) => {
        if (!confirm('Aprovar este pagamento e ativar a subscrição?')) return;

        try {
            const { error } = await supabase
                .from('saas_subscriptions')
                .update({ status: 'ativo' })
                .eq('id', id);

            if (error) throw error;
            fetchData();
            (window as any).notify?.('Subscrição aprovada com sucesso!', 'success');
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nif?.includes(searchTerm)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">
                    Master <span className="text-yellow-500">Admin</span>
                </h1>
                <p className="text-zinc-500 font-bold mt-2">Painel de Controlo da Plataforma SaaS</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-sky-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2 text-zinc-400">
                        <Building2 size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Empresas Totais</span>
                    </div>
                    <p className="text-3xl font-black text-zinc-900">{tenants.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-sky-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2 text-zinc-400">
                        <CreditCard size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Pagamentos Pendentes</span>
                    </div>
                    <p className="text-3xl font-black text-orange-500">
                        {subscriptions.filter(s => s.status === 'pendente').length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-sky-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2 text-zinc-400">
                        <TrendingUp size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Receita Estimada</span>
                    </div>
                    <p className="text-3xl font-black text-green-600">
                        {formatAOA(subscriptions.filter(s => s.status === 'ativo').reduce((acc, s) => acc + (Number(s.valor_pago) || 0), 0))}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-sky-100 overflow-hidden">
                <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Gestão de Empresas</h2>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <Input
                            placeholder="Procurar empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100">
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Empresa</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">NIF</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Status</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Plano</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filteredTenants.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-zinc-50/50 transition-all">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 font-bold">
                                                {tenant.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900">{tenant.nome}</p>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{tenant.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-medium text-zinc-600">{tenant.nif || 'Não informado'}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${tenant.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-zinc-900">N/A</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button className="text-yellow-600 font-black text-[10px] uppercase tracking-widest border-b border-yellow-500/50 hover:border-yellow-500 transition-all">Ver Detalhes</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-sky-100 overflow-hidden">
                <div className="p-8 border-b border-zinc-100">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Pagamentos Pendentes</h2>
                </div>
                <div className="p-8 space-y-4">
                    {subscriptions.filter(s => s.status === 'pendente').map(sub => (
                        <div key={sub.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm"><CreditCard className="text-orange-500" /></div>
                                <div>
                                    <p className="font-black text-zinc-900 uppercase tracking-tight">{sub.saas_tenants?.nome}</p>
                                    <p className="text-xs text-zinc-500 font-bold">{sub.saas_plans?.nome} • {formatAOA(sub.valor_pago)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {sub.comprovativo_url && (
                                    <a href={sub.comprovativo_url} target="_blank" className="flex-1 md:flex-none text-center px-6 py-3 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all">Ver Comprovativo</a>
                                )}
                                <Button onClick={() => handleApproveSubscription(sub.id)} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white">Aprovar</Button>
                            </div>
                        </div>
                    ))}
                    {subscriptions.filter(s => s.status === 'pendente').length === 0 && (
                        <div className="py-12 text-center text-zinc-400">
                            <Clock size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-medium">Sem pagamentos pendentes para aprovação.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MasterAdmin;
