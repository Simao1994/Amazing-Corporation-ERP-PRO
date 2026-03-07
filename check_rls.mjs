
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jgktemwegesmmomlftgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c'
);

async function checkRLS() {
  const tables = ['sys_fornecedores', 'inventario', 'stock_movimentos'];
  for (const table of tables) {
    console.log(`--- RLS Check: ${table} ---`);
    const { data: policies, error } = await supabase.rpc('get_policies', { table_name: table });
    if (error) {
       // If RPC fails, try a direct query that would fail if RLS is strict
       console.log(`RPC Error for ${table}: ${error.message}. Testing basic access...`);
       const { data, error: selectError } = await supabase.from(table).select('*').limit(1);
       if (selectError) console.log(`Select Error: ${selectError.message}`);
       else console.log(`Select Success (RLS might be disabled or permissive)`);
    } else {
       console.log(`Policies for ${table}:`, policies);
    }
  }
}

checkRLS();
