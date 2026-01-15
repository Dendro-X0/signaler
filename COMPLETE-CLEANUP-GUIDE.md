# Complete Cleanup Guide - Remove Bun-Installed Signaler

## The Problem

Even after uninstalling Bun, Signaler is still installed in Bun's global modules directory. When you run `signaler wizard`, it's executing the Bun-installed version which has broken module paths.

## Complete Removal Steps

### Step 1: Find Where Signaler is Installed

```powershell
# Check if signaler command exists
where.exe signaler

# This will show you the path, likely something like:
# C:\Users\YourName\.bun\bin\signaler.exe
# or
# C:\Users\YourName\AppData\Roaming\npm\signaler
```

### Step 2: Remove Bun's Global Packages Directory

```powershell
# Remove Bun's global install directory
Remove-Item -Recurse -Force "$env:USERPROFILE\.bun" -ErrorAction SilentlyContinue

# Also check and remove from AppData
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\bun" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\bun" -ErrorAction SilentlyContinue
```

### Step 3: Clean npm Global Packages (Just in Case)

```powershell
# List globally installed packages
npm list -g --depth=0

# If you see @signaler/signaler, remove it
npm uninstall -g @signaler/signaler

# Also try removing without scope
npm uninstall -g signaler
```

### Step 4: Clear All Package Manager Caches

```powershell
# Clear npm cache
npm cache clean --force

# Clear pnpm cache (if you use pnpm)
pnpm store prune

# Clear yarn cache (if you use yarn)
yarn cache clean
```

### Step 5: Remove from PATH (if needed)

Check your PATH environment variable:

```powershell
# View PATH
$env:PATH -split ';'

# Look for any Bun-related paths like:
# C:\Users\YourName\.bun\bin
```

If you find Bun paths, remove them:
1. Open System Properties → Environment Variables
2. Edit PATH variable
3. Remove any Bun-related entries
4. Click OK and restart PowerShell

### Step 6: Verify Clean State

```powershell
# This should return nothing or "command not found"
where.exe signaler

# This should show Node.js version (not Bun)
node --version

# This should show npm version
npm --version
```

### Step 7: Fresh Install with Node.js

```powershell
# Install globally with npm
npm install -g jsr:@signaler/signaler

# Verify installation
signaler --version

# Test it
signaler wizard
```

## Alternative: Install Locally in Project

If global installation keeps having issues, install locally:

```powershell
# Navigate to your project
cd path\to\your\project

# Install locally
npm install jsr:@signaler/signaler

# Run with npx
npx signaler wizard
```

## Nuclear Option: Manual File Removal

If the above doesn't work, manually delete these directories:

```powershell
# Bun directories
Remove-Item -Recurse -Force "$env:USERPROFILE\.bun"
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\bun"
Remove-Item -Recurse -Force "$env:APPDATA\bun"

# npm global node_modules (be careful!)
Remove-Item -Recurse -Force "$env:APPDATA\npm\node_modules\@signaler"
Remove-Item -Recurse -Force "$env:APPDATA\npm\node_modules\signaler"

# Restart PowerShell
exit
```

## Verify Node.js is Default

Make sure Node.js (not Bun) is your default JavaScript runtime:

```powershell
# Check what 'node' points to
where.exe node

# Should show something like:
# C:\Program Files\nodejs\node.exe

# NOT:
# C:\Users\YourName\.bun\bin\node.exe
```

## Still Having Issues?

### Check for Conflicting Installations

```powershell
# Search for all signaler executables
Get-ChildItem -Path C:\ -Filter "signaler*" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

### Check npm Prefix

```powershell
# See where npm installs global packages
npm config get prefix

# Should be something like:
# C:\Users\YourName\AppData\Roaming\npm

# If it points to Bun directory, fix it:
npm config set prefix "$env:APPDATA\npm"
```

### Reinstall Node.js

If nothing works, reinstall Node.js:

1. Uninstall Node.js from Control Panel
2. Delete `C:\Program Files\nodejs`
3. Delete `%APPDATA%\npm`
4. Download fresh Node.js from https://nodejs.org/
5. Install Node.js
6. Restart PowerShell
7. Install Signaler: `npm install -g jsr:@signaler/signaler`

## Summary

The key issue is that Bun installed Signaler in its own directory structure, and even after uninstalling Bun, those files remain. You need to:

1. ✅ Remove all Bun directories
2. ✅ Clear all package manager caches
3. ✅ Verify Node.js is the default runtime
4. ✅ Fresh install with npm
5. ✅ Test with `signaler wizard`

## Quick Script

Run this PowerShell script to do everything at once:

```powershell
# Complete cleanup and reinstall
Write-Host "Removing Bun directories..."
Remove-Item -Recurse -Force "$env:USERPROFILE\.bun" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\bun" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\bun" -ErrorAction SilentlyContinue

Write-Host "Uninstalling old signaler..."
npm uninstall -g @signaler/signaler 2>$null
npm uninstall -g signaler 2>$null

Write-Host "Clearing caches..."
npm cache clean --force

Write-Host "Installing fresh with Node.js..."
npm install -g jsr:@signaler/signaler

Write-Host "Testing installation..."
signaler --version

Write-Host "Done! Try running: signaler wizard"
```

Save this as `cleanup-and-reinstall.ps1` and run it in PowerShell.
