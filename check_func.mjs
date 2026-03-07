
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

async function checkFunctions() {
    // Tentar executar rpc de sistema ou algo que nos diga o que está lá
    // Geralmente não temos permissão para information_schema.routines via anon key
    // Mas podemos tentar chamar a função e ver o que acontece.
    
    const { data, error } = await supabase.rpc('is_master_admin');
    console.log('Chamar is_master_admin rpc:', data, error ? error.message : 'Sucesso');
    
    process.exit(0);
}

checkFunctions();
