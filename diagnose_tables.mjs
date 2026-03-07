import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgktemwegesmmomlftgt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Todas as tabelas que o sistema usa
const ALL_TABLES = [
    'profiles', 'funcionarios', 'galeria', 'config_sistema', 'empresas',
    'erp_data', 'sys_logs', 'sys_ads', 'sys_fornecedores', 'sys_parceiros',
    'app_roles', 'saas_subscriptions', 'saas_plans', 'saas_tenants',
    'expr_fleet', 'agro_agricultores', 'real_imoveis', 'arena_tournaments',
    'fin_notas', 'blog_posts', 'solicitacoes', 'hr_presencas', 'hr_recibos',
    'hr_metas', 'candidaturas', 'vagas', 'departamentos'
];

(async () => {
    console.log('=== DIAGNOSE COMPLETO DAS TABELAS ===\n');

    for (const table of ALL_TABLES) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                if (error.code === '42P01') {
                    console.log(`  NAO EXISTE: ${table} (tabela não existe na BD)`);
                } else if (error.code === '42501') {
                    console.log(`  PERMISSAO NEGADA: ${table} (RLS a bloquear)`);
                } else {
                    console.log(`  ERRO ${table}: ${error.code} - ${error.message}`);
                }
            } else {
                console.log(`  OK: ${table} (${count ?? 0} registos)`);
            }
        } catch (err) {
            console.log(`  FALHA: ${table}: ${err.message}`);
        }
    }

    console.log('\n=== TESTE DO RPC get_table_count ===');
    try {
        const { data, error } = await supabase.rpc('get_table_count');
        if (error) console.log('RPC ERRO:', error.message, '- codigo:', error.code);
        else console.log('RPC OK:', data);
    } catch (e) {
        console.log('RPC FALHA:', e.message);
    }
})();
