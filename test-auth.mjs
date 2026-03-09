import { createClient } from '@supabase/supabase-js';
import http from 'http';

const server = http.createServer((req, res) => {
    // Simulate an SPA server returning index.html for unknown routes (like /sbapi)
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!DOCTYPE html><html><body><h1>Fake SPA Proxy</h1></body></html>');
});

server.listen(14200, async () => {
    console.log("Fake server running on 14200");
    const supabase = createClient('http://localhost:14200', 'dummy-key', {
        auth: { persistSession: false }
    });

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@example.com',
            password: 'wrongpassword'
        });
        console.log("SignIn Result:", { data, error });
    } catch (err) {
        console.error("SignIn Threw Exception:", err.message || err);
    }

    server.close();
});
