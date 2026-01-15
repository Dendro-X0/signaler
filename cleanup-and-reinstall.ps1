# Complete Cleanup and Reinstall Script for Signaler
# This removes all Bun-installed files and reinstalls with Node.js

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Signaler Cleanup and Reinstall Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove Bun directories
Write-Host "[1/6] Removing Bun directories..." -ForegroundColor Yellow
$bunDirs = @(
    "$env:USERPROFILE\.bun",
    "$env:LOCALAPPDATA\bun",
    "$env:APPDATA\bun"
)

foreach ($dir in $bunDirs) {
    if (Test-Path $dir) {
        Write-Host "  Removing: $dir" -ForegroundColor Gray
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
    }
}
Write-Host "  ✓ Bun directories removed" -ForegroundColor Green
Write-Host ""

# Step 2: Uninstall old signaler
Write-Host "[2/6] Uninstalling old signaler installations..." -ForegroundColor Yellow
npm uninstall -g @signaler/signaler 2>$null
npm uninstall -g signaler 2>$null
Write-Host "  ✓ Old installations removed" -ForegroundColor Green
Write-Host ""

# Step 3: Clear caches
Write-Host "[3/6] Clearing package manager caches..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "  ✓ Caches cleared" -ForegroundColor Green
Write-Host ""

# Step 4: Verify Node.js
Write-Host "[4/6] Verifying Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  ✓ Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found! Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Install fresh with Node.js
Write-Host "[5/6] Installing Signaler with Node.js..." -ForegroundColor Yellow
npm install -g jsr:@signaler/signaler
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Signaler installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Installation failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Test installation
Write-Host "[6/6] Testing installation..." -ForegroundColor Yellow
$signalerVersion = signaler --version 2>$null
if ($signalerVersion) {
    Write-Host "  ✓ Signaler version: $signalerVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Signaler command not found" -ForegroundColor Red
    Write-Host "  Try restarting PowerShell and running: signaler --version" -ForegroundColor Yellow
}
Write-Host ""

# Done
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup and reinstall complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart PowerShell (to refresh PATH)" -ForegroundColor White
Write-Host "  2. Run: signaler wizard" -ForegroundColor White
Write-Host "  3. If still having issues, see COMPLETE-CLEANUP-GUIDE.md" -ForegroundColor White
Write-Host ""
