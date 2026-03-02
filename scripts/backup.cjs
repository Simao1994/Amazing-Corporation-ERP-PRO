#!/usr/bin/env node
/**
 * Amazing Corporation ERP PRO — Sistema de Backup Automático
 * 
 * Funcionalidades:
 *  - Exporta todas as tabelas do Supabase como JSON
 *  - Comprime os ficheiros do projecto (excl. node_modules, .git, dist, backup-logs)
 *  - Guarda o .zip no local configurado pelo administrador
 *  - Mantém histórico de N dias (padrão: 7), apagando backups mais antigos
 *  - Gera logs em backup-logs/backup_YYYY-MM-DD.log
 * 
 * Execução:
 *   node scripts/backup.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// ─── Paths ───────────────────────────────────────────────────────────────────
const PROJECT_DIR = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_DIR, 'backup-config.json');
const LOG_DIR = path.join(PROJECT_DIR, 'backup-logs');
const ENV_FILE = path.join(PROJECT_DIR, '.env.local');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function dateStr() {
    return new Date().toISOString().slice(0, 10);
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(logFile, level, message) {
    const line = `[${new Date().toISOString()}] [${level}] ${message}`;
    console.log(line);
    fs.appendFileSync(logFile, line + '\n', 'utf8');
}

// ─── Parse .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
    if (!fs.existsSync(ENV_FILE)) {
        throw new Error('.env.local não encontrado. Verifique o directório do projecto.');
    }
    const env = {};
    fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) env[key.trim()] = rest.join('=').trim();
    });
    return env;
}

// ─── Load Config ─────────────────────────────────────────────────────────────
function loadConfig() {
    const defaults = { destPath: '', retentionDays: 7 };
    if (!fs.existsSync(CONFIG_FILE)) return defaults;
    try {
        return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch {
        return defaults;
    }
}

function updateConfig(patch) {
    const current = loadConfig();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...patch }, null, 2), 'utf8');
}

// ─── HTTP Fetch (sem dependências externas) ──────────────────────────────────
function httpGet(url, headers) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { headers }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                } else {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve(data); }
                }
            });
        });
        req.on('error', reject);
    });
}

// ─── Listar Tabelas do Supabase ───────────────────────────────────────────────
async function listTables(supabaseUrl, anonKey) {
    // Como a introspecção via root /rest/v1/ costuma ser proibida pelo anon key,
    // usamos uma lista fixa de tabelas detectadas no sistema.
    return [
        'acc_audit_logs', 'acc_auditoria', 'acc_categorias', 'acc_centros_custo', 'acc_config',
        'acc_contactos', 'acc_contas', 'acc_documentos', 'acc_documentos_registro',
        'acc_eliminacoes_intercompany', 'acc_empresas', 'acc_extratos_bancarios', 'acc_folhas',
        'acc_lancamento_itens', 'acc_lancamentos', 'acc_ledger_immutable', 'acc_logs',
        'acc_obrigacoes', 'acc_periodos', 'acc_regras_automaticas', 'acc_regras_integracao',
        'acc_report_cache', 'acc_system_logs', 'acc_tipos_documento', 'acc_tipos_documentos',
        'agro_agricultores', 'agro_financiamentos', 'agro_producao', 'agro_visitas', 'app_roles',
        'arena_expenses', 'arena_games', 'arena_pagamentos', 'arena_payments', 'arena_players',
        'arena_ranking', 'arena_reservas', 'arena_tournaments', 'audit_logs', 'biblioteca_categorias',
        'biblioteca_emprestimos', 'biblioteca_materiais', 'biblioteca_reservas', 'blog_posts',
        'candidaturas', 'categorias_documentos', 'compras', 'config_sistema', 'contabil_faturas',
        'contratos', 'departamentos', 'documentos', 'empresas', 'erp_data', 'expr_fleet',
        'feed_likes', 'feed_posts', 'fin_notas', 'fin_transacoes', 'funcionarios', 'galeria',
        'galeria_albuns', 'galeria_arquivo_tags', 'galeria_arquivos', 'galeria_tags', 'hr_metas',
        'hr_presencas', 'hr_recibos', 'imoveis', 'inventario', 'manutencao', 'newsletter_subscribers',
        'parceiros', 'profiles', 'real_contratos', 'real_imoveis', 'real_obras', 'recr_candidaturas',
        'rh_candidaturas', 'rh_contas_bancarias', 'rh_recibos', 'rh_vagas', 'security_attempts',
        'solicitacoes', 'stock_movimentos', 'sys_ads', 'sys_fornecedores', 'sys_logs',
        'sys_parceiros', 'tesouraria_caixa', 'testemunhos', 'transacoes', 'veiculos', 'viagens'
    ];
}

// ─── Exportar Tabela ──────────────────────────────────────────────────────────
async function exportTable(supabaseUrl, anonKey, table) {
    try {
        const data = await httpGet(
            `${supabaseUrl}/rest/v1/${table}?select=*`,
            {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
                'Accept': 'application/json',
                'Prefer': 'count=none',
                'Range-Unit': 'items',
                'Range': '0-9999',
            }
        );
        return Array.isArray(data) ? data : [];
    } catch (err) {
        return { _error: err.message };
    }
}

// ─── Compressão ZIP (via PowerShell no Windows) ───────────────────────────────
function compressToZip(sourceDir, zipPath, excludes) {
    // Cria um directório temporário com os ficheiros a incluir
    const tempDir = path.join(PROJECT_DIR, `.backup_temp_${Date.now()}`);
    ensureDir(tempDir);

    try {
        // Usa Robocopy para copiar ficheiros (excluindo pastas indesejadas)
        const excludeArgs = excludes.map(e => `"${e}"`).join(' ');
        const robocopyCmd = `robocopy "${sourceDir}" "${tempDir}" /E /MIR /XD ${excludeArgs} /NFL /NDL /NJH /NJS`;

        try {
            execSync(robocopyCmd, { stdio: 'pipe' });
        } catch (e) {
            // Robocopy retorna exit codes não-zero mesmo em sucesso; ignorar se os ficheiros foram copiados
            if (!fs.existsSync(tempDir) || fs.readdirSync(tempDir).length === 0) {
                throw e;
            }
        }

        // Comprimir com PowerShell Compress-Archive
        const psCmd = `powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`;
        execSync(psCmd, { stdio: 'pipe' });
    } finally {
        // Limpar directório temporário
        try {
            execSync(`rmdir /S /Q "${tempDir}"`, { stdio: 'pipe', shell: 'cmd.exe' });
        } catch { }
    }
}

// ─── Limpeza de Backups Antigos ───────────────────────────────────────────────
function pruneOldBackups(destPath, retentionDays) {
    if (!fs.existsSync(destPath)) return 0;
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    fs.readdirSync(destPath).forEach(file => {
        if (!file.startsWith('amazing_backup_') || !file.endsWith('.zip')) return;
        const filePath = path.join(destPath, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            removed++;
        }
    });
    return removed;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    ensureDir(LOG_DIR);
    const logFile = path.join(LOG_DIR, `backup_${dateStr()}.log`);

    log(logFile, 'INFO', '=== Início do Backup Amazing Corporation ERP PRO ===');

    let config, env;
    try {
        config = loadConfig();
        env = loadEnv();
    } catch (err) {
        log(logFile, 'ERROR', `Erro ao carregar configuração: ${err.message}`);
        updateConfig({ lastStatus: 'error', lastBackup: new Date().toISOString(), lastError: err.message });
        process.exit(1);
    }

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const anonKey = env['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !anonKey) {
        log(logFile, 'ERROR', 'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos no .env.local');
        updateConfig({ lastStatus: 'error', lastBackup: new Date().toISOString(), lastError: 'Variáveis de ambiente em falta' });
        process.exit(1);
    }

    const destPath = config.destPath;
    if (!destPath) {
        log(logFile, 'ERROR', 'destPath não configurado em backup-config.json. Configure o caminho de destino na UI de Configurações.');
        updateConfig({ lastStatus: 'error', lastBackup: new Date().toISOString(), lastError: 'Caminho de destino não configurado' });
        process.exit(1);
    }

    ensureDir(destPath);

    const zipName = `amazing_backup_${timestamp()}.zip`;
    const zipPath = path.join(destPath, zipName);
    const ts = timestamp();
    const dataDir = path.join(PROJECT_DIR, `.backup_data_${ts}`);

    try {
        // 1. Exportar base de dados
        log(logFile, 'INFO', 'A exportar dados da base de dados (Supabase)...');
        ensureDir(dataDir);

        const tables = await listTables(supabaseUrl, anonKey);
        log(logFile, 'INFO', `Encontradas ${tables.length} tabelas: ${tables.join(', ')}`);

        const dbDump = { exportedAt: new Date().toISOString(), tables: {} };
        for (const table of tables) {
            log(logFile, 'INFO', `  → Exportando tabela: ${table}`);
            dbDump.tables[table] = await exportTable(supabaseUrl, anonKey, table);
        }

        const dbFile = path.join(dataDir, 'database.json');
        fs.writeFileSync(dbFile, JSON.stringify(dbDump, null, 2), 'utf8');
        log(logFile, 'INFO', `Base de dados exportada: ${dbFile}`);

        // 2. Comprimir ficheiros do projecto + dados exportados
        log(logFile, 'INFO', 'A comprimir ficheiros do projecto...');

        // Comprimir DB dump separadamente primeiro
        const dbZip = path.join(destPath, `amazing_db_${timestamp()}.zip`);
        const psDbCmd = `powershell -Command "Compress-Archive -Path '${dataDir}\\*' -DestinationPath '${zipPath}' -Force"`;
        execSync(psDbCmd, { stdio: 'pipe' });

        // Adicionar ficheiros do projecto (sem node_modules, .git, dist, backup-logs, backup-config)
        const excludes = ['node_modules', '.git', 'dist', 'backup-logs', '.backup_data_*', '.backup_temp_*'];
        const psProjectCmd = [
            `$source = '${PROJECT_DIR}'`,
            `$dest   = '${zipPath}'`,
            `$excl   = @('node_modules','.git','dist','backup-logs','backup-config.json','package-lock.json')`,
            `$items  = Get-ChildItem -Path $source -Force | Where-Object { $excl -notcontains $_.Name }`,
            `Compress-Archive -Path ($items | Select-Object -ExpandProperty FullName) -DestinationPath $dest -Update`,
        ].join('; ');
        execSync(`powershell -Command "${psProjectCmd}"`, { stdio: 'pipe' });

        log(logFile, 'INFO', `Backup criado: ${zipPath}`);

        // 3. Limpeza de backups antigos
        const removed = pruneOldBackups(destPath, config.retentionDays || 7);
        if (removed > 0) log(logFile, 'INFO', `${removed} backup(s) antigo(s) removido(s).`);

        // 4. Actualizar estado
        updateConfig({
            lastStatus: 'success',
            lastBackup: new Date().toISOString(),
            lastFile: zipName,
            lastError: null,
        });

        log(logFile, 'SUCCESS', `=== Backup concluído com sucesso: ${zipName} ===`);

    } catch (err) {
        log(logFile, 'ERROR', `Erro durante o backup: ${err.message}`);
        updateConfig({
            lastStatus: 'error',
            lastBackup: new Date().toISOString(),
            lastError: err.message,
        });
        process.exit(1);
    } finally {
        // Limpar dados temporários
        try {
            if (fs.existsSync(dataDir)) {
                execSync(`rmdir /S /Q "${dataDir}"`, { stdio: 'pipe', shell: 'cmd.exe' });
            }
        } catch { }
    }
}

main().catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
});
