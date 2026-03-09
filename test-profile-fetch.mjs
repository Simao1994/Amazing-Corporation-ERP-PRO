import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jgktemwegesmmomlftgt.supabase.co';
// Use the service role key if we can't login, OR we can login as Master Admin since we know his email and password might be "simao123" or something. Wait, we don't have his password.
// Let's use anon key and a known session JWT if we had one.
// Since we don't, let's use the service_role key to bypass RLS just to see if the user profile exists!
// Actually, I don't have the service_role key.
// Let's check saas_tenants directly.

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking if we can read profiles without RLS bypassing...");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, tenant_id, role').eq('email', 'simaopambo94@gmail.com');
    console.log("Profiles query result:", profiles, pErr);
}

check();
