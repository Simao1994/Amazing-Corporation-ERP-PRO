import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgktemwegesmmomlftgt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// UUID exacto que a subscrição referencia
const PLAN_UUID = '7a672043-32ee-4139-980c-411ac7d5382d';
const SUB_UUID = 'e536f903-9dd3-4c2f-b341-674478177f89';

(async () => {
    console.log('A recriar o plano SaaS com o UUID correcto...');

    // Recriar o plano com o UUID exacto que a subscricao usa
    const { data: plan, error: planErr } = await supabase
        .from('saas_plans')
        .upsert([{
            id: PLAN_UUID,
            nome: 'Amazing Enterprise Full',
            valor: 90000,
            duracao_meses: 12,
            max_users: 9999,
            modules: ['ALL'],
            features: ['Acesso Total', 'Todos os Módulos', 'RH', 'Financeiro', 'Transportes', 'Inventário', 'Contabilidade']
        }], { onConflict: 'id' })
        .select();

    if (planErr) {
        console.log('ERRO ao recriar plano:', planErr.message, planErr.code);
        console.log('Detalhes:', JSON.stringify(planErr));
    } else {
        console.log('PLANO RECRIADO:', JSON.stringify(plan, null, 2));
    }

    // Verificar que a subscricao está válida
    console.log('\nA verificar subscricao...');
    const { data: sub, error: subErr } = await supabase
        .from('saas_subscriptions')
        .select('*, saas_plans(*)')
        .eq('id', SUB_UUID)
        .single();

    if (subErr) {
        console.log('ERRO ao verificar:', subErr.message);
    } else {
        console.log('SUBSCRICAO + PLANO:', JSON.stringify(sub, null, 2));
        if (sub.saas_plans) {
            console.log('\n✅ SUCESSO! A subscricao agora tem um plano valido com modulos:', sub.saas_plans.modules);
        } else {
            console.log('\n❌ Plano ainda não está ligado à subscricao.');
        }
    }
})();
