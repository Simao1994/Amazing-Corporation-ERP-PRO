import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jgktemwegesmmomlftgt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Authenticating as simaopambo94@gmail.com...");
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'simaopambo94@gmail.com',
        password: 'password' // We don't have the password.
    });

    // We can't log in due to password, but we can call a Postgres function to dump the trigger definition!
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: `
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'pos_caixa';
        `
    });
    console.log("Triggers pos_caixa:", data || error);
}

check();
