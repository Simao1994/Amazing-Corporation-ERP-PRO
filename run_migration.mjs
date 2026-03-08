import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'MIGRATION_POS_SALES.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Due to the lack of direct multi-statement execution via REST API,
        // we'll split the script by statement blocks where possible or use an RPC if available.
        // However, the best way for anon/service_role keys is often the /rest/v1/rpc endpoint if an execute_sql was defined,
        // but standard supabase-js doesn't expose a direct "run raw sql string" without an RPC.

        // Let's check if the project has the custom RPC `execute_sql` we frequently see:
        const { data, error } = await supabase.rpc('execute_sql', { sql_query: sqlContent });

        if (error) {
            console.error("RPC 'execute_sql' failed:", error.message);

            // Attempting fallback: Check if "master_update_config" or another custom one exists to wrap it, 
            // but usually DDL requires postgres superuser via psql.
            console.error("To apply this migration, you will need to run the SQL file directly in the Supabase Dashboard SQL Editor.");
            process.exit(1);
        }

        console.log("Migration executed successfully via RPC:", data);
    } catch (err) {
        console.error("Error running script:", err);
    }
}

runMigration();
