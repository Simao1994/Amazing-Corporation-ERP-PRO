
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

async function checkEmpresas() {
    // Tentar ler todas as empresas (como anon, vai bater no RLS se existir)
    // Mas vamos tentar ver se conseguimos alguma info
    const { data, error } = await supabase.from('empresas').select('id, nome, tenant_id');
    if (error) {
        console.error('Erro ao ler empresas:', error.message);
    } else {
        console.log(`Encontradas ${data.length} empresas via API:`, data);
    }
    process.exit(0);
}

checkEmpresas();
