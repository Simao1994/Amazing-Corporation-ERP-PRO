
import fs from 'fs';

const envContent = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

async function auditSchema() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const data = await res.json();
  const tables = data.definitions;
  
  console.log('--- Database Audit: Missing tenant_id ---');
  const missingTenantId = [];
  const systemTables = ['saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles', 'config_sistema'];
  
  for (const tableName in tables) {
    if (systemTables.includes(tableName)) continue;
    
    const props = tables[tableName].properties;
    if (!props.tenant_id) {
      missingTenantId.push(tableName);
    }
  }
  
  console.log('Tables without tenant_id (Potential Issue):', JSON.stringify(missingTenantId, null, 2));
}

auditSchema();
