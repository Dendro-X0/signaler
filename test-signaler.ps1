Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Signaler Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Check if command exists
Write-Host "`n[Test 1] Checking if signaler command exists..." -ForegroundColor Yellow
$signalerPath = where.exe signaler 2>$null
if ($signalerPath) {
    Write-Host "  ✓ Found at: $signalerPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ Not found in PATH" -ForegroundColor Red
}

# Test 2: Check Node.js
Write-Host "`n[Test 2] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
}

# Test 3: Check npm prefix
Write-Host "`n[Test 3] Checking npm prefix..." -ForegroundColor Yellow
$npmPrefix = npm config get prefix
Write-Host "  npm prefix: $npmPrefix" -ForegroundColor Gray
if ($npmPrefix -like "*bun*") {
    Write-Host "  ✗ WARNING: npm prefix points to Bun!" -ForegroundColor Red
} else {
    Write-Host "  ✓ npm prefix looks correct" -ForegroundColor Green
}

# Test 4: Check for Bun remnants
Write-Host "`n[Test 4] Checking for Bun remnants..." -ForegroundColor Yellow
$bunDirs = @(
    "$env:USERPROFILE\.bun",
    "$env:LOCALAPPDATA\bun",
    "$env:APPDATA\bun"
)
$bunFound = $false
foreach ($dir in $bunDirs) {
    if (Test-Path $dir) {
        Write-Host "  ✗ Found Bun directory: $dir" -ForegroundColor Red
        $bunFound = $true
    }
}
if (-not $bunFound) {
    Write-Host "  ✓ No Bun directories found" -ForegroundColor Green
}

# Test 5: Check global node_modules
Write-Host "`n[Test 5] Checking global node_modules..." -ForegroundColor Yellow
$globalModules = "$env:APPDATA\npm\node_modules"
if (Test-Path "$globalModules\@signaler") {
    Write-Host "  ✓ Found @signaler in global node_modules" -ForegroundColor Green
    $cliPath = "$globalModules\@signaler\cli"
    if (Test-Path $cliPath) {
        Write-Host "  ✓ Found @signaler/cli" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ @signaler not found in global node_modules" -ForegroundColor Red
}

# Test 6: Try running signaler
Write-Host "`n[Test 6] Testing signaler command..." -ForegroundColor Yellow
$signalerTest = signaler --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Signaler works: $signalerTest" -ForegroundColor Green
} else {
    Write-Host "  ✗ Signaler failed with error:" -ForegroundColor Red
    Write-Host "  $signalerTest" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnosis Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($bunFound) {
    Write-Host "`nRecommendation: Run cleanup-and-reinstall.ps1 to remove Bun remnants" -ForegroundColor Yellow
} elseif (-not $signalerPath) {
    Write-Host "`nRecommendation: Install signaler with: npm install -g jsr:@signaler/cli" -ForegroundColor Yellow
} elseif ($LASTEXITCODE -ne 0) {
    Write-Host "`nRecommendation: Reinstall signaler with: npm uninstall -g @signaler/cli && npm install -g jsr:@signaler/cli" -ForegroundColor Yellow
} else {
    Write-Host "`n✓ Everything looks good!" -ForegroundColor Green
}
