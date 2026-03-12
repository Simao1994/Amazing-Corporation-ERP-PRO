
import { supabase } from './src/lib/supabase';

async function listTables() {
    try {
        // In Supabase, we can use a query to information_schema if the user has permissions,
        // or we can try to infer from common tables if RPC is not available.
        // However, the best way to see ALL tables without a custom RPC is to check the types or meta if available.
        // Since I don't have direct SQL access here, I will try to fetch from some known system-wide tables
        // and also some that are likely to exist based on the ERP nature.

        console.log("Iniciando auditoria de tabelas...");

        // Attempting to use a standard Supabase trick to list tables via an RPC if it exists,
        // otherwise we might need to rely on the MasterAdmin data.
        const { data, error } = await supabase.rpc('get_tables');

        if (error) {
            console.log("RPC 'get_tables' não encontrado. Tentando via metadados.");
            // Fallback: list known critical tables to verify connection
            const criticalTables = ['profiles', 'tenants', 'saas_plans', 'audit_logs', 'financeiro_transacoes'];
            for (const table of criticalTables) {
                const { count, error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
                if (tableError) {
                    console.error(`Erro ao acessar tabela ${table}:`, tableError.message);
                } else {
                    console.log(`Tabela ${table} acessível. Total de linhas: ${count}`);
                }
            }
        } else {
            console.log("Tabelas encontradas:", data);
        }
    } catch (err) {
        console.error("Erro fatal na auditoria:", err);
    }
}

listTables();
