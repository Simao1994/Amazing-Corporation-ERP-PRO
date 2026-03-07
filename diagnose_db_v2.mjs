
import fs from 'fs';

const envContent = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

async function diagnoseDB() {
  console.log('--- Deep DB Diagnostic ---');
  
  // 1. Test get_auth_tenant visibility and search path
  const testQuery = `
    SELECT 
      routine_name, 
      external_language, 
      security_type, 
      routine_definition
    FROM information_schema.routines 
    WHERE routine_name = 'get_auth_tenant' 
    AND routine_schema = 'public';
  `;
  
  // Since we can't run arbitrary SQL easily via REST with RPC for info_schema, 
  // we'll try to check if the user can even SELECT from profiles.
  
  const res = await fetch(`${URL}/rest/v1/profiles?select=count`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  console.log('Profiles Access Status:', res.status, res.statusText);
}

diagnoseDB();
