# Complete Bun Removal Guide for Windows

## The Real Problem

Your system is executing a **Bun-compiled standalone executable** at:
```
B:\-\BUN\root\signaler-windows-x64.exe
```

This is NOT the npm/JSR version. This is a broken executable that was created by Bun's bundler at some point, and it's in your PATH before the npm installation.

## Evidence from Your Screenshot

```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
at B:\-\BUN\root\signaler-windows-x64.exe 284432:40
```

This proves you're running the Bun executable, not the npm version.

## Complete Removal Steps

### Step 1: Find ALL Signaler Executables

Open PowerShell as Administrator and run:

```powershell
# Find all signaler commands
where.exe signaler

# This will show something like:
# B:\-\BUN\root\signaler-windows-x64.exe  ← This is the problem!
# C:\Users\Administrator\AppData\Roaming\npm\signaler.cmd  ← This is the correct one
```

### Step 2: Check if B:\ Drive Exists

```powershell
# Check if B:\ is a real drive
Test-Path "B:\"

# List all drives
Get-PSDrive -PSProvider FileSystem

# If B:\ exists, check what's there
if (Test-Path "B:\") {
    Get-ChildItem "B:\" -Recurse -Filter "*bun*" -ErrorAction SilentlyContinue
    Get-ChildItem "B:\" -Recurse -Filter "*signaler*" -ErrorAction SilentlyContinue
}
```

### Step 3: Remove Bun Directories

```powershell
# Remove all Bun-related directories
$bunPaths = @(
    "$env:USERPROFILE\.bun",
    "$env:LOCALAPPDATA\bun",
    "$env:APPDATA\bun",
    "B:\-\BUN",
    "C:\Program Files\bun",
    "C:\Program Files (x86)\bun"
)

foreach ($path in $bunPaths) {
    if (Test-Path $path) {
        Write-Host "Removing: $path" -ForegroundColor Yellow
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}
```

### Step 4: Clean PATH Environment Variable

This is the **most critical step**:

```powershell
# Function to clean PATH
function Remove-BunFromPath {
    # Clean User PATH
    $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    $userPathArray = $userPath -split ';' | Where-Object { 
        $_ -notlike "*bun*" -and 
        $_ -notlike "*BUN*" -and 
        $_ -notlike "B:\-\*"
    }
    $newUserPath = $userPathArray -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
    Write-Host "✓ Cleaned User PATH" -ForegroundColor Green

    # Clean System PATH (requires admin)
    try {
        $systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        $systemPathArray = $systemPath -split ';' | Where-Object { 
            $_ -notlike "*bun*" -and 
            $_ -notlike "*BUN*" -and 
            $_ -notlike "B:\-\*"
        }
        $newSystemPath = $systemPathArray -join ';'
        [Environment]::SetEnvironmentVariable("PATH", $newSystemPath, "Machine")
        Write-Host "✓ Cleaned System PATH" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not clean System PATH (requires admin)" -ForegroundColor Yellow
    }
}

# Execute the cleanup
Remove-BunFromPath
```

### Step 5: Remove Bun from Registry (Optional but Recommended)

```powershell
# Remove Bun registry keys
$registryPaths = @(
    "HKCU:\Software\bun",
    "HKLM:\Software\bun"
)

foreach ($regPath in $registryPaths) {
    if (Test-Path $regPath) {
        Write-Host "Removing registry key: $regPath" -ForegroundColor Yellow
        Remove-Item $regPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}
```

### Step 6: Restart Your Shell

**CRITICAL:** You MUST restart PowerShell/Terminal for PATH changes to take effect:

```powershell
# Close and reopen PowerShell/Terminal
# Or run:
exit
```

### Step 7: Verify Bun is Gone

After restarting your shell:

```powershell
# Check if bun command exists
Get-Command bun -ErrorAction SilentlyContinue
# Should return nothing

# Check PATH for Bun
$env:PATH -split ';' | Select-String -Pattern "bun"
# Should return nothing

# Check which signaler is being used
where.exe signaler
# Should ONLY show: C:\Users\Administrator\AppData\Roaming\npm\signaler.cmd
```

### Step 8: Reinstall Signaler from JSR

```powershell
# Uninstall any existing versions
npm uninstall -g @signaler/cli
npm uninstall -g @jsr/signaler__cli

# Clear npm cache
npm cache clean --force

# Install fresh from JSR
npx jsr add -g @signaler/cli

# Verify it works
signaler --version
# Should show help text WITHOUT any Bun errors
```

## Complete Automated Cleanup Script

Save this as `complete-bun-removal.ps1` and run as Administrator:

