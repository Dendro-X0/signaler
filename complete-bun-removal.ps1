#!/usr/bin/env pwsh
#Requires -RunAsAdministrator

Write-Host "=== Complete Bun Removal Script ===" -ForegroundColor Cyan
Write-Host "This script will remove ALL Bun installations and clean your PATH" -ForegroundColor White
Write-Host ""

# Confirmation
$confirm = Read-Host "Do you want to proceed? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Step 1: Find all signaler executables
Write-Host "Step 1: Finding all signaler executables..." -ForegroundColor Yellow
$signalerPaths = @()
try {
    $signalerPaths = @(where.exe signaler 2>$null)
    if ($signalerPaths.Count -gt 0) {
        foreach ($path in $signalerPaths) {
            Write-Host "  Found: $path" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  No signaler executables found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Could not locate signaler" -ForegroundColor Gray
}

# Step 2: Check for B:\ drive
Write-Host "`nStep 2: Checking for B:\ drive..." -ForegroundColor Yellow
if (Test-Path "B:\") {
    Write-Host "  ⚠ B:\ drive exists!" -ForegroundColor Red
    
    # Check if it's a subst drive
    $substDrives = subst
    if ($substDrives -match "B:\\") {
        Write-Host "  B:\ is a SUBST drive" -ForegroundColor Yellow
        Write-Host "  Removing SUBST drive..." -ForegroundColor Yellow
        subst B: /D
        Write-Host "  ✓ SUBST drive removed" -ForegroundColor Green
    }
    
    # Check if it's a network drive
    $netDrives = net use 2>$null
    if ($netDrives -match "B:") {
        Write-Host "  B:\ is a network drive" -ForegroundColor Yellow
        Write-Host "  Disconnecting network drive..." -ForegroundColor Yellow
        net use B: /delete /y
        Write-Host "  ✓ Network drive disconnected" -ForegroundColor Green
    }
    
    # If B:\ still exists, try to remove Bun directory
    if (Test-Path "B:\-\BUN") {
        Write-Host "  Removing B:\-\BUN directory..." -ForegroundColor Yellow
        Remove-Item "B:\-\BUN" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed B:\-\BUN" -ForegroundColor Green
    }
} else {
    Write-Host "  ○ B:\ drive does not exist" -ForegroundColor Gray
}

# Step 3: Remove Bun directories
Write-Host "`nStep 3: Removing Bun directories..." -ForegroundColor Yellow
$bunPaths = @(
    "$env:USERPROFILE\.bun",
    "$env:LOCALAPPDATA\bun",
    "$env:APPDATA\bun",
    "C:\Program Files\bun",
    "C:\Program Files (x86)\bun",
    "$env:ProgramData\bun"
)

$removedCount = 0
foreach ($path in $bunPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing: $path" -ForegroundColor Red
        try {
            Remove-Item $path -Recurse -Force -ErrorAction Stop
            Write-Host "  ✓ Removed" -ForegroundColor Green
            $removedCount++
        } catch {
            Write-Host "  ✗ Failed to remove: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ○ Not found: $path" -ForegroundColor Gray
    }
}

if ($removedCount -eq 0) {
    Write-Host "  No Bun directories found" -ForegroundColor Gray
}

# Step 4: Clean PATH environment variable
Write-Host "`nStep 4: Cleaning PATH environment variable..." -ForegroundColor Yellow

# User PATH
Write-Host "  Cleaning User PATH..." -ForegroundColor Cyan
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$originalUserPathCount = ($userPath -split ';').Count
$userPathArray = $userPath -split ';' | Where-Object { 
    $_ -and
    $_ -notlike "*bun*" -and 
    $_ -notlike "*BUN*" -and 
    $_ -notlike "B:\-\*" -and
    $_ -notlike "*B:\-\*"
}
$newUserPath = $userPathArray -join ';'
[Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
$newUserPathCount = ($newUserPath -split ';').Count
$removedUserPaths = $originalUserPathCount - $newUserPathCount
Write-Host "  ✓ Cleaned User PATH (removed $removedUserPaths entries)" -ForegroundColor Green

# System PATH
Write-Host "  Cleaning System PATH..." -ForegroundColor Cyan
try {
    $systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    $originalSystemPathCount = ($systemPath -split ';').Count
    $systemPathArray = $systemPath -split ';' | Where-Object { 
        $_ -and
        $_ -notlike "*bun*" -and 
        $_ -notlike "*BUN*" -and 
        $_ -notlike "B:\-\*" -and
        $_ -notlike "*B:\-\*"
    }
    $newSystemPath = $systemPathArray -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $newSystemPath, "Machine")
    $newSystemPathCount = ($newSystemPath -split ';').Count
    $removedSystemPaths = $originalSystemPathCount - $newSystemPathCount
    Write-Host "  ✓ Cleaned System PATH (removed $removedSystemPaths entries)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not clean System PATH: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  (This requires Administrator privileges)" -ForegroundColor Gray
}

# Step 5: Remove Bun from registry
Write-Host "`nStep 5: Removing Bun registry keys..." -ForegroundColor Yellow
$registryPaths = @(
    "HKCU:\Software\bun",
    "HKLM:\Software\bun"
)

$removedRegCount = 0
foreach ($regPath in $registryPaths) {
    if (Test-Path $regPath) {
        Write-Host "  Removing: $regPath" -ForegroundColor Red
        try {
            Remove-Item $regPath -Recurse -Force -ErrorAction Stop
            Write-Host "  ✓ Removed" -ForegroundColor Green
            $removedRegCount++
        } catch {
            Write-Host "  ✗ Failed to remove: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ○ Not found: $regPath" -ForegroundColor Gray
    }
}

if ($removedRegCount -eq 0) {
    Write-Host "  No Bun registry keys found" -ForegroundColor Gray
}

# Step 6: Remove Bun executable from signaler paths
Write-Host "`nStep 6: Removing Bun-compiled signaler executables..." -ForegroundColor Yellow
$bunSignalerPaths = $signalerPaths | Where-Object { $_ -like "*BUN*" -or $_ -like "*bun*" -or $_ -like "B:\*" }
if ($bunSignalerPaths.Count -gt 0) {
    foreach ($path in $bunSignalerPaths) {
        if (Test-Path $path) {
            Write-Host "  Removing: $path" -ForegroundColor Red
            try {
                Remove-Item $path -Force -ErrorAction Stop
                Write-Host "  ✓ Removed" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to remove: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "  No Bun-compiled signaler executables found" -ForegroundColor Gray
}

# Step 7: Summary
Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  - Removed $removedCount Bun directories" -ForegroundColor Gray
Write-Host "  - Cleaned $removedUserPaths User PATH entries" -ForegroundColor Gray
Write-Host "  - Cleaned $removedSystemPaths System PATH entries" -ForegroundColor Gray
Write-Host "  - Removed $removedRegCount registry keys" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠ CRITICAL: You MUST restart your terminal/PowerShell NOW!" -ForegroundColor Yellow
Write-Host "   PATH changes only take effect after restarting the shell." -ForegroundColor Yellow
Write-Host ""

Write-Host "After restarting, run these commands to verify:" -ForegroundColor White
Write-Host ""
Write-Host "  # 1. Check if Bun is gone" -ForegroundColor Cyan
Write-Host "  Get-Command bun -ErrorAction SilentlyContinue" -ForegroundColor Gray
Write-Host "  (Should return nothing)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  # 2. Check PATH is clean" -ForegroundColor Cyan
Write-Host "  `$env:PATH -split ';' | Select-String -Pattern 'bun'" -ForegroundColor Gray
Write-Host "  (Should return nothing)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  # 3. Check which signaler is being used" -ForegroundColor Cyan
Write-Host "  where.exe signaler" -ForegroundColor Gray
Write-Host "  (Should ONLY show npm version)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  # 4. Reinstall signaler from JSR" -ForegroundColor Cyan
Write-Host "  npm uninstall -g @signaler/cli" -ForegroundColor Gray
Write-Host "  npm cache clean --force" -ForegroundColor Gray
Write-Host "  npx jsr add -g @signaler/cli" -ForegroundColor Gray
Write-Host ""
Write-Host "  # 5. Test it works" -ForegroundColor Cyan
Write-Host "  signaler --version" -ForegroundColor Gray
Write-Host "  (Should show help WITHOUT Bun errors)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
