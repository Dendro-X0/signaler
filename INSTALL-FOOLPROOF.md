# Foolproof Installation Guide

## The Problem

PowerShell installers run via `iwr | iex` can crash and hide all error output, making debugging impossible.

## The Solution: Two-Step Installation

**Never run installers via `iex` again.** Always download first, then run.

---

## Method 1: Two-Step Install (Recommended)

### Step 1: Download the installer
```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 -OutFile signaler-install.ps1
```

### Step 2: Run it
```powershell
.\signaler-install.ps1
```

**Why this works:**
- ✅ Script runs in your PowerShell session (not piped)
- ✅ All output stays visible
- ✅ Errors display in your console
- ✅ Log file created with full details
- ✅ You can review the script before running

**If it fails:**
- Error messages will be visible in your console
- A log file is created in `%TEMP%` with full details
- The log file path is displayed in the error message

---

## Method 2: Bootstrap Installer

This downloads and runs the installer automatically:

```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/bootstrap-install.ps1 | iex
```

**How it works:**
1. Downloads the full installer to a temp file
2. Runs it locally (not via `iex`)
3. All output is visible
4. Keeps the installer file for review

---

## Method 3: Manual Installation

If all else fails, install manually:

```powershell
# 1. Create directory
$InstallDir = "$env:LOCALAPPDATA\signaler"
New-Item -ItemType Directory -Path $InstallDir -Force

# 2. Download source
$TempZip = "$env:TEMP\signaler.zip"
Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile $TempZip -UseBasicParsing

# 3. Extract
Expand-Archive -Path $TempZip -DestinationPath "$env:TEMP\signaler-extract" -Force

# 4. Copy files
Copy-Item "$env:TEMP\signaler-extract\signaler-main\*" -Destination $InstallDir -Recurse -Force

# 5. Build
cd $InstallDir
npm install
npm run build

# 6. Verify
node dist/bin.js --version

# 7. Create launcher
@"
@echo off
node "%~dp0dist\bin.js" %*
"@ | Out-File -FilePath "$InstallDir\signaler.cmd" -Encoding ASCII

# 8. Add to PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")

# 9. Restart terminal and test
# signaler wizard
```

---

## Understanding the Log File

The installer creates a log file in `%TEMP%` with a timestamp:
```
C:\Users\YourName\AppData\Local\Temp\signaler-install-20260114-143022.log
```

**The log contains:**
- Timestamp for each step
- All npm install output
- All npm build output
- Full error details if something fails
- Stack traces for debugging

**To view the log:**
```powershell
# The installer shows the log path in the error message
notepad "C:\Users\YourName\AppData\Local\Temp\signaler-install-YYYYMMDD-HHMMSS.log"
```

**Or find the latest log:**
```powershell
Get-ChildItem "$env:TEMP\signaler-install-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { notepad $_.FullName }
```

---

## Troubleshooting

### Issue 1: Node.js Not Found
**Error in log:** "Node.js not found or not working"

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell completely
3. Verify: `node --version`
4. Try installation again

### Issue 2: npm Install Fails
**Error in log:** "npm install failed"

**Solution:**
1. Check the npm output in the log file
2. Common causes:
   - No internet connection
   - npm registry down
   - Disk space full
   - Antivirus blocking
3. Try: `npm cache clean --force`
4. Try installation again

### Issue 3: npm Build Fails
**Error in log:** "npm build failed"

**Solution:**
1. Check the npm build output in the log file
2. Common causes:
   - TypeScript errors
   - Missing dependencies
   - Incompatible Node.js version
3. Verify Node.js version: `node --version` (need 16+)
4. Try manual installation

### Issue 4: Permission Denied
**Error in log:** "Access denied" or "Permission denied"

**Solution:**
1. Run PowerShell as Administrator:
   - Right-click PowerShell
   - Select "Run as Administrator"
2. Try installation again

### Issue 5: Script Execution Policy
**Error:** "Cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try installation again.

---

## Why Two-Step Installation is Better

### One-Step (`iwr | iex`)
- ❌ Runs in pipeline context
- ❌ Errors can be hidden
- ❌ Window may close immediately
- ❌ No log file
- ❌ Hard to debug

### Two-Step (Download then Run)
- ✅ Runs in your PowerShell session
- ✅ All errors visible
- ✅ Console stays open
- ✅ Log file created
- ✅ Easy to debug
- ✅ Can review script before running

---

## Quick Reference

### Recommended Installation
```powershell
# Download
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 -OutFile install.ps1

# Run
.\install.ps1
```

### View Latest Log
```powershell
Get-ChildItem "$env:TEMP\signaler-install-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { notepad $_.FullName }
```

### After Installation
```bash
# Restart terminal first!
signaler wizard
```

---

## Getting Help

If installation fails:

1. **Check the log file** - Path shown in error message
2. **Copy the error message** - From console or log file
3. **Check Node.js** - `node --version` (need 16+)
4. **Check npm** - `npm --version`
5. **Try manual installation** - See Method 3 above

The log file contains everything needed to diagnose the issue.

---

## Summary

**Never use `iwr | iex` for installers.**

Always use the two-step approach:
1. Download the script
2. Run it locally

This ensures:
- All output is visible
- Errors are displayed
- Log file is created
- Easy to debug
- No hidden failures

The installer is designed to log everything, but it can only help you if it runs in a context where output is visible.