```powershell
#Requires -RunAsAdministrator

Write-Host "=== Complete Bun Removal Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Find all signaler executables
Write-Host "Step 1: Finding all signaler executables..." -ForegroundColor Yellow
where.exe signaler

# Step 2: Remove Bun directories
Write-Host "`nStep 2: Removing Bun directories..." -ForegroundColor Yellow
$bunPaths = @(
    "$env:USERPROFILE\.bun",
    "$env:LOCALAPPDATA\bun",
    "$env:APPDATA\bun",
    "B:\-\BUN",
    "C:\Program Files\bun",
    "C:\Program Files (x86)\bun"
)

foreach ($path in $bunPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing: $path" -ForegroundColor Red
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed" -ForegroundColor Green
    } else {
        Write-Host "  ○ Not found: $path" -ForegroundColor Gray
    }
}

# Step 3: Clean PATH
Write-Host "`nStep 3: Cleaning PATH environment variable..." -ForegroundColor Yellow

# User PATH
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$userPathArray = $userPath -split ';' | Where-Object { 
    $_ -notlike "*bun*" -and 
    $_ -notlike "*BUN*" -and 
    $_ -notlike "B:\-\*"
}
$newUserPath = $userPathArray -join ';'
[Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
Write-Host "  ✓ Cleaned User PATH" -ForegroundColor Green

# System PATH
try {
    $systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    $systemPathArray = $systemPath -split ';' | Where-Object { 
        $_ -notlike "*bun*" -and 
        $_ -notlike "*BUN*" -and 
        $_ -notlike "B:\-\*"
    }
    $newSystemPath = $systemPathArray -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $newSystemPath, "Machine")
    Write-Host "  ✓ Cleaned System PATH" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not clean System PATH (requires admin)" -ForegroundColor Yellow
}

# Step 4: Remove registry keys
Write-Host "`nStep 4: Removing Bun registry keys..." -ForegroundColor Yellow
$registryPaths = @(
    "HKCU:\Software\bun",
    "HKLM:\Software\bun"
)

foreach ($regPath in $registryPaths) {
    if (Test-Path $regPath) {
        Write-Host "  Removing: $regPath" -ForegroundColor Red
        Remove-Item $regPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed" -ForegroundColor Green
    } else {
        Write-Host "  ○ Not found: $regPath" -ForegroundColor Gray
    }
}

# Step 5: Summary
Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: You MUST restart your terminal/PowerShell for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
Write-Host "After restarting, run these commands:" -ForegroundColor White
Write-Host "  1. where.exe signaler" -ForegroundColor Gray
Write-Host "     (Should only show npm version)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. npx jsr add -g @signaler/cli" -ForegroundColor Gray
Write-Host "     (Reinstall from JSR)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. signaler --version" -ForegroundColor Gray
Write-Host "     (Should work without Bun errors)" -ForegroundColor Gray
```

## Why This Problem Persists

You're correct - this is **NOT a code issue**. Here's why it persists:

1. **PATH Priority**: Windows searches directories in PATH order. The Bun executable directory appears BEFORE the npm directory in your PATH.

2. **Persistent Environment Variables**: Even after uninstalling Bun, the PATH entries remain until manually removed.

3. **Multiple Installation Locations**: Bun may have installed in multiple locations (user, system, B: drive).

4. **Shell Caching**: Your shell may cache the location of commands. You must restart the shell.

5. **B: Drive Mystery**: The `B:\-\BUN\` path is unusual. This might be:
   - A virtual drive created by Bun
   - A network drive
   - A subst drive
   - A symbolic link

## Verification After Cleanup

After completing all steps and restarting your shell:

```powershell
# 1. Verify Bun is gone
Get-Command bun -ErrorAction SilentlyContinue
# Should return: nothing

# 2. Verify PATH is clean
$env:PATH -split ';' | Select-String -Pattern "bun"
# Should return: nothing

# 3. Verify only npm signaler exists
where.exe signaler
# Should return ONLY: C:\Users\Administrator\AppData\Roaming\npm\signaler.cmd

# 4. Test signaler works
signaler --version
# Should show help WITHOUT Bun errors
```

## If B:\ Drive Still Exists

If `B:\` is a real drive or subst drive:

```powershell
# Check if it's a subst drive
subst

# If B:\ is listed, remove it
subst B: /D

# Check if it's a network drive
net use

# If B:\ is listed, disconnect it
net use B: /delete
```

## Final Notes

- This is **100% an environment/PATH issue**, not a code issue
- The circular dependency fix in v1.0.9 was correct, but won't help if you're running the wrong executable
- You must clean your PATH and remove all Bun installations
- After cleanup, the npm/JSR version will work perfectly

## Need Help?

If the problem persists after following all steps:

1. Run the diagnostic script: `pwsh ./diagnose-path-issue.ps1`
2. Share the output showing:
   - Result of `where.exe signaler`
   - Result of `$env:PATH -split ';' | Select-String -Pattern "bun"`
   - Result of `Test-Path "B:\"`
