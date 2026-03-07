import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgktemwegesmmomlftgt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3RlbXdlZ2VzbW1vbWxmdGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTA3MDMsImV4cCI6MjA4NTA4NjcwM30.S-7zb_KzmcGvblslEv32KD-y2hSUbNYJNxkRRJHiy3c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDBHealth() {
    console.log('\n🏥 A verificar saude da base de dados...');
    const tables = ['profiles', 'funcionarios', 'galeria', 'config_sistema', 'empresas'];
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`  ERRO ${table}: ${error.message} (${error.code})`);
            } else {
                console.log(`  OK ${table}: ${count ?? 0} registos`);
            }
        } catch (err) {
            console.log(`  FALHA ${table}: ${err.message}`);
        }
    }
}

async function cleanupGaleria() {
    console.log('\nA apagar ficheiros da galeria no Storage...');

    const foldersToClean = ['galeria', 'videos'];
    let totalDeleted = 0;

    for (const folder of foldersToClean) {
        try {
            const { data: files, error: listError } = await supabase.storage
                .from('blog-media')
                .list(folder, { limit: 1000 });

            if (listError) {
                console.log(`Erro ao listar ${folder}: ${listError.message}`);
                continue;
            }

            if (!files || files.length === 0) {
                console.log(`Pasta '${folder}' esta vazia.`);
                continue;
            }

            console.log(`Pasta '${folder}': ${files.length} ficheiro(s) encontrado(s).`);

            const filePaths = files.map(f => `${folder}/${f.name}`);
            const { error: deleteError } = await supabase.storage
                .from('blog-media')
                .remove(filePaths);

            if (deleteError) {
                console.log(`Erro ao apagar '${folder}': ${deleteError.message}`);
            } else {
                console.log(`APAGADO: ${files.length} ficheiro(s) de '${folder}'.`);
                totalDeleted += files.length;
            }
        } catch (err) {
            console.log(`Erro inesperado ${folder}: ${err.message}`);
        }
    }

    // Limpar registos da tabela galeria
    console.log('\nA apagar registos da tabela galeria...');
    try {
        const { count, error: fetchErr } = await supabase.from('galeria').select('*', { count: 'exact', head: true });
        if (fetchErr) throw fetchErr;

        if (!count || count === 0) {
            console.log('Tabela galeria ja esta vazia.');
        } else {
            const { error: delErr } = await supabase.from('galeria').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (delErr) throw delErr;
            console.log(`APAGADO: ${count} registo(s) da tabela galeria.`);
        }
    } catch (err) {
        console.log(`Erro ao apagar registos: ${err.message}`);
    }

    console.log(`\nLimpeza concluida. Ficheiros de storage apagados: ${totalDeleted}`);
}

(async () => {
    try {
        console.log('A testar conexao...');
        const { error } = await supabase.from('galeria').select('count', { count: 'exact', head: true });
        if (error) {
            console.log('ERRO DE CONEXAO:', error.message, 'codigo:', error.code);
        } else {
            console.log('CONEXAO OK');
        }
    } catch (e) {
        console.log('FALHA TOTAL:', e.message);
    }

    await checkDBHealth();
    await cleanupGaleria();
})();
