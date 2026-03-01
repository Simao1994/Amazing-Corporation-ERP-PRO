$path = "d:\amazing-corporation-erp-pro\pages\HR.tsx"
$lines = Get-Content $path -Encoding UTF8

$newLines = @()
$skiping = $false

for ($i=0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    
    # Fix the Ponto tab closure and Performance tab start
    if ($line -like "*activeTab ===*presenca*") {
       $newLines += "         {activeTab === 'presenca' && ("
       $newLines += "            <div className=""space-y-8 animate-in slide-in-from-bottom-4"">"
       continue
    }

    # If we catch a rogue closure followed by div start
    if ($line -match "^\s+\)\}\s*$" -and $i+2 -lt $lines.Length -and $lines[$i+2] -match "^\s+<div className=""space-y-6") {
       $newLines += "         )}"
       $newLines += ""
       $newLines += "         {activeTab === 'performance' && ("
       continue
    }

    $newLines += $line
}

$newLines | Out-File $path -Encoding UTF8
