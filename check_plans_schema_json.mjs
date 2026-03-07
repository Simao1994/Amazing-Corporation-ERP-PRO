
import fs from 'fs';

const envContent = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

async function checkPlansSchema() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const data = await res.json();
  if (data.definitions && data.definitions.saas_plans) {
    console.log('saas_plans Schema Properties:', JSON.stringify(data.definitions.saas_plans.properties, null, 2));
  } else {
    console.log('Could not find saas_plans definition.');
  }
}

checkPlansSchema();
