# PowerShell Installer Troubleshooting Guide

## Critical Fix Applied

The installer was crashing immediately because:
1. `$ErrorActionPreference = "Stop"` caused PowerShell to exit on any error
2. Output was suppressed with `Out-Null` and `--silent` flags
3. No pause before exit, so error messages disappeared

## Fixed Issues

✅ Changed to `$ErrorActionPreference = "Continue"` to show errors  
✅ Removed output suppression - now shows all npm output  
✅ Added pause before exit to read errors  
✅ Show full error details including stack trace  
✅ Created debug installer for detailed troubleshooting  

## How to Install Now

### Option 1: Use the Fixed Installer

```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 | iex
```

This will now:
- Show all output from npm install and build
- Pause before exiting so you can read errors
- Display full error details if something fails

### Option 2: Use the Debug Installer (Recommended for Troubleshooting)

```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/debug-install.ps1 | iex
```

This shows:
- Environment information
- Node.js and npm versions
- Every step of the installation
- Full output from all commands
- Detailed error messages

## Common Issues and Solutions

### Issue 1: Node.js Not Found
**Error:** "Node.js is required but not found"

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell
3. Verify: `node --version`

### Issue 2: npm Install Fails
**Error:** "npm install failed"

**Solution:**
1. Check internet connection
2. Try running as Administrator
3. Clear npm cache: `npm cache clean --force`
4. Try again

### Issue 3: Build Fails
**Error:** "npm build failed"

**Solution:**
1. Check Node.js version: `node --version` (need 16+)
2. Check npm version: `npm --version`
3. Try manual installation (see below)

### Issue 4: Permission Denied
**Error:** "Access denied" or "Permission denied"

**Solution:**
1. Run PowerShell as Administrator
2. Or install to a different directory

### Issue 5: Antivirus Blocking
**Error:** Various errors during download/extract

**Solution:**
1. Temporarily disable antivirus
2. Add exception for `%LOCALAPPDATA%\signaler`
3. Try again

## Manual Installation (If Installer Fails)

If the installer continues to fail, install manually:

```powershell
# 1. Create directory
$InstallDir = "$env:LOCALAPPDATA\signaler"
New-Item -ItemType Directory -Path $InstallDir -Force

# 2. Download and extract
Invoke-WebRequest -Uri "https://github.com/Dendro-X0/signaler/archive/refs/heads/main.zip" -OutFile "$env:TEMP\signaler.zip"
Expand-Archive -Path "$env:TEMP\signaler.zip" -DestinationPath "$env:TEMP\signaler-extract" -Force
Copy-Item "$env:TEMP\signaler-extract\signaler-main\*" -Destination $InstallDir -Recurse -Force

# 3. Build
cd $InstallDir
npm install
npm run build

# 4. Verify
node dist/bin.js --help

# 5. Add to PATH (optional)
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
```

## Getting Help

If you're still having issues:

1. **Run the debug installer** to see detailed output
2. **Copy the error message** (it will pause so you can copy)
3. **Check Node.js version:** `node --version` (need 16+)
4. **Check npm works:** `npm --version`
5. **Try manual installation** (see above)

## What the Installer Does

1. Checks Node.js version (requires 16+)
2. Downloads source from GitHub
3. Extracts to `%LOCALAPPDATA%\signaler`
4. Runs `npm install` to install dependencies
5. Runs `npm run build` to compile TypeScript
6. Creates `signaler.cmd` launcher
7. Adds to PATH (optional)
8. Verifies installation works

## Next Steps After Installation

Once installed successfully:

```bash
# Create configuration
signaler wizard

# Test with plan
signaler audit --plan

# Run your first audit
signaler audit
```

## Still Having Issues?

The installer now shows full error output. Please:

1. Run the debug installer
2. Copy the complete error message
3. Report the issue with the error details

The pause before exit ensures you can read and copy all error messages.
