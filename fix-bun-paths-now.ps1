# Quick Fix for Bun Path Issues
# This completely removes and reinstalls signaler

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Fix: Remove Bun Paths" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Uninstall current installation
Write-Host "[1/5] Uninstalling current signaler..." -ForegroundColor Yellow
npm uninstall -g @signaler/cli 2>$null
npm uninstall -g @signaler/signaler 2>$null
npm uninstall -g signaler 2>$null
Write-Host "  ✓ Uninstalled" -ForegroundColor Green
Write-Host ""

# Step 2: Remove Bun directories
Write-Host "[2/5] Removing Bun directories..." -ForegroundColor Yellow
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

# Step 3: Clear npm cache
Write-Host "[3/5] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "  ✓ Cache cleared" -ForegroundColor Green
Write-Host ""

# Step 4: Verify npm prefix
Write-Host "[4/5] Verifying npm configuration..." -ForegroundColor Yellow
$npmPrefix = npm config get prefix
Write-Host "  npm prefix: $npmPrefix" -ForegroundColor Gray
if ($npmPrefix -like "*bun*") {
    Write-Host "  ✗ WARNING: npm prefix points to Bun! Fixing..." -ForegroundColor Red
    npm config set prefix "$env:APPDATA\npm"
    Write-Host "  ✓ Fixed npm prefix" -ForegroundColor Green
} else {
    Write-Host "  ✓ npm prefix is correct" -ForegroundColor Green
}
Write-Host ""

# Step 5: Fresh install
Write-Host "[5/5] Installing fresh with Node.js..." -ForegroundColor Yellow
npm install -g jsr:@signaler/cli
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Installation failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual installation:" -ForegroundColor Yellow
    Write-Host "  npm install -g jsr:@signaler/cli" -ForegroundColor White
    exit 1
}
Write-Host ""

# Test
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$version = signaler --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ SUCCESS! Signaler is working" -ForegroundColor Green
    Write-Host "  Version: $version" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Close and reopen your IDE terminal" -ForegroundColor White
    Write-Host "  2. Run: signaler wizard" -ForegroundColor White
} else {
    Write-Host "✗ Still having issues" -ForegroundColor Red
    Write-Host ""
    Write-Host "The error was:" -ForegroundColor Yellow
    Write-Host "  $version" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try local installation instead:" -ForegroundColor Yellow
    Write-Host "  cd your-project" -ForegroundColor White
    Write-Host "  npm install jsr:@signaler/cli" -ForegroundColor White
    Write-Host "  npx signaler wizard" -ForegroundColor White
}
Write-Host ""
