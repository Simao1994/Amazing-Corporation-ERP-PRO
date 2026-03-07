
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jgktemwegesmmomlftgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c'
);

const tables = [
  'sys_fornecedores',
  'inventario',
  'stock_movimentos',
  'sys_clientes',
  'financeiro_entradas',
  'financeiro_saidas',
  'hr_funcionarios',
  'manutencao_ordens',
  'transporte_viagens',
  'agro_colheitas',
  'real_estate_propriedades'
];

async function checkTables() {
  console.log('--- Multi-Tenancy Audit ---');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('tenant_id').limit(1);
      if (error) {
        if (error.message.includes('column "tenant_id" does not exist')) {
          console.log(`❌ ${table}: Lacks tenant_id column`);
        } else if (error.message.includes('relation "public.' + table + '" does not exist')) {
          console.log(`⚪ ${table}: Table does not exist`);
        } else {
          console.log(`❓ ${table}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: Has tenant_id`);
      }
    } catch (err) {
      console.log(`💥 ${table}: Unexpected error`);
    }
  }
}

checkTables();
