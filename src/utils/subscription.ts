import { supabase } from '../lib/supabase';
import { SubscriptionStatus } from '../../types';

export const checkSubscription = async (tenantId: string): Promise<SubscriptionStatus> => {
    try {
        const { data, error } = await supabase
            .from('saas_subscriptions')
            .select('*, saas_plans(*)')
            .eq('tenant_id', tenantId)
            .order('data_expiracao', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return {
                active: false,
                status: 'expirado',
                daysLeft: 0,
                message: 'Nenhuma subscrição activa encontrada.',
                modules: [],
                maxUsers: 0
            };
        }

        // Guardar de seguranca: subscricao activa mas plano apagado da BD
        // (chave estrangeira orphan). Conceder acesso total temporariamente.
        if (!data.saas_plans && data.status === 'ativo') {
            console.warn('checkSubscription: Plano órfão detectado. A conceder acesso total temporário.');
            return {
                active: true,
                status: 'ativo',
                daysLeft: 9999,
                modules: ['ALL'],
                maxUsers: 9999,
                id: data.id,
                tenant_id: data.tenant_id,
                plan_id: data.plan_id,
                valor_pago: data.valor_pago ? Number(data.valor_pago) : undefined,
                data_inicio: data.data_inicio,
                data_expiracao: data.data_expiracao,
                auto_renew: data.auto_renew ?? false,
            };
        }

        const expiry = new Date(data.data_expiracao);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const plan = data.saas_plans;
        // modules can be an array or an object (key: boolean map)
        let modules: string[] = [];
        if (Array.isArray(plan?.modules)) {
            modules = plan.modules;
        } else if (plan?.modules && typeof plan.modules === 'object') {
            // Convert {RH: true, FINANCEIRO: false} to ['RH']
            modules = Object.entries(plan.modules as Record<string, boolean>)
                .filter(([, active]) => active)
                .map(([key]) => key);
        }
        const maxUsers = plan?.max_users || 0;

        let status = data.status as SubscriptionStatus['status'];
        let active = status === 'ativo' && diffDays >= 0;

        if (diffDays < 0 && status === 'ativo') {
            status = 'expirado';
            active = false;
        }

        return {
            active,
            status,
            daysLeft: diffDays,
            message: diffDays <= 7 && diffDays >= 0 ? `A sua licença expira em ${diffDays} dias.` :
                diffDays < 0 ? 'A sua licença expirou.' : undefined,
            modules,
            maxUsers,
            // Full DB fields
            id: data.id,
            tenant_id: data.tenant_id,
            plan_id: data.plan_id,
            valor_pago: data.valor_pago ? Number(data.valor_pago) : undefined,
            data_inicio: data.data_inicio,
            data_expiracao: data.data_expiracao,
            data_pagamento: data.data_pagamento, // New field
            auto_renew: data.auto_renew ?? false,
            comprovativo_url: data.comprovativo_url,
            rejection_reason: data.rejection_reason, // New field
            created_at: data.created_at,
            saas_plans: plan || undefined,
        };
    } catch (err) {
        console.error('Error checking subscription:', err);
        return {
            active: false,
            status: 'suspenso',
            daysLeft: 0,
            message: 'Erro ao validar licença.',
            modules: [],
            maxUsers: 0
        };
    }
};

export const isModuleActive = (status: SubscriptionStatus, moduleName: string): boolean => {
    if (!status.active) return false;
    return status.modules.some(m => m.toUpperCase() === moduleName.toUpperCase())
        || status.modules.some(m => m.toUpperCase() === 'ALL');
};
