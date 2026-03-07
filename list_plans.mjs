
import fs from 'fs';

const envContent = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

async function listPlans() {
  const res = await fetch(`${URL}/rest/v1/saas_plans?select=*`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const data = await res.json();
  console.log('--- Planos do Sistema ---');
  if (data.error) {
    console.error('Erro ao buscar planos:', data.error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

listPlans();
