import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jgktemwegesmmomlftgt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    // 1. Try to fetch the specific user email without auth (might fail if RLS)
    const { data: pData, error: pErr } = await supabase.from('profiles').select('*').eq('email', 'simaopambo94@gmail.com');
    console.log("Profile direct query (anon):", pData, pErr?.message);

    // 2. Can we call execute_sql? No, it's missing. What about any other public RPC?
    const { data: rpcList } = await supabase.rpc('get_service_status').catch(() => ({}));
    console.log("RPC get_service_status check:", rpcList ? "Exists" : "Doesn't exist");
}

inspect();
