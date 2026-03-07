
import fs from 'fs';

const envContent = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

async function checkDefaults() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const data = await res.json();
  const tables = data.definitions;
  
  console.log('--- Database Audit: tenant_id Defaults ---');
  for (const tableName in tables) {
    const props = tables[tableName].properties;
    if (props.tenant_id) {
      console.log(`Table: ${tableName}, tenant_id default:`, props.tenant_id.default || 'NONE');
    }
  }
}

checkDefaults();
