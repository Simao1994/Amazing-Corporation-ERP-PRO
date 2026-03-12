import React, { useState, useEffect, useTransition } from 'react';
import { supabase } from '../src/lib/supabase';
import {
    Building2, Users, CreditCard, CheckCircle2, XCircle, Clock,
    AlertTriangle, TrendingUp, Search, X, Plus, Edit3, Shield, Globe, Layers, BarChart3,
    Calendar, RefreshCw, ChevronDown, Link as LinkIcon, Eye, Database, Wifi, Zap
} from 'lucide-react';
import { formatAOA } from '../constants';
import { useAuth } from '../src/contexts/AuthContext';

const MasterAdmin: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'plans' | 'subscriptions' | 'monitor'>('overview');
    const [, startTabTransition] = useTransition();
    const [tenants, setTenants] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbMonitorData, setDbMonitorData] = useState<any[]>([]);
    const [monitorLoading, setMonitorLoading] = useState(false);

    // Plan modal state
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [planFormSaving, setPlanFormSaving] = useState(false);
    const [planForm, setPlanForm] = useState({
        nome: '',
        valor: '',
        duracao_meses: '12',
        max_users: '10',
        modules: '',
        features: ''
    });

    // License modal state
    const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
    const [licenseModalTenant, setLicenseModalTenant] = useState<any>(null);
    const [licenseFormSaving, setLicenseFormSaving] = useState(false);
    const [licenseForm, setLicenseForm] = useState({
        plan_id: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_expiracao: '',
        valor_pago: '',
        status: 'ativo',
        auto_renew: false,
    });

    // Subscription edit state
    const [editingSubscription, setEditingSubscription] = useState<any>(null);

    // Tenant registration state
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [tenantFormSaving, setTenantFormSaving] = useState(false);
    const [tenantForm, setTenantForm] = useState({
        nome: '',
        nif: '',
        slug: '',
        status: 'ativo'
    });

    // Global Config state
    const [saasConfig, setSaasConfig] = useState<any>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configFormSaving, setConfigFormSaving] = useState(false);
    const [configForm, setConfigForm] = useState({
        banco: '',
        iban: '',
        beneficiario: ''
    });


    const isMounted = React.useRef(true);
    const timeoutIdRef = React.useRef<any>(null);

    useEffect(() => {
        isMounted.current = true;

        // Só iniciar se a autenticação estiver resolvida e o utilizador logado
        if (!authLoading && user) {
            console.log("MasterAdmin: Auth resolvido, iniciando fetchData...");
            fetchData();
        }

        return () => {
            isMounted.current = false;
            if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        };
    }, [authLoading, user]);

    const fetchMonitorData = async () => {
        setMonitorLoading(true);
        try {
            // Tentamos usar uma query para listar tabelas via RPC se existir, 
            // ou uma lista pré-definida das 109 tabelas críticas do ERP
            const { data, error: rpcError } = await supabase.rpc('get_system_tables_status');

            if (!rpcError && data) {
                setDbMonitorData(data);
            } else {
                // Fallback: Auditoria manual das tabelas principais para garantir visualização
                const tables = [
                    'profiles', 'tenants', 'saas_plans', 'saas_subscriptions', 'audit_logs',
                    'funcionarios', 'departamentos', 'agro_producao', 'frota_veiculos',
                    'financeiro_transacoes', 'pos_vendas', 'pos_produtos', 'crm_leads',
                    'imobiliario_propriedades', 'manutencao_ordens', 'rh_folha_pagamento'
                ];

                const results = await Promise.all(tables.map(async (table) => {
                    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
                    return {
                        name: table,
                        rows: count || 0,
                        status: error ? 'error' : 'online',
                        latency: 'Sub-ms'
                    };
                }));
                setDbMonitorData(results);
            }
        } catch (err) {
            console.error("Erro ao monitorar BD:", err);
        } finally {
            setMonitorLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'monitor') {
            fetchMonitorData();
        }
    }, [activeTab]);

    const fetchData = async (retryCount = 0) => {
        if (!isMounted.current) return;

        // Se for a primeira tentativa, esperar um pouco para evitar colisão com boot da app
        if (retryCount === 0) {
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        if (!isMounted.current) return;

        console.log(`MasterAdmin: A iniciar carregamento de dados SaaS (Tentativa ${retryCount + 1})...`);
        setLoading(true);
        setError(null);

        // Limpar timeout anterior se existir
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

        // Timeout de segurança (15s)
        timeoutIdRef.current = setTimeout(() => {
            console.error("MasterAdmin: Timeout de 15s atingido.");
            setError('Tempo limite de carregamento excedido. Por favor, recarregue a página.');
            setLoading(false);
        }, 15000);

        try {
            console.log("MasterAdmin: Iniciando chamadas paralelas ao Supabase...");

            // Chamadas paralelas para melhor performance
            const [tenantsRes, plansRes, subsRes, configRes] = await Promise.all([
                supabase.from('saas_tenants').select('*, saas_subscriptions(*)'),
                supabase.from('saas_plans').select('*').order('valor', { ascending: true }),
                supabase.from('saas_subscriptions').select('*, saas_tenants(nome), saas_plans(nome, valor)').order('created_at', { ascending: false }),
                supabase.from('saas_config').select('*').single()
            ]);

            if (tenantsRes.error) throw tenantsRes.error;
            if (plansRes.error) throw plansRes.error;
            if (subsRes.error) throw subsRes.error;

            if (isMounted.current) {
                console.log("MasterAdmin: Todos os dados carregados com sucesso.");
                setTenants(tenantsRes.data || []);
                setPlans(plansRes.data || []);
                setSubscriptions(subsRes.data || []);
                setSaasConfig(configRes.data || { banco: 'Banco BAI', iban: 'AO06 0000 0000 8921 3451 2', beneficiario: 'Amazing Corporation Software LDA' });
                setLoading(false);
                if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
            }
        } catch (err: any) {
            console.error('MasterAdmin: Erro ao carregar dados:', err);

            // Erros de Lock do Supabase (LockManager ou "Lock broken by another request with the 'steal' option")
            const isLockError = err.message?.includes('LockManager') ||
                err.message?.includes('Lock broken') ||
                err.message?.includes('steal');

            if (isLockError && retryCount < 3 && isMounted.current) {
                const delay = 1000 * (retryCount + 1);
                console.warn(`MasterAdmin: Detectado erro de Lock, a tentar novamente (tentativa ${retryCount + 1}) em ${delay}ms...`);

                // Se falhou em paralelo, a próxima tentativa será sequencial para ser mais seguro
                setTimeout(() => {
                    if (retryCount >= 1) {
                        console.log("MasterAdmin: Mudando para carregamento sequencial por segurança...");
                        fetchDataSequential(retryCount + 1);
                    } else {
                        fetchData(retryCount + 1);
                    }
                }, delay);
                return;
            }

            if (isMounted.current) {
                setError(err.message || 'Erro ao carregar dados do dashboard master.');
                setLoading(false);
                if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
            }
        }
    };

    // Versão sequencial para casos de erro de lock persistente
    const fetchDataSequential = async (retryCount = 0) => {
        if (!isMounted.current) return;
        setLoading(true);

        try {
            console.log("MasterAdmin: Iniciando carregamento SEQUENCIAL...");

            const tenantsRes = await supabase.from('saas_tenants').select('*, saas_subscriptions(*)');
            if (tenantsRes.error) throw tenantsRes.error;

            const plansRes = await supabase.from('saas_plans').select('*').order('valor', { ascending: true });
            if (plansRes.error) throw plansRes.error;

            const subsRes = await supabase.from('saas_subscriptions').select('*, saas_tenants(nome), saas_plans(nome, valor)').order('created_at', { ascending: false });
            if (subsRes.error) throw subsRes.error;

            const configRes = await supabase.from('saas_config').select('*').single();

            if (isMounted.current) {
                setTenants(tenantsRes.data || []);
                setPlans(plansRes.data || []);
                setSubscriptions(subsRes.data || []);
                setSaasConfig(configRes.data || { banco: 'Banco BAI', iban: 'AO06 0000 0000 8921 3451 2', beneficiario: 'Amazing Corporation Software LDA' });
                setLoading(false);
            }
        } catch (err: any) {
            console.error("MasterAdmin: Erro no carregamento sequencial:", err);
            if (isMounted.current) {
                setError(err.message);
                setLoading(false);
            }
        }
    };

    // When a plan is selected, auto-fill the expiry date
    const handlePlanSelect = (planId: string) => {
        const selectedPlan = plans.find(p => p.id === planId);
        if (selectedPlan && licenseForm.data_inicio) {
            const startDate = new Date(licenseForm.data_inicio);
            const expiryDate = new Date(startDate);
            expiryDate.setMonth(expiryDate.getMonth() + (selectedPlan.duracao_meses || 12));
            setLicenseForm(prev => ({
                ...prev,
                plan_id: planId,
                data_expiracao: expiryDate.toISOString().split('T')[0],
                valor_pago: selectedPlan.valor?.toString() || '',
            }));
        } else {
            setLicenseForm(prev => ({ ...prev, plan_id: planId }));
        }
    };

    const openLicenseModal = (tenant: any) => {
        setLicenseModalTenant(tenant);
        // Check if there's an existing subscription to edit
        const existingSub = subscriptions.find(s => s.tenant_id === tenant.id || s.saas_tenants?.nome === tenant.nome);
        if (existingSub) {
            setLicenseForm({
                plan_id: existingSub.plan_id || '',
                data_inicio: existingSub.data_inicio || new Date().toISOString().split('T')[0],
                data_expiracao: existingSub.data_expiracao || '',
                valor_pago: existingSub.valor_pago?.toString() || '',
                status: existingSub.status || 'ativo',
                auto_renew: existingSub.auto_renew || false,
            });
            setEditingSubscription(existingSub);
        } else {
            setLicenseForm({
                plan_id: plans[0]?.id || '',
                data_inicio: new Date().toISOString().split('T')[0],
                data_expiracao: '',
                valor_pago: '',
                status: 'ativo',
                auto_renew: false,
            });
            setEditingSubscription(null);
            // Auto-set expiry based on first plan
            if (plans[0]) {
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + (plans[0].duracao_meses || 12));
                setLicenseForm(prev => ({
                    ...prev,
                    plan_id: plans[0].id,
                    data_expiracao: expiryDate.toISOString().split('T')[0],
                    valor_pago: plans[0].valor?.toString() || '',
                }));
            }
        }
        setIsLicenseModalOpen(true);
    };

    const handleSaveLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseModalTenant || !licenseForm.plan_id) return;
        setLicenseFormSaving(true);

        const payload = {
            tenant_id: licenseModalTenant.id,
            plan_id: licenseForm.plan_id,
            data_inicio: licenseForm.data_inicio,
            data_expiracao: licenseForm.data_expiracao,
            valor_pago: Number(licenseForm.valor_pago),
            status: licenseForm.status,
            auto_renew: licenseForm.auto_renew,
        };

        try {
            let result;
            if (editingSubscription) {
                result = await supabase.from('saas_subscriptions').update(payload).eq('id', editingSubscription.id);
            } else {
                result = await supabase.from('saas_subscriptions').insert([payload]);
            }

            if (result.error) throw result.error;

            // PERFORMANCE: Close modal immediately to resolve INP/UI blocking
            setIsLicenseModalOpen(false);
            setLicenseModalTenant(null);
            setEditingSubscription(null);

            // DEFER: Fetch data in background
            setTimeout(() => {
                fetchData();
                (window as any).notify?.(editingSubscription ? 'Licença actualizada com sucesso!' : 'Licença criada com sucesso!', 'success');
            }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        } finally {
            setLicenseFormSaving(false);
        }
    };

    const handleDeleteSubscription = async (subId: string) => {
        if (!window.confirm('Tem a certeza que quer eliminar esta licença? Esta acção é irreversível.')) return;
        try {
            const { error } = await supabase.from('saas_subscriptions').delete().eq('id', subId);
            if (error) throw error;
            setTimeout(() => { fetchData(); (window as any).notify?.('Licença eliminada.', 'info'); }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        }
    };

    const openLicenseModalForEdit = (sub: any) => {
        const tenant = tenants.find((t: any) => t.id === sub.tenant_id) || { id: sub.tenant_id, nome: sub.saas_tenants?.nome || 'Empresa' };
        setLicenseModalTenant(tenant);
        setEditingSubscription(sub);
        setLicenseForm({
            plan_id: sub.plan_id || '',
            data_inicio: sub.data_inicio || new Date().toISOString().split('T')[0],
            data_expiracao: sub.data_expiracao || '',
            valor_pago: sub.valor_pago?.toString() || '',
            status: sub.status || 'ativo',
            auto_renew: sub.auto_renew || false,
        });
        setIsLicenseModalOpen(true);
    };

    const handleSaveTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantForm.nome || !tenantForm.slug) {
            (window as any).notify?.("Nome e Slug são obrigatórios.", "error");
            return;
        }
        setTenantFormSaving(true);
        try {
            const result = await supabase.rpc('master_create_tenant', {
                p_nome: tenantForm.nome,
                p_slug: tenantForm.slug,
                p_nif: tenantForm.nif,
                p_status: tenantForm.status
            });
            if (result.error) throw result.error;
            if (!result.data.success) throw new Error(result.data.message);

            setIsTenantModalOpen(false);
            setTimeout(() => {
                fetchData();
                (window as any).notify?.('Empresa criada com sucesso!', 'success');
            }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        } finally {
            setTenantFormSaving(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfigFormSaving(true);
        try {
            const { data, error } = await supabase.rpc('master_update_config', {
                p_banco: configForm.banco,
                p_iban: configForm.iban,
                p_beneficiario: configForm.beneficiario
            });
            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            setIsConfigModalOpen(false);
            setTimeout(() => {
                fetchData();
                (window as any).notify?.('Configurações guardadas com sucesso!', 'success');
            }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        } finally {
            setConfigFormSaving(false);
        }
    };

    const handleUpdateTenantStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('saas_tenants')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // DEFER: Fetch data in background
            setTimeout(() => {
                fetchData();
                (window as any).notify?.('Estado da empresa actualizado!', 'success');
            }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        }
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!planForm.nome || !planForm.valor) {
            (window as any).notify?.('Preencha o nome e o valor do plano.', 'error');
            return;
        }

        const modulesArray = planForm.modules.split(',').map((m: string) => m.trim().toUpperCase()).filter(Boolean);
        const featuresArray = planForm.features.split(',').map((f: string) => f.trim()).filter(Boolean);

        setPlanFormSaving(true);
        try {
            // Usar RPC com SECURITY DEFINER para bypassar RLS completamente
            const { data, error } = await supabase.rpc('master_upsert_plan', {
                p_nome: planForm.nome,
                p_valor: Number(planForm.valor),
                p_duracao_meses: Number(planForm.duracao_meses),
                p_max_users: Number(planForm.max_users),
                p_features: featuresArray,
                p_modules: modulesArray,
                p_plan_id: editingPlan?.id || null
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            setIsPlanModalOpen(false);
            setEditingPlan(null);
            fetchData();
            (window as any).notify?.('Plano guardado com sucesso!', 'success');
        } catch (err: any) {
            console.error("Erro ao guardar plano:", err);
            (window as any).notify?.(err.message, 'error');
        } finally {
            setPlanFormSaving(false);
        }
    };

    const openPlanModal = (plan: any | null) => {
        setEditingPlan(plan);
        setPlanForm({
            nome: plan?.nome || '',
            valor: plan?.valor?.toString() || '',
            duracao_meses: plan?.duracao_meses?.toString() || '12',
            max_users: plan?.max_users?.toString() || '10',
            modules: Array.isArray(plan?.modules) ? plan.modules.join(', ') : '',
            features: Array.isArray(plan?.features) ? plan.features.join(', ') : ''
        });
        setIsPlanModalOpen(true);
    };

    const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const MODULE_PRESETS = [
        'RH', 'PONTO', 'FINANCEIRO', 'LOGISTICA', 'IMOBILIARIO', 'ARENA', 'AGRO', 'EMPRESAS', 'BLOG', 'ALL'
    ];

    const handleApprovePayment = async (subId: string) => {
        if (!confirm('Aprovar este pagamento e activar a licença?')) return;
        try {
            const { error } = await supabase
                .from('saas_subscriptions')
                .update({
                    status: 'ativo',
                    rejection_reason: null,
                    data_pagamento: new Date().toISOString()
                })
                .eq('id', subId);
            if (error) throw error;

            setTimeout(() => {
                fetchData();
                (window as any).notify?.('Pagamento aprovado! Licença activada.', 'success');
            }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        }
    };

    const handleRejectPayment = async () => {
        if (!rejectionModalId || !rejectionReason.trim()) return;
        try {
            const { error } = await supabase
                .from('saas_subscriptions')
                .update({
                    status: 'expirado', // Move to expired if rejected
                    rejection_reason: rejectionReason
                })
                .eq('id', rejectionModalId);
            if (error) throw error;

            setRejectionModalId(null);
            setRejectionReason('');
            setTimeout(() => {
                fetchData();
                (window as any).notify?.('Pagamento rejeitado e empresa notificada.', 'info');
            }, 100);
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nif?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Carregamento não-bloqueante

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] p-8">
            <div className="bg-red-500/10 border border-red-500/30 p-10 rounded-[2.5rem] text-center max-w-md">
                <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-black text-white mb-2">Erro de Acesso</h2>
                <p className="text-red-300 text-sm font-medium mb-6">{error}</p>
                <button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
                    Tentar Novamente
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans selection:bg-purple-500/30">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2.5 rounded-2xl shadow-xl shadow-purple-900/20">
                            <Shield size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight uppercase">
                            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">HQ</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Controlo Central da Infraestrutura Amazing ERP</p>
                </div>

                <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    {[
                        { id: 'overview', label: 'Estatísticas', icon: <BarChart3 size={16} /> },
                        { id: 'tenants', label: 'Empresas', icon: <Globe size={16} /> },
                        { id: 'plans', label: 'Planos', icon: <Layers size={16} /> },
                        { id: 'subscriptions', label: 'Licenças', icon: <CreditCard size={16} /> },
                        { id: 'monitor', label: 'Monitor BD', icon: <Database size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => startTabTransition(() => setActiveTab(tab.id as any))}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {loading && tenants.length === 0 ? (
                            <div className="col-span-full py-12 text-center animate-pulse">
                                <RefreshCw className="mx-auto w-8 h-8 text-purple-500 animate-spin mb-3" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando infraestrutura...</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[#0f172a]/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-purple-500/30 transition-all group">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-purple-400 transition-colors">
                                        <Building2 size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] line-clamp-1">Empresas Ativas</span>
                                    </div>
                                    <p className="text-3xl font-black">{tenants.filter(t => t.status === 'ativo').length}</p>
                                </div>
                                <div className="bg-[#0f172a]/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-blue-400 transition-colors">
                                        <Users size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] line-clamp-1">Total Empresas</span>
                                    </div>
                                    <p className="text-3xl font-black">{tenants.length}</p>
                                </div>
                                <div className="bg-[#0f172a]/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-cyan-500/30 transition-all group">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-cyan-400 transition-colors">
                                        <Users size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] line-clamp-1">Visitantes APP</span>
                                    </div>
                                    <p className="text-3xl font-black">{saasConfig?.visitors_count || 0}</p>
                                </div>
                                <div className="bg-[#0f172a]/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors">
                                        <Eye size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] line-clamp-1">Visualizações</span>
                                    </div>
                                    <p className="text-3xl font-black">{saasConfig?.views_count || 0}</p>
                                </div>
                                <div className="bg-[#0f172a]/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-green-500/30 transition-all group relative overflow-hidden">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-green-400 transition-colors relative z-10">
                                        <TrendingUp size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] line-clamp-1">MRR Est.</span>
                                    </div>
                                    <p className="text-xl md:text-2xl font-black text-green-400 relative z-10">
                                        {formatAOA(subscriptions.filter(s => s.status === 'ativo').reduce((acc, s) => acc + (Number(s.valor_pago) || 0), 0))}
                                    </p>
                                </div>
                                <div className="bg-[#0f172a]/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-orange-500/30 transition-all group">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-orange-400 transition-colors">
                                        <AlertTriangle size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] line-clamp-1">Pendentes</span>
                                    </div>
                                    <p className="text-3xl font-black text-orange-400">
                                        {subscriptions.filter(s => s.status === 'pendente').length}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-white/5">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-6">Atividade Recente</h3>
                            <div className="space-y-4">
                                {subscriptions.slice(0, 5).map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-purple-500/20 text-purple-400 p-2.5 rounded-xl"><CreditCard size={20} /></div>
                                            <div>
                                                <p className="text-sm font-bold">{sub.saas_tenants?.nome}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{sub.saas_plans?.nome} • {sub.status}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">{new Date(sub.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                                {subscriptions.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-8">Nenhuma actividade recente.</p>
                                )}
                            </div>
                        </div>
                        <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all"></div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight mb-6">Configurações Base</h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Beneficiário</p>
                                        <p className="text-sm font-bold">{saasConfig?.beneficiario || '—'}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">IBAN {saasConfig?.banco || ''}</p>
                                        <p className="text-sm font-mono font-bold text-yellow-500">{saasConfig?.iban || '—'}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setConfigForm({
                                        banco: saasConfig?.banco || '',
                                        iban: saasConfig?.iban || '',
                                        beneficiario: saasConfig?.beneficiario || ''
                                    });
                                    setIsConfigModalOpen(true);
                                }}
                                className="w-full mt-6 py-3 bg-purple-600/20 text-purple-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all border border-purple-500/20 flex items-center justify-center gap-2 relative z-10"
                            >
                                <Edit3 size={14} /> Configurar Pagamentos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tenants Tab */}
            {activeTab === 'tenants' && (
                <div className="bg-[#0f172a] rounded-[3rem] border border-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/2 backdrop-blur-sm">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Directório de Empresas</h2>
                            <p className="text-slate-500 text-xs mt-1">Clique em <span className="text-purple-400 font-black">+ Licença</span> para criar ou editar a licença de uma empresa</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    placeholder="Procurar empresa ou NIF..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setIsTenantModalOpen(true)}
                                className="px-6 py-3 bg-white text-zinc-900 rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-zinc-100 transition-all"
                            >
                                <Plus size={16} /> Nova Empresa
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/2 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Empresa / Slug</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">NIF / Data</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Licença Activa</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && tenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <RefreshCw className="mx-auto w-10 h-10 text-purple-500 animate-spin mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Auditando bases de dados corporativas...</p>
                                        </td>
                                    </tr>
                                ) : filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-slate-500 font-bold text-sm">
                                            Nenhuma empresa encontrada.
                                        </td>
                                    </tr>
                                ) : filteredTenants.map(tenant => {
                                    const activeSub = subscriptions.find(s => s.tenant_id === tenant.id && s.status === 'ativo');
                                    return (
                                        <tr key={tenant.id} className="hover:bg-white/2 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/5 flex items-center justify-center text-purple-400 font-black text-xl shadow-inner">
                                                        {tenant.nome?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm uppercase tracking-tight">{tenant.nome}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{tenant.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-300">NIF: {tenant.nif || '—'}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">Cadastrado em {new Date(tenant.created_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2 h-2 rounded-full ${tenant.status === 'ativo' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tenant.status === 'ativo' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {tenant.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {activeSub ? (
                                                    <div>
                                                        <p className="text-xs font-black text-purple-400">{activeSub.saas_plans?.nome}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                                            Expira: {new Date(activeSub.data_expiracao).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Sem Licença</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const url = `${window.location.origin}${window.location.pathname}#/login?empresa=${tenant.slug}`;
                                                            navigator.clipboard.writeText(url);
                                                            (window as any).notify?.("Link de acesso copiado!", "success");
                                                        }}
                                                        className="p-2 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg shadow-sky-900/10"
                                                        title="Copiar Link de Acesso"
                                                    >
                                                        <LinkIcon size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateTenantStatus(tenant.id, tenant.status === 'ativo' ? 'suspenso' : 'ativo')}
                                                        className={`p-2 rounded-xl border transition-all ${tenant.status === 'ativo' ? 'border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white' : 'border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white'
                                                            }`}
                                                        title={tenant.status === 'ativo' ? 'Suspender empresa' : 'Activar empresa'}
                                                    >
                                                        {tenant.status === 'ativo' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => openLicenseModal(tenant)}
                                                        className="flex items-center gap-2 px-4 py-2 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <Plus size={14} /> Licença
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredTenants.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-slate-500 font-bold text-sm">
                                            Nenhuma empresa encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Plans Tab */}
            {activeTab === 'plans' && (() => {
                // Safely parse any JSONB field that could be array, object, string, or null
                const parseJsonbArray = (val: any): string[] => {
                    if (!val) return [];
                    if (Array.isArray(val)) return val.filter(Boolean);
                    if (typeof val === 'string') {
                        try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
                        catch { return val.split(',').map((s: string) => s.trim()).filter(Boolean); }
                    }
                    if (typeof val === 'object') return Object.entries(val).filter(([, v]) => v).map(([k]) => k);
                    return [];
                };

                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-[#0f172a] rounded-[2.5rem] border border-white/5 p-8 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8">
                                    <button onClick={() => openPlanModal(plan)} className="text-slate-500 hover:text-white transition-colors"><Edit3 size={20} /></button>
                                </div>
                                <div className="mb-8">
                                    <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{plan.nome}</h3>
                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{plan.duracao_meses} Meses de Validade</p>
                                </div>
                                <div className="mb-10">
                                    <p className="text-4xl font-black mb-1">{formatAOA(plan.valor)}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Pagamento único por período</p>
                                </div>
                                <div className="space-y-4 mb-10 flex-1">
                                    <div className="p-4 bg-white/2 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Módulos Ativos</p>
                                        <div className="flex flex-wrap gap-2">
                                            {parseJsonbArray(plan.modules).map((mod: string) => (
                                                <span key={mod} className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-purple-500/20">{mod}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Recursos do Plano</p>
                                        {parseJsonbArray(plan.features).map((feat: string) => (
                                            <div key={feat} className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                                                <CheckCircle2 size={14} className="text-green-500" /> {feat}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white/2 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Limite de Utilizadores</span>
                                    <span className="font-black text-purple-400">{plan.max_users}</span>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => openPlanModal(null)}
                            className="bg-transparent border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-purple-500 hover:text-purple-400 transition-all min-h-[400px]"
                        >
                            <Plus size={48} />
                            <span className="font-black uppercase tracking-widest">Novo Plano</span>
                        </button>
                    </div>
                );
            })()}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {subscriptions.filter(s => s.status === 'pendente').length > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 p-8 rounded-[3rem] mb-12">
                            <h3 className="text-orange-400 font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <AlertTriangle size={20} /> Aprovação Urgente (Pagamentos Pendentes)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {subscriptions.filter(s => s.status === 'pendente').map(sub => (
                                    <div key={sub.id} className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-black"><CreditCard /></div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight">{sub.saas_tenants?.nome}</p>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{sub.saas_plans?.nome} • {formatAOA(sub.valor_pago)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {sub.comprovativo_url && (
                                                <a href={sub.comprovativo_url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"><Search size={18} /></a>
                                            )}
                                            <button
                                                onClick={() => setRejectionModalId(sub.id)}
                                                className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Rejeitar
                                            </button>
                                            <button
                                                onClick={() => handleApprovePayment(sub.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all"
                                            >
                                                Aprovar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rejection Modal */}
                    {rejectionModalId && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-[#0f172a] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6">
                                    <button onClick={() => setRejectionModalId(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                                </div>
                                <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Rejeitar Pagamento</h3>
                                <p className="text-slate-400 text-xs font-medium mb-6">Explique ao cliente o motivo da rejeição para que ele possa corrigir.</p>

                                <textarea
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/50 min-h-[120px] mb-6"
                                    placeholder="Ex: Valor incorrecto, comprovativo ilegível ou banco não correspondente."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />

                                <button
                                    onClick={handleRejectPayment}
                                    disabled={!rejectionReason.trim()}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/20"
                                >
                                    Confirmar Rejeição
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-[#0f172a] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 bg-white/2">
                            <h2 className="text-xl font-black uppercase tracking-tight">Histórico Global de Licenças</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/2 border-b border-white/5">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Data</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Empresa</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Plano / Valor</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Validade</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Estado</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {subscriptions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-white/2 transition-colors group">
                                            <td className="px-8 py-6 text-xs text-slate-400 font-bold">{new Date(sub.created_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-6">
                                                <p className="font-black text-sm uppercase tracking-tight">{sub.saas_tenants?.nome}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-200">{sub.saas_plans?.nome}</p>
                                                <p className="text-[10px] text-slate-500 font-bold tracking-widest">{formatAOA(sub.valor_pago)}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-300">{sub.data_expiracao ? new Date(sub.data_expiracao).toLocaleDateString() : '—'}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] ${sub.status === 'ativo' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                                                    sub.status === 'pendente' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openLicenseModalForEdit(sub)}
                                                        className="p-2 rounded-xl border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
                                                        title="Editar Licença"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSubscription(sub.id)}
                                                        className="p-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                        title="Eliminar Licença"
                                                    >
                                                        <XCircle size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {subscriptions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-16 text-slate-500 font-bold text-sm">
                                                Nenhuma licença registada ainda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== LICENSE MODAL ===== */}
            {isLicenseModalOpen && licenseModalTenant && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <form onSubmit={handleSaveLicense} className="bg-[#0f172a] w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">
                                    {editingSubscription ? 'Editar Licença' : 'Nova Licença'}
                                </h2>
                                <p className="text-slate-400 text-xs mt-1">
                                    Empresa: <span className="text-purple-400 font-black">{licenseModalTenant.nome}</span>
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsLicenseModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400"><X size={20} /></button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6">
                            {/* Plan Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Identificação do Plano</label>
                                <div className="relative">
                                    <select
                                        value={licenseForm.plan_id}
                                        onChange={(e) => handlePlanSelect(e.target.value)}
                                        required
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none text-white"
                                    >
                                        <option value="">-- Selecionar Plano --</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id} style={{ background: '#1e293b' }}>
                                                {p.nome} — {formatAOA(p.valor)} / {p.duracao_meses} meses
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                </div>
                            </div>

                            {/* Dates and value */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1"><Calendar size={12} /> Início</label>
                                    <input
                                        type="date"
                                        value={licenseForm.data_inicio}
                                        onChange={(e) => setLicenseForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                                        required
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1"><Clock size={12} /> Expiração</label>
                                    <input
                                        type="date"
                                        value={licenseForm.data_expiracao}
                                        onChange={(e) => setLicenseForm(prev => ({ ...prev, data_expiracao: e.target.value }))}
                                        required
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Valor Pago (AOA)</label>
                                    <input
                                        type="number"
                                        value={licenseForm.valor_pago}
                                        onChange={(e) => setLicenseForm(prev => ({ ...prev, valor_pago: e.target.value }))}
                                        required
                                        min="0"
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 text-white"
                                    />
                                </div>
                            </div>

                            {/* Status and Auto-renew */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Estado da Licença</label>
                                    <div className="relative">
                                        <select
                                            value={licenseForm.status}
                                            onChange={(e) => setLicenseForm(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none text-white"
                                        >
                                            <option value="ativo" style={{ background: '#1e293b' }}>✅ Ativo</option>
                                            <option value="pendente" style={{ background: '#1e293b' }}>⏳ Pendente</option>
                                            <option value="suspenso" style={{ background: '#1e293b' }}>⏸️ Suspenso</option>
                                            <option value="expirado" style={{ background: '#1e293b' }}>❌ Expirado</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-2">
                                        <RefreshCw size={12} /> Renovação Automática
                                    </label>
                                    <div className="flex items-center gap-4 h-[46px] px-4 bg-[#1e293b] border border-white/5 rounded-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setLicenseForm(prev => ({ ...prev, auto_renew: !prev.auto_renew }))}
                                            className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${licenseForm.auto_renew ? 'bg-purple-600' : 'bg-white/10'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 transform ${licenseForm.auto_renew ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <span className="text-xs font-bold text-slate-400">{licenseForm.auto_renew ? 'Activada' : 'Desactivada'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-black/20 flex justify-end gap-4">
                            <button type="button" onClick={() => setIsLicenseModalOpen(false)} className="px-8 py-3 bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={licenseFormSaving}
                                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                            >
                                {licenseFormSaving && <RefreshCw size={14} className="animate-spin" />}
                                {editingSubscription ? 'Actualizar Licença' : 'Criar Licença'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ===== PLAN MODAL ===== */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border border-white/10 p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="absolute top-0 right-0 p-8">
                            <button onClick={() => { setIsPlanModalOpen(false); setEditingPlan(null); }} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-900/20">
                                <Layers size={24} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h3>
                        </div>

                        <form onSubmit={handleSavePlan} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6 md:col-span-2">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2">Identificação do Plano</p>
                                    <input
                                        placeholder="Nome do Plano (Ex: Professional)"
                                        value={planForm.nome}
                                        onChange={(e) => setPlanForm({ ...planForm, nome: e.target.value })}
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2">Financeiro</p>
                                <input
                                    type="number"
                                    placeholder="Valor (AOA)"
                                    value={planForm.valor}
                                    onChange={(e) => setPlanForm({ ...planForm, valor: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2">Duração (Meses)</p>
                                <input
                                    type="number"
                                    placeholder="Ex: 12"
                                    value={planForm.duracao_meses}
                                    onChange={(e) => setPlanForm({ ...planForm, duracao_meses: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2">Limite Utilizadores</p>
                                <input
                                    type="number"
                                    placeholder="Ex: 10"
                                    value={planForm.max_users}
                                    onChange={(e) => setPlanForm({ ...planForm, max_users: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <div className="flex items-center justify-between px-2">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Módulos Activos</p>
                                    <div className="flex items-center gap-3">
                                        <span className="bg-purple-600/20 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            {planForm.modules.split(',').map((m: string) => m.trim()).filter(Boolean).length} activos
                                        </span>
                                        <button type="button" onClick={() => setPlanForm({ ...planForm, modules: MODULE_PRESETS.join(', ') })}
                                            className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-purple-400 transition-colors">
                                            Todos
                                        </button>
                                        <button type="button" onClick={() => setPlanForm({ ...planForm, modules: '' })}
                                            className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors">
                                            Limpar
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 p-5 bg-white/2 rounded-2xl border border-white/5">
                                    {[
                                        { id: 'RH', label: 'RH', icon: '👥' },
                                        { id: 'PONTO', label: 'Ponto', icon: '🕐' },
                                        { id: 'FINANCEIRO', label: 'Financeiro', icon: '💰' },
                                        { id: 'CONTABILIDADE', label: 'Contabilidade', icon: '📊' },
                                        { id: 'LOGISTICA', label: 'Logística', icon: '🚚' },
                                        { id: 'INVENTARIO', label: 'Inventário', icon: '📦' },
                                        { id: 'IMOBILIARIO', label: 'Imobiliário', icon: '🏢' },
                                        { id: 'CRM', label: 'CRM', icon: '🤝' },
                                        { id: 'VAGAS', label: 'Vagas', icon: '📋' },
                                        { id: 'ARENA', label: 'Arena', icon: '🎮' },
                                        { id: 'AGRO', label: 'Agro', icon: '🌾' },
                                        { id: 'BLOG', label: 'Blog', icon: '✍️' },
                                        { id: 'EMPRESAS', label: 'Empresas', icon: '🏭' },
                                        { id: 'ALL', label: 'Tudo', icon: '⭐' },
                                    ].map(mod => {
                                        const active = planForm.modules.toUpperCase().split(',').map((m: string) => m.trim()).includes(mod.id);
                                        return (
                                            <button
                                                key={mod.id}
                                                type="button"
                                                onClick={() => {
                                                    const currentMods = planForm.modules.split(',').map((m: string) => m.trim().toUpperCase()).filter(Boolean);
                                                    const newMods = active ? currentMods.filter((m: string) => m !== mod.id) : [...currentMods, mod.id];
                                                    setPlanForm({ ...planForm, modules: newMods.join(', ') });
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${active
                                                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                                                    : 'bg-white/5 border-white/5 text-slate-500 hover:border-purple-500/30 hover:text-slate-300'
                                                    }`}
                                            >
                                                <span>{mod.icon}</span> {mod.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2">Recursos/Benefícios (Separados por vírgula)</p>
                                <textarea
                                    placeholder="Ex: Suporte 24/7, Backups, Formação"
                                    value={planForm.features}
                                    onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[80px]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={planFormSaving}
                                className="md:col-span-2 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-900/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                {planFormSaving && <RefreshCw size={14} className="animate-spin" />}
                                Guardar Alterações do Plano
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Tenant Registration Modal */}
            {isTenantModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
                                <Building2 className="text-purple-500" /> Registar Empresa
                            </h2>
                            <button onClick={() => setIsTenantModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-400"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveTenant} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Designação Social</label>
                                <input
                                    required
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                    placeholder="Ex: Amazing Corp S.A."
                                    value={tenantForm.nome}
                                    onChange={e => {
                                        const nome = e.target.value;
                                        setTenantForm({
                                            ...tenantForm,
                                            nome,
                                            slug: tenantForm.slug || nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                        });
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">NIF</label>
                                    <input
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                        placeholder="5000..."
                                        value={tenantForm.nif}
                                        onChange={e => setTenantForm({ ...tenantForm, nif: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Slug (URL)</label>
                                    <input
                                        required
                                        className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                        placeholder="ex-empresa"
                                        value={tenantForm.slug}
                                        onChange={e => setTenantForm({ ...tenantForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={tenantFormSaving}
                                className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-xl shadow-purple-900/40 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {tenantFormSaving ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                {tenantFormSaving ? 'A REGISTAR...' : 'EFECTIVAR REGISTO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Application Config Modal */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
                                <CreditCard className="text-purple-500" /> Configurar Pagamentos
                            </h2>
                            <button onClick={() => setIsConfigModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-400"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveConfig} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Beneficiário</label>
                                <input
                                    required
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-text font-mono"
                                    placeholder="Ex: Amazing Corp S.A."
                                    value={configForm.beneficiario}
                                    onChange={e => setConfigForm({ ...configForm, beneficiario: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Banco</label>
                                <input
                                    required
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-text font-mono"
                                    placeholder="Ex: BAI, BFA, Atlântico"
                                    value={configForm.banco}
                                    onChange={e => setConfigForm({ ...configForm, banco: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">IBAN</label>
                                <input
                                    required
                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl p-4 text-sm font-bold text-yellow-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-text font-mono"
                                    placeholder="AO06 ..."
                                    value={configForm.iban}
                                    onChange={e => setConfigForm({ ...configForm, iban: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={configFormSaving}
                                className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-xl shadow-purple-900/40 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {configFormSaving ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                {configFormSaving ? 'A GUARDAR...' : 'GUARDAR CONFIGURAÇÕES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterAdmin;
