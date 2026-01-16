#!/usr/bin/env pwsh
# Real Issue Diagnostic - Find the actual problem

Write-Host "=== Signaler Installation Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# 1. Find all signaler executables
Write-Host "1. All signaler executables:" -ForegroundColor Yellow
$signalers = where.exe signaler 2>$null
if ($signalers) {
    for ($i = 0; $i -lt $signalers.Count; $i++) {
        $path = $signalers[$i]
        if ($i -eq 0) {
            Write-Host "  → $path (EXECUTED FIRST)" -ForegroundColor Red
        } else {
            Write-Host "    $path" -ForegroundColor Gray
        }
        
        # Check file details
        if (Test-Path $path) {
            $item = Get-Item $path
            Write-Host "    Size: $([math]::Round($item.Length / 1MB, 2)) MB" -ForegroundColor Gray
            Write-Host "    Created: $($item.CreationTime)" -ForegroundColor Gray
            Write-Host "    Modified: $($item.LastWriteTime)" -ForegroundColor Gray
        }
        Write-Host ""
    }
} else {
    Write-Host "  No signaler found in PATH" -ForegroundColor Gray
}

# 2. Check the 133MB executable
Write-Host "2. Checking the 133MB Bun executable:" -ForegroundColor Yellow
$bunExe = "C:\Users\Administrator\AppData\Local\Programs\signaler\signaler.exe"
if (Test-Path $bunExe) {
    Write-Host "  ⚠ FOUND: $bunExe" -ForegroundColor Red
    $item = Get-Item $bunExe
    Write-Host "    Size: $([math]::Round($item.Length / 1MB, 2)) MB" -ForegroundColor Red
    Write-Host "    Created: $($item.CreationTime)" -ForegroundColor Red
    Write-Host "    This is the Bun-compiled executable from January 14!" -ForegroundColor Red
} else {
    Write-Host "  ✓ Not found (good)" -ForegroundColor Green
}
Write-Host ""

# 3. Check PATH order
Write-Host "3. PATH entries (in order):" -ForegroundColor Yellow
$pathEntries = $env:PATH -split ';'
$signalerPaths = $pathEntries | Where-Object { $_ -like "*signaler*" -or $_ -like "*Programs*" -or $_ -like "*AppData\Local*" }
if ($signalerPaths) {
    foreach ($p in $signalerPaths) {
        Write-Host "  $p" -ForegroundColor Cyan
    }
} else {
    Write-Host "  No signaler-related paths found" -ForegroundColor Gray
}
Write-Host ""

# 4. Test execution
Write-Host "4. Testing which version gets executed:" -ForegroundColor Yellow
try {
    $output = & signaler --version 2>&1 | Select-Object -First 3
    if ($output -match "BUN|B:\\|locales") {
        Write-Host "  ✗ Bun executable is being executed!" -ForegroundColor Red
    } else {
        Write-Host "  ✓ Correct version is being executed" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 5. Solution
Write-Host "=== SOLUTION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The problem is:" -ForegroundColor Yellow
Write-Host "  C:\Users\Administrator\AppData\Local\Programs\signaler\signaler.exe" -ForegroundColor Red
Write-Host "  This is the 133MB Bun-compiled executable from January 14" -ForegroundColor Red
Write-Host ""
Write-Host "To fix:" -ForegroundColor Yellow
Write-Host "  1. Delete the entire directory:" -ForegroundColor White
Write-Host "     Remove-Item 'C:\Users\Administrator\AppData\Local\Programs\signaler' -Recurse -Force" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Remove from PATH (if present):" -ForegroundColor White
Write-Host "     Open System Properties → Environment Variables" -ForegroundColor Gray
Write-Host "     Remove any entries containing 'Programs\signaler'" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Restart your terminal" -ForegroundColor White
Write-Host ""
Write-Host "  4. Verify:" -ForegroundColor White
Write-Host "     where.exe signaler" -ForegroundColor Gray
Write-Host "     (Should only show the JSR version)" -ForegroundColor Gray
