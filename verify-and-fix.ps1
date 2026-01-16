#!/usr/bin/env pwsh
# Verify the fix and reinstall if needed

Write-Host "=== Verification and Fix ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check what's in PATH
Write-Host "1. Checking signaler in PATH:" -ForegroundColor Yellow
$signalers = where.exe signaler 2>$null
if ($signalers) {
    Write-Host "  ✓ Found: $signalers" -ForegroundColor Green
    
    # Test if it works
    Write-Host ""
    Write-Host "2. Testing execution:" -ForegroundColor Yellow
    try {
        $output = & signaler --version 2>&1 | Select-Object -First 5
        if ($output -match "BUN|B:\\|locales") {
            Write-Host "  ✗ Still getting Bun errors!" -ForegroundColor Red
            Write-Host "  This shouldn't happen. The old executable was deleted." -ForegroundColor Red
        } else {
            Write-Host "  ✓ Working correctly!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Output:" -ForegroundColor Gray
            $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ Not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "The JSR installation might not be complete." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Let's reinstall from JSR:" -ForegroundColor Yellow
    Write-Host ""
    
    # Reinstall
    Write-Host "Running: npx jsr add -g @signaler/cli" -ForegroundColor Cyan
    try {
        npx jsr add -g @signaler/cli
        Write-Host ""
        Write-Host "✓ Installation complete" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal and run:" -ForegroundColor Yellow
        Write-Host "  signaler --version" -ForegroundColor White
    } catch {
        Write-Host "✗ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Run directly from source" -ForegroundColor Yellow
        Write-Host "  cd signaler" -ForegroundColor White
        Write-Host "  node dist/bin.js wizard" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Old Bun executable: DELETED ✓" -ForegroundColor Green
Write-Host "Next step: Restart your terminal and test 'signaler --version'" -ForegroundColor White
