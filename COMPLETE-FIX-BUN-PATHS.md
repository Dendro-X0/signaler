# Complete Fix: Remove Bun Paths from Installation

## The Problem

Even after uninstalling Bun and reinstalling with npm, the error shows:
```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
```

This means the installed package still has Bun's hardcoded paths in it.

## Root Cause

When you first installed with Bun/pnpm, the dependencies (especially Lighthouse and chrome-launcher) were installed with Bun's module resolution. These paths got cached in:
- npm's global node_modules
- Windows registry/shortcuts
- Cached dependency trees

## Complete Cleanup Solution

### Step 1: Find ALL Signaler Installations

```powershell
# Find where signaler is installed
where.exe signaler

# Find all signaler directories
Get-ChildItem -Path "$env:APPDATA\npm" -Filter "*signaler*" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

### Step 2: Nuclear Cleanup

```powershell
# Remove ALL npm global packages (backup first if you have others!)
Remove-Item -Recurse -Force "$env:APPDATA\npm\node_modules" -ErrorAction SilentlyContinue

# Remove npm cache
npm cache clean --force

# Remove Bun directories (again, to be sure)
Remove-Item -Recurse -Force "$env:USERPROFILE\.bun" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\bun" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\bun" -ErrorAction SilentlyContinue

# Remove pnpm global store (if you use pnpm)
pnpm store prune
```

### Step 3: Verify Clean State

```powershell
# This should return nothing
where.exe signaler

# Verify Node.js is working
node --version
npm --version
```

### Step 4: Fresh Install with Explicit Node.js

```powershell
# Make sure we're using Node.js npm (not Bun)
npm config get prefix
# Should show: C:\Users\YourName\AppData\Roaming\npm

# Install fresh
npm install -g jsr:@signaler/cli

# Verify
signaler --version
```

### Step 5: Test in PowerShell First

```powershell
# Test in PowerShell (where you installed it)
signaler wizard

# If it works in PowerShell but not in Bash, it's a PATH issue
```

## If Still Failing: Local Installation

Instead of global installation, install locally in your project:

```bash
# In your project directory
cd /e/Web\ Project/experimental-workspace/apex-auditor-workspace/next-blogkit-pro

# Install locally
npm install jsr:@signaler/cli

# Run with npx (this will use the local installation)
npx signaler wizard
```

## IDE Bash Shell Issue

Your IDE is using Bash, which might have a different PATH than PowerShell.

### Check PATH in Bash

```bash
# In your IDE's Bash terminal
echo $PATH

# Check if npm global bin is in PATH
which signaler

# Check Node.js
which node
node --version
```

### Fix PATH in Bash

If `signaler` is not found in Bash, add npm's global bin to your Bash PATH:

```bash
# Add to ~/.bashrc or ~/.bash_profile
export PATH="$PATH:/c/Users/Administrator/AppData/Roaming/npm"

# Reload
source ~/.bashrc
```

## Alternative: Use Full Path

```bash
# Find the full path in PowerShell
where.exe signaler

# Use full path in Bash
/c/Users/Administrator/AppData/Roaming/npm/signaler wizard
```

## Best Solution: Local Installation

The most reliable solution is to install locally in each project:

```bash
# In your project
npm install jsr:@signaler/cli

# Add to package.json scripts
{
  "scripts": {
    "audit": "signaler audit",
    "audit:wizard": "signaler wizard"
  }
}

# Run with npm
npm run audit:wizard
```

This avoids all global installation and PATH issues.

## Quick Test Script

Save this as `test-signaler.ps1`:

```powershell
Write-Host "Testing Signaler Installation..." -ForegroundColor Cyan

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

# Test 5: Try running signaler
Write-Host "`n[Test 5] Testing signaler command..." -ForegroundColor Yellow
$signalerTest = signaler --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Signaler works: $signalerTest" -ForegroundColor Green
} else {
    Write-Host "  ✗ Signaler failed with error:" -ForegroundColor Red
    Write-Host "  $signalerTest" -ForegroundColor Gray
}

Write-Host "`nDone!" -ForegroundColor Cyan
```

Run it:
```powershell
.\test-signaler.ps1
```

## Summary

The issue is that Bun's paths are still embedded in the installed package. You need to:

1. ✅ Completely remove all global npm packages
2. ✅ Clear all caches
3. ✅ Fresh install with Node.js npm
4. ✅ Test in PowerShell first
5. ✅ Fix PATH for Bash if needed
6. ✅ Or use local installation (recommended)

**Recommended**: Use local installation in your project to avoid all these issues.
