
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

async function checkPolicies() {
    // Tentar ler da tabela system se disponível, senão, usar o conhecimento dos ficheiros.
    // Como anon não conseguimos ler pg_policies.
    // Vamos tentar inserir em empresas e ver o feedback detalhado se falhar.
    
    const { error } = await supabase.from('empresas').insert([{ nome: 'TESTE_POLITICA' }]);
    if (error) {
        console.log('FALHA NA INSERÇÃO:', error.message);
        if (error.message.includes('row-level security policy')) {
            console.log('CONFIRMADO: Bloqueio por RLS.');
        }
    } else {
        console.log('INSERIDO COM SUCESSO!');
    }
    
    process.exit(0);
}

checkPolicies();
