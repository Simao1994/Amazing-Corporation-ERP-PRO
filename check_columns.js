import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = "https://jgktemwegesmmomlftgt.supabase.co";
const VITE_SUPABASE_ANON_KEY = "sb_publishable_F5-zlkEnvWGGW4ue7XoW0g_rgNU65UZ";

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function check() {
    try {
        const { data, error } = await supabase.from('hr_presencas').select('*').limit(1);
        if (error) {
            console.error('Erro:', error);
        } else {
            console.log('COLUMNS:', Object.keys(data[0] || {}));
        }
    } catch (e) {
        console.error('Catch error:', e);
    }
}

check();
