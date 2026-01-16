#!/usr/bin/env pwsh
# Comprehensive Bun Issue Diagnostic Script

Write-Host "=== Signaler + Bun Diagnostic Tool ===" -ForegroundColor Cyan
Write-Host "This script will help identify why Bun errors persist" -ForegroundColor White
Write-Host ""

# 1. Check which signaler is being executed
Write-Host "1. Checking which signaler executable is being used..." -ForegroundColor Yellow
try {
    $signalerPaths = @(where.exe signaler 2>$null)
    if ($signalerPaths.Count -gt 0) {
        Write-Host "  Found $($signalerPaths.Count) signaler executable(s):" -ForegroundColor Cyan
        for ($i = 0; $i -lt $signalerPaths.Count; $i++) {
            $path = $signalerPaths[$i]
            if ($i -eq 0) {
                Write-Host "  → $path" -ForegroundColor Green
                Write-Host "    (This is the one being executed)" -ForegroundColor Gray
            } else {
                Write-Host "    $path" -ForegroundColor Gray
            }
            
            # Check if it's a Bun executable
            if ($path -like "*BUN*" -or $path -like "*bun*" -or $path -like "B:\*") {
                Write-Host "    ⚠ THIS IS A BUN EXECUTABLE!" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ✗ No signaler executable found in PATH" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check for Bun command
Write-Host "`n2. Checking if Bun is installed..." -ForegroundColor Yellow
$bunCommand = Get-Command bun -ErrorAction SilentlyContinue
if ($bunCommand) {
    Write-Host "  ⚠ Bun is still installed at: $($bunCommand.Source)" -ForegroundColor Red
} else {
    Write-Host "  ✓ Bun command not found (good)" -ForegroundColor Green
}

# 3. Check B:\ drive
Write-Host "`n3. Checking for B:\ drive..." -ForegroundColor Yellow
if (Test-Path "B:\") {
    Write-Host "  ⚠ B:\ drive EXISTS!" -ForegroundColor Red
    
    # Check if it's a subst drive
    $substDrives = subst 2>$null
    if ($substDrives -match "B:\\") {
        Write-Host "    → B:\ is a SUBST (virtual) drive" -ForegroundColor Yellow
        Write-Host "    → Created by: subst B: <path>" -ForegroundColor Gray
    }
    
    # Check if it's a network drive
    $netDrives = net use 2>$null
    if ($netDrives -match "B:") {
        Write-Host "    → B:\ is a network drive" -ForegroundColor Yellow
    }
    
    # Check for Bun directory
    if (Test-Path "B:\-\BUN") {
        Write-Host "    → B:\-\BUN directory EXISTS!" -ForegroundColor Red
        $bunFiles = Get-ChildItem "B:\-\BUN" -Recurse -Filter "*signaler*" -ErrorAction SilentlyContinue
        if ($bunFiles) {
            Write-Host "    → Found signaler files in B:\-\BUN:" -ForegroundColor Red
            foreach ($file in $bunFiles) {
                Write-Host "      - $($file.FullName)" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "  ✓ B:\ drive does not exist (good)" -ForegroundColor Green
}

# 4. Check PATH for Bun entries
Write-Host "`n4. Checking PATH for Bun entries..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")

$userBunPaths = $userPath -split ';' | Where-Object { $_ -like "*bun*" -or $_ -like "*BUN*" -or $_ -like "B:\-\*" }
$systemBunPaths = $systemPath -split ';' | Where-Object { $_ -like "*bun*" -or $_ -like "*BUN*" -or $_ -like "B:\-\*" }

if ($userBunPaths.Count -gt 0) {
    Write-Host "  ⚠ Found Bun entries in User PATH:" -ForegroundColor Red
    foreach ($path in $userBunPaths) {
        Write-Host "    - $path" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✓ No Bun entries in User PATH (good)" -ForegroundColor Green
}

if ($systemBunPaths.Count -gt 0) {
    Write-Host "  ⚠ Found Bun entries in System PATH:" -ForegroundColor Red
    foreach ($path in $systemBunPaths) {
        Write-Host "    - $path" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✓ No Bun entries in System PATH (good)" -ForegroundColor Green
}

# 5. Check for Bun directories
Write-Host "`n5. Checking for Bun installation directories..." -ForegroundColor Yellow
$bunDirs = @(
    "$env:USERPROFILE\.bun",
    "$env:LOCALAPPDATA\bun",
    "$env:APPDATA\bun",
    "C:\Program Files\bun",
    "C:\Program Files (x86)\bun",
    "$env:ProgramData\bun"
)

$foundDirs = @()
foreach ($dir in $bunDirs) {
    if (Test-Path $dir) {
        Write-Host "  ⚠ Found: $dir" -ForegroundColor Red
        $foundDirs += $dir
    }
}

if ($foundDirs.Count -eq 0) {
    Write-Host "  ✓ No Bun directories found (good)" -ForegroundColor Green
}

# 6. Check registry
Write-Host "`n6. Checking registry for Bun entries..." -ForegroundColor Yellow
$regPaths = @(
    "HKCU:\Software\bun",
    "HKLM:\Software\bun"
)

$foundReg = @()
foreach ($regPath in $regPaths) {
    if (Test-Path $regPath) {
        Write-Host "  ⚠ Found: $regPath" -ForegroundColor Red
        $foundReg += $regPath
    }
}

if ($foundReg.Count -eq 0) {
    Write-Host "  ✓ No Bun registry keys found (good)" -ForegroundColor Green
}

# 7. Test signaler execution
Write-Host "`n7. Testing signaler execution..." -ForegroundColor Yellow
try {
    $output = & signaler --version 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($output -match "BUN|B:\\-\\BUN|locales") {
        Write-Host "  ✗ Signaler execution shows Bun errors!" -ForegroundColor Red
        Write-Host "  Error output:" -ForegroundColor Gray
        $output | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } elseif ($exitCode -eq 0) {
        Write-Host "  ✓ Signaler executes successfully (no Bun errors)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Signaler execution failed with exit code: $exitCode" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Error executing signaler: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Summary and recommendations
Write-Host "`n=== Diagnostic Summary ===" -ForegroundColor Cyan
Write-Host ""

$issues = @()
if ($signalerPaths[0] -like "*BUN*" -or $signalerPaths[0] -like "*bun*" -or $signalerPaths[0] -like "B:\*") {
    $issues += "Primary signaler executable is a Bun executable"
}
if ($bunCommand) {
    $issues += "Bun is still installed"
}
if (Test-Path "B:\") {
    $issues += "B:\ drive exists"
}
if ($userBunPaths.Count -gt 0 -or $systemBunPaths.Count -gt 0) {
    $issues += "Bun entries found in PATH"
}
if ($foundDirs.Count -gt 0) {
    $issues += "Bun directories still exist"
}
if ($foundReg.Count -gt 0) {
    $issues += "Bun registry keys still exist"
}

if ($issues.Count -gt 0) {
    Write-Host "⚠ Issues Found:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Recommended Action:" -ForegroundColor White
    Write-Host "  Run the complete removal script:" -ForegroundColor Cyan
    Write-Host "  pwsh -ExecutionPolicy Bypass -File complete-bun-removal.ps1" -ForegroundColor Gray
} else {
    Write-Host "✓ No Bun-related issues found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If you're still seeing Bun errors:" -ForegroundColor White
    Write-Host "  1. Restart your terminal/PowerShell" -ForegroundColor Gray
    Write-Host "  2. Reinstall signaler: npx jsr add -g @signaler/cli" -ForegroundColor Gray
    Write-Host "  3. Test again: signaler --version" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
