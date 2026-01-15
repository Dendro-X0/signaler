# PowerShell Installer Troubleshooting Guide

## Root Cause Analysis

The installer was crashing immediately when run via `iwr | iex` because:

1. **`$Host.UI.RawUI.ReadKey()` doesn't work in non-interactive contexts**
   - When piped through `iex`, there's no interactive console
   - `ReadKey()` throws an exception and crashes immediately
   - The window closes before any error can be displayed

2. **PowerShell execution context matters**
   - `iwr url | iex` runs in a non-interactive pipeline context
   - Interactive prompts and keyboard input don't work
   - Scripts must complete without user input

3. **Error handling was insufficient**
   - Even with `$ErrorActionPreference = "Continue"`, `ReadKey()` still crashed
   - The script needed to avoid ALL interactive operations

## Solution Applied

✅ **Removed all interactive operations** (`ReadKey()`, prompts)  
✅ **Changed to `$ErrorActionPreference = "Stop"`** for proper error handling  
✅ **Errors now display in the console** before script exits  
✅ **Added `-UseBasicParsing`** to `Invoke-WebRequest` for compatibility  
✅ **Unique temp directories** to avoid conflicts  
✅ **Better error messages** with troubleshooting steps  
✅ **Debug installer uses `Read-Host`** (only works when saved and run directly)  

## How to Install Now

### Option 1: Quick Installer (Recommended)

```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 | iex
```

This now works correctly with `iex` and will:
- Show all output in your current PowerShell window
- Display errors if something fails
- Complete without requiring user input
- Leave the window open so you can see results

### Option 2: Debug Installer (For Troubleshooting)

**Download and run** (don't use `iex`):

```powershell
# Download the debug installer
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/debug-install.ps1 -OutFile install-debug.ps1

# Run it
.\install-debug.ps1
```

The debug installer:
- Shows detailed step-by-step output
- Displays all npm install/build output
- Pauses at the end so you can read everything
- Must be saved and run directly (not via `iex`)

## Common Issues and Solutions

### Issue 1: Node.js Not Found
**Error:** "Node.js not found or not working"

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell completely
3. Verify: `node --version`
4. Try installer again

### Issue 2: npm Install Fails
**Error:** "npm install failed with exit code X"

**Solution:**
1. Check internet connection
2. Try running PowerShell as Administrator
3. Clear npm cache: `npm cache clean --force`
4. Check disk space in `%LOCALAPPDATA%`
5. Try again

### Issue 3: Build Fails
**Error:** "npm build failed"

**Solution:**
1. Check Node.js version: `node --version` (need 16+)
2. Check npm version: `npm --version`
3. Try manual installation (see below)
4. Check for TypeScript errors in output

### Issue 4: Permission Denied
**Error:** "Access denied" or "Permission denied"

**Solution:**
1. Run PowerShell as Administrator:
   - Right-click PowerShell
   - Select "Run as Administrator"
2. Or install to a different directory (manual installation)

### Issue 5: Antivirus Blocking
**Error:** Download or extraction fails

**Solution:**
1. Temporarily disable antivirus
2. Add exception for `%LOCALAPPDATA%\signaler`
3. Try again
4. Re-enable antivirus after installation

### Issue 6: Script Execution Policy
**Error:** "Cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try the installer again.

## Manual Installation (If Installer Fails)

If both installers fail, install manually:

```powershell
# 1. Create directory
$InstallDir = "$env:LOCALAPPDATA\signaler"
New-Item -ItemType Directory -Path $InstallDir -Force

# 2. Download and extract
$TempZip = "$env:TEMP\signaler.zip"
Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip -UseBasicParsing
Expand-Archive -Path $TempZip -DestinationPath "$env:TEMP\signaler-extract" -Force
Copy-Item "$env:TEMP\signaler-extract\signaler-main\*" -Destination $InstallDir -Recurse -Force

# 3. Build
cd $InstallDir
npm install
npm run build

# 4. Verify
node dist/bin.js --version

# 5. Create launcher
@"
@echo off
node "%~dp0dist\bin.js" %*
"@ | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII

# 6. Add to PATH (optional)
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")

# 7. Restart terminal and test
# signaler wizard
```

## Understanding the Installers

### Quick Installer (`quick-install.ps1`)
- Designed for `iwr | iex` usage
- No interactive prompts
- Shows errors in console
- Completes automatically
- Best for most users

### Debug Installer (`debug-install.ps1`)
- Must be downloaded and run directly
- Shows detailed step-by-step output
- Displays all npm output
- Pauses at end for review
- Best for troubleshooting

## What the Installer Does

1. **Checks Node.js** (requires 16+)
2. **Downloads** source from GitHub
3. **Extracts** to temporary directory
4. **Copies** to `%LOCALAPPDATA%\signaler`
5. **Runs** `npm install` to install dependencies
6. **Runs** `npm run build` to compile TypeScript
7. **Creates** `signaler.cmd` launcher
8. **Adds** to PATH (optional)
9. **Tests** installation with `--version`

## Next Steps After Installation

Once installed successfully:

```bash
# Restart your terminal first!

# Create configuration
signaler wizard

# Test with plan
signaler audit --plan

# Run your first audit
signaler audit
```

## Getting Help

If you're still having issues:

1. **Try the debug installer** (download and run it)
2. **Copy the complete error message** from the console
3. **Check Node.js**: `node --version` (need 16+)
4. **Check npm**: `npm --version`
5. **Check disk space**: Ensure you have at least 500MB free
6. **Try manual installation** (see above)

## Technical Details

### Why `iex` Was Problematic

When you run `iwr url | iex`:
- The script runs in a pipeline context
- No interactive console is available
- `$Host.UI.RawUI.ReadKey()` throws an exception
- The exception crashes the script immediately
- The PowerShell window closes before you can see the error

### The Fix

The new installer:
- Uses `$ErrorActionPreference = "Stop"` for proper error handling
- Avoids ALL interactive operations
- Displays errors in the console before exiting
- Works correctly with `iex`
- Errors are visible in your PowerShell window

### Debug Installer Difference

The debug installer:
- Uses `Read-Host` instead of `ReadKey()`
- Must be saved to a file and run directly
- Cannot be used with `iex`
- Shows much more detailed output
- Pauses at the end for review

## Still Having Issues?

The installer now properly displays errors. If you see an error:

1. **Read the error message** - it will tell you what failed
2. **Try the suggested solutions** in this guide
3. **Use the debug installer** for more details
4. **Try manual installation** as a last resort
5. **Report the issue** with the complete error message

The key improvement: **errors are now visible** instead of the window closing immediately.
