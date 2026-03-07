
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jgktemwegesmmomlftgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c'
);

const tables = [
  'expr_fleet',
  'agro_agricultores',
  'real_imoveis',
  'arena_tournaments',
  'fin_notas',
  'sys_ads',
  'blog_posts',
  'rh_vagas'
];

async function check() {
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('tenant_id').limit(1);
    if (error) console.log(`${table}: ${error.message}`);
    else console.log(`${table}: Has tenant_id`);
  }
}
check();
