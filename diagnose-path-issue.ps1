# Comprehensive Diagnostic for Signaler PATH Issue
# This will identify exactly what's wrong

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Signaler PATH Issue Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Find ALL signaler commands
Write-Host "[1] Finding all 'signaler' commands in PATH..." -ForegroundColor Yellow
$signalerLocations = where.exe signaler 2>$null
if ($signalerLocations) {
    if ($signalerLocations -is [array]) {
        Write-Host "  Found $($signalerLocations.Count) locations:" -ForegroundColor Red
        for ($i = 0; $i -lt $signalerLocations.Count; $i++) {
            $loc = $signalerLocations[$i]
            Write-Host "    [$($i+1)] $loc" -ForegroundColor Gray
            if ($loc -like "*BUN*") {
                Write-Host "        ^ THIS IS THE PROBLEM!" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  Found 1 location:" -ForegroundColor Green
        Write-Host "    $signalerLocations" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✗ No 'signaler' command found in PATH" -ForegroundColor Red
}
Write-Host ""

# 2. Check B:\ drive
Write-Host "[2] Checking B:\ drive..." -ForegroundColor Yellow
if (Test-Path "B:\") {
    Write-Host "  ✓ B:\ drive exists" -ForegroundColor Green
    
    if (Test-Path "B:\-\BUN") {
        Write-Host "  ✗ B:\-\BUN directory exists (THIS IS THE PROBLEM)" -ForegroundColor Red
        Write-Host "    Contents:" -ForegroundColor Gray
        Get-ChildItem "B:\-\BUN" -Recurse -Filter "signaler*" -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "      $($_.FullName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  B:\-\BUN does not exist" -ForegroundColor Gray
    }
} else {
    Write-Host "  B:\ drive does not exist" -ForegroundColor Gray
    Write-Host "  (B:\-\BUN\root\ might be a virtual/symbolic path)" -ForegroundColor Yellow
}
Write-Host ""

# 3. Check PATH for BUN entries
Write-Host "[3] Checking PATH for BUN entries..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")

$userBunPaths = $userPath -split ';' | Where-Object { $_ -like "*BUN*" }
$systemBunPaths = $systemPath -split ';' | Where-Object { $_ -like "*BUN*" }

if ($userBunPaths) {
    Write-Host "  ✗ Found BUN in User PATH:" -ForegroundColor Red
    $userBunPaths | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ✓ No BUN in User PATH" -ForegroundColor Green
}

if ($systemBunPaths) {
    Write-Host "  ✗ Found BUN in System PATH:" -ForegroundColor Red
    $systemBunPaths | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ✓ No BUN in System PATH" -ForegroundColor Green
}
Write-Host ""

# 4. Check npm installation
Write-Host "[4] Checking npm-installed signaler..." -ForegroundColor Yellow
$npmSignalerCmd = "$env:APPDATA\npm\signaler.cmd"
$npmSignalerPs1 = "$env:APPDATA\npm\signaler.ps1"
$npmNodeModules = "$env:APPDATA\npm\node_modules\@signaler\cli"

if (Test-Path $npmSignalerCmd) {
    Write-Host "  ✓ Found signaler.cmd at: $npmSignalerCmd" -ForegroundColor Green
} else {
    Write-Host "  ✗ signaler.cmd not found" -ForegroundColor Red
}

if (Test-Path $npmNodeModules) {
    Write-Host "  ✓ Found @signaler/cli in node_modules" -ForegroundColor Green
} else {
    Write-Host "  ✗ @signaler/cli not found in node_modules" -ForegroundColor Red
}
Write-Host ""

# 5. Test which one gets executed
Write-Host "[5] Testing which signaler gets executed..." -ForegroundColor Yellow
$testResult = signaler --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ signaler --version works" -ForegroundColor Green
    Write-Host "    Output: $testResult" -ForegroundColor Gray
} else {
    Write-Host "  ✗ signaler --version failed" -ForegroundColor Red
    Write-Host "    Error: $testResult" -ForegroundColor Gray
    
    # Try to identify which one failed
    $firstLocation = (where.exe signaler 2>$null) | Select-Object -First 1
    if ($firstLocation) {
        Write-Host "    Failed executable: $firstLocation" -ForegroundColor Yellow
    }
}
Write-Host ""

# 6. Check for symbolic links or junctions
Write-Host "[6] Checking for symbolic links..." -ForegroundColor Yellow
if (Test-Path "B:\-\BUN") {
    $item = Get-Item "B:\-\BUN" -ErrorAction SilentlyContinue
    if ($item.LinkType) {
        Write-Host "  ✗ B:\-\BUN is a $($item.LinkType) pointing to: $($item.Target)" -ForegroundColor Red
    } else {
        Write-Host "  B:\-\BUN is a regular directory" -ForegroundColor Gray
    }
}
Write-Host ""

# 7. Summary and recommendations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$hasBunInPath = $userBunPaths -or $systemBunPaths
$hasMultipleSignalers = $signalerLocations -is [array] -and $signalerLocations.Count -gt 1
$hasBunExecutable = Test-Path "B:\-\BUN"

if ($hasBunInPath -or $hasMultipleSignalers -or $hasBunExecutable) {
    Write-Host "PROBLEM IDENTIFIED:" -ForegroundColor Red
    Write-Host ""
    
    if ($hasMultipleSignalers) {
        Write-Host "  • Multiple 'signaler' commands found in PATH" -ForegroundColor Yellow
        Write-Host "    The Bun version is being executed first" -ForegroundColor Yellow
    }
    
    if ($hasBunInPath) {
        Write-Host "  • BUN paths found in system PATH" -ForegroundColor Yellow
    }
    
    if ($hasBunExecutable) {
        Write-Host "  • Bun executable exists at B:\-\BUN" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "SOLUTION:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  1. Remove BUN from PATH:" -ForegroundColor White
    Write-Host "     - Open System Properties → Environment Variables" -ForegroundColor Gray
    Write-Host "     - Edit PATH (User and System)" -ForegroundColor Gray
    Write-Host "     - Remove entries containing 'BUN'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Delete the Bun executable:" -ForegroundColor White
    if (Test-Path "B:\-\BUN") {
        Write-Host "     Remove-Item 'B:\-\BUN' -Recurse -Force" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  3. Restart PowerShell" -ForegroundColor White
    Write-Host ""
    Write-Host "  4. Test again: signaler --version" -ForegroundColor White
    
} else {
    Write-Host "✓ No obvious PATH issues found" -ForegroundColor Green
    Write-Host ""
    if (-not (Test-Path $npmSignalerCmd)) {
        Write-Host "However, npm installation seems incomplete." -ForegroundColor Yellow
        Write-Host "Try: npm install -g jsr:@signaler/cli" -ForegroundColor White
    }
}
Write-Host ""
