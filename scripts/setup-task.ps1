# Amazing Corporation ERP PRO — Configurar Tarefa de Backup no Windows
# Execute este script como Administrador (PowerShell)
#
# O que este script faz:
#   - Regista uma tarefa agendada no Windows Task Scheduler
#   - A tarefa corre todos os dias às 02:00
#   - Executa o script de backup Node.js

$ProjectDir = Split-Path -Parent $PSScriptRoot
$ScriptPath = Join-Path $ProjectDir "scripts\backup.cjs"
$NodePath   = (Get-Command node -ErrorAction SilentlyContinue)?.Source

if (-not $NodePath) {
    Write-Host "❌ Node.js não encontrado. Instala Node.js primeiro: https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ Script de backup não encontrado: $ScriptPath" -ForegroundColor Red
    exit 1
}

$TaskName   = "AmazingERP_AutoBackup"
$TaskDescr  = "Backup automático diário do Amazing Corporation ERP PRO"
$Action     = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ScriptPath`"" -WorkingDirectory $ProjectDir
$Trigger    = New-ScheduledTaskTrigger -Daily -At "02:00AM"
$Settings   = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -WakeToRun

# Remover tarefa existente (se houver)
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Registar nova tarefa
Register-ScheduledTask `
    -TaskName    $TaskName `
    -Description $TaskDescr `
    -Action      $Action `
    -Trigger     $Trigger `
    -Settings    $Settings `
    -RunLevel    Highest `
    -Force

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Write-Host ""
    Write-Host "✅ Tarefa agendada criada com sucesso!" -ForegroundColor Green
    Write-Host "   Nome    : $TaskName" -ForegroundColor Cyan
    Write-Host "   Script  : $ScriptPath" -ForegroundColor Cyan
    Write-Host "   Horário : Todos os dias às 02:00" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para executar manualmente agora:" -ForegroundColor Yellow
    Write-Host "   node `"$ScriptPath`"" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Falha ao criar a tarefa. Verifica as permissões de administrador." -ForegroundColor Red
    exit 1
}
