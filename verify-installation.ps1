#!/usr/bin/env pwsh
# Verification script for Signaler CLI installation
# Run this after deleting the old Bun executable and restarting your terminal

Write-Host "`n=== Signaler Installation Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Find signaler in PATH
Write-Host "1. Checking PATH for signaler..." -ForegroundColor Yellow
$signalerPaths = @(where.exe signaler 2>$null)

if ($signalerPaths.Count -eq 0) {
    Write-Host "   ❌ FAIL: signaler not found in PATH" -ForegroundColor Red
    Write-Host "   Solution: Run 'npx jsr add -g @signaler/cli'" -ForegroundColor Gray
    exit 1
} elseif ($signalerPaths.Count -gt 1) {
    Write-Host "   ⚠️  WARNING: Multiple signaler installations found:" -ForegroundColor Yellow
    foreach ($path in $signalerPaths) {
        Write-Host "      - $path" -ForegroundColor Gray
    }
    Write-Host "   This may cause conflicts. Consider removing duplicates." -ForegroundColor Gray
} else {
    Write-Host "   ✅ PASS: Found at $($signalerPaths[0])" -ForegroundColor Green
}

# Check 2: Verify it's the JSR version (not old Bun executable)
Write-Host "`n2. Verifying installation type..." -ForegroundColor Yellow
$firstPath = $signalerPaths[0]

if ($firstPath -like "*Programs\signaler\signaler.exe") {
    Write-Host "   ❌ FAIL: Old Bun executable still in PATH" -ForegroundColor Red
    Write-Host "   Location: $firstPath" -ForegroundColor Gray
    Write-Host "   Solution: Delete 'C:\Users\Administrator\AppData\Local\Programs\signaler\' and restart terminal" -ForegroundColor Gray
    exit 1
} elseif ($firstPath -like "*signaler.cmd" -or $firstPath -like "*signaler.ps1") {
    Write-Host "   ✅ PASS: JSR installation detected" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  WARNING: Unknown installation type" -ForegroundColor Yellow
    Write-Host "   Location: $firstPath" -ForegroundColor Gray
}

# Check 3: Test execution
Write-Host "`n3. Testing execution..." -ForegroundColor Yellow
try {
    $output = & signaler --version 2>&1 | Out-String
    
    if ($output -match "B:\\-\\BUN\\") {
        Write-Host "   ❌ FAIL: Bun error detected in output" -ForegroundColor Red
        Write-Host "   The old Bun executable is still being executed" -ForegroundColor Gray
        Write-Host "   Solution: Restart your terminal or reinstall from JSR" -ForegroundColor Gray
        exit 1
    } else {
        Write-Host "   ✅ PASS: Execution successful" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ FAIL: Execution error" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Gray
    exit 1
}

# Check 4: Verify old installation is gone
Write-Host "`n4. Checking for old Bun executable..." -ForegroundColor Yellow
$oldPath = "C:\Users\Administrator\AppData\Local\Programs\signaler"

if (Test-Path $oldPath) {
    Write-Host "   ❌ FAIL: Old installation still exists" -ForegroundColor Red
    Write-Host "   Location: $oldPath" -ForegroundColor Gray
    Write-Host "   Solution: Delete this directory and restart terminal" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "   ✅ PASS: Old installation removed" -ForegroundColor Green
}

# Summary
Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
Write-Host "✅ All checks passed! Signaler is ready to use." -ForegroundColor Green
Write-Host ""
Write-Host "Try running:" -ForegroundColor Gray
Write-Host "  signaler wizard" -ForegroundColor White
Write-Host ""
