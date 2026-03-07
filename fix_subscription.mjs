import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgktemwegesmmomlftgt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    // Ver subscrição existente
    console.log('=== SAAS_SUBSCRIPTIONS ===');
    const { data: subs, error: subErr } = await supabase.from('saas_subscriptions').select('*');
    if (subErr) console.log('ERRO:', subErr.message);
    else console.log(JSON.stringify(subs, null, 2));

    // Ver tenants
    console.log('\n=== SAAS_TENANTS ===');
    const { data: tenants, error: tenErr } = await supabase.from('saas_tenants').select('*');
    if (tenErr) console.log('ERRO:', tenErr.message);
    else console.log(JSON.stringify(tenants, null, 2));

    // Ver profiles
    console.log('\n=== PROFILES ===');
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email, role, tenant_id');
    if (profErr) console.log('ERRO:', profErr.message);
    else console.log(JSON.stringify(profiles, null, 2));

    // Criar plano "ALL" se não existir, e atualizar subscrição 
    console.log('\n=== A CRIAR PLANO MASTER E CORRIGIR SUBSCRICAO ===');

    // 1. Criar o plano master com todos os módulos
    const { data: plan, error: planErr } = await supabase
        .from('saas_plans')
        .upsert([{
            id: 'plan-master-amazing',
            nome: 'Amazing Enterprise',
            valor: 0,
            duracao_meses: 120,
            max_users: 9999,
            modules: ['ALL'],
            features: ['Acesso Total', 'Todos os Módulos', 'Suporte Prioritário']
        }], { onConflict: 'id' })
        .select();

    if (planErr) {
        console.log('Erro ao criar plano:', planErr.message, planErr.code);
    } else {
        console.log('Plano criado:', JSON.stringify(plan, null, 2));

        // 2. Atualizar a subscrição existente com o plano e datas correctas
        if (subs && subs.length > 0) {
            const { data: updSub, error: updErr } = await supabase
                .from('saas_subscriptions')
                .update({
                    plan_id: 'plan-master-amazing',
                    status: 'ativo',
                    data_inicio: new Date().toISOString(),
                    data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    auto_renew: true
                })
                .eq('id', subs[0].id)
                .select();

            if (updErr) console.log('Erro ao actualizar subscricao:', updErr.message, updErr.code);
            else console.log('Subscricao actualizada:', JSON.stringify(updSub, null, 2));
        } else {
            // Criar subscrição se não existir
            if (tenants && tenants.length > 0) {
                const { data: newSub, error: newSubErr } = await supabase
                    .from('saas_subscriptions')
                    .insert([{
                        tenant_id: tenants[0].id,
                        plan_id: 'plan-master-amazing',
                        status: 'ativo',
                        data_inicio: new Date().toISOString(),
                        data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                        valor_pago: 0,
                        auto_renew: true
                    }])
                    .select();
                if (newSubErr) console.log('Erro ao criar subscricao:', newSubErr.message);
                else console.log('Nova subscricao criada:', JSON.stringify(newSub, null, 2));
            }
        }
    }

    console.log('\nDone!');
})();
