import { supabase } from '../lib/supabase';
import { Tenant } from '../../types';

export interface SubscriptionStatus {
    active: boolean;
    status: 'ativo' | 'suspenso' | 'expirado' | 'pendente';
    daysLeft: number;
    message?: string;
}

export const checkSubscription = async (tenantId: string): Promise<SubscriptionStatus> => {
    try {
        const { data, error } = await supabase
            .from('saas_subscriptions')
            .select('*, saas_plans(*)')
            .eq('tenant_id', tenantId)
            .eq('status', 'ativo')
            .order('data_expiracao', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return { active: false, status: 'expirado', daysLeft: 0, message: 'Nenhuma subscrição activa encontrada.' };
        }

        const expiry = new Date(data.data_expiracao);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { active: false, status: 'expirado', daysLeft: 0, message: 'A sua licença expirou.' };
        }

        return {
            active: true,
            status: data.status,
            daysLeft: diffDays,
            message: diffDays <= 7 ? `A sua licença expira em ${diffDays} dias.` : undefined
        };
    } catch (err) {
        console.error('Error checking subscription:', err);
        return { active: false, status: 'suspenso', daysLeft: 0, message: 'Erro ao validar licença.' };
    }
};
