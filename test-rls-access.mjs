import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jgktemwegesmmomlftgt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Testing connection...");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles access:", pErr ? pErr.message : "Success");

    const { data: saas, error: sErr } = await supabase.from('saas_tenants').select('*').limit(1);
    console.log("Tenant access:", sErr ? sErr.message : "Success");

    const { data: pos, error: posErr } = await supabase.from('pos_produtos').select('*').limit(1);
    console.log("POS access:", posErr ? posErr.message : "Success");
}

check();
