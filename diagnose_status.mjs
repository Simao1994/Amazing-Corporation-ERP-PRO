
import { createClient } from '@supabase/supabase-js';
import process from 'process';
import fs from 'fs';
import path from 'path';

function getEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) env[key.trim()] = val.join('=').trim();
    });
    return env;
}

const env = getEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Sessão encontrada:', !!session);
    
    // Tentar chamar a função via RPC se ela existir
    const { data: tenantId, error: tenantError } = await supabase.rpc('get_auth_tenant');
    if (tenantError) {
        console.log('Erro ao chamar get_auth_tenant:', tenantError.message);
    } else {
        console.log('Tenant ID atual:', tenantId);
    }

    const { data: isMaster, error: masterError } = await supabase.rpc('is_master_admin');
     if (masterError) {
        console.log('Erro ao chamar is_master_admin:', masterError.message);
    } else {
        console.log('É Master Admin:', isMaster);
    }

    process.exit(0);
}

diagnose();
