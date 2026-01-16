# Clean Installation Guide

## Problem

After running `npx jsr add @signaler/cli`, you're still seeing the old version:
- Shows: "ApexAuditor v1.0.0"
- Expected: "Signaler v1.0.12"

## Solution

Use the clean installation script to completely remove old versions and install fresh.

## Quick Start

### Option 1: PowerShell (Recommended)
```powershell
# Download the script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/clean-install.ps1" -OutFile "clean-install.ps1"

# Run it
pwsh -ExecutionPolicy Bypass -File clean-install.ps1

# Restart your terminal
# Then test
signaler
```

### Option 2: Git Bash
```bash
# Download the script
curl -o clean-install.sh https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/clean-install.sh

# Run it
bash clean-install.sh

# Restart your terminal
# Then test
signaler
```

### Option 3: Manual Steps

```bash
# 1. Remove old installations
npm uninstall -g @signaler/cli
npm uninstall -g apex-auditor
rm -rf "$HOME/AppData/Local/signaler"
rm -rf "$HOME/AppData/Local/Programs/signaler"

# 2. Clear cache
npm cache clean --force

# 3. Install fresh
npx jsr add @signaler/cli

# 4. Create Git Bash wrapper
cat > "$HOME/AppData/Local/signaler/bin/signaler" << 'EOF'
#!/usr/bin/env bash
SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
EOF

chmod +x "$HOME/AppData/Local/signaler/bin/signaler"

# 5. Restart terminal and test
signaler
```

## What the Script Does

1. **Removes old installations:**
   - Uninstalls from npm global
   - Deletes `C:\Users\YourName\AppData\Local\signaler\`
   - Deletes old Bun executable if present

2. **Clears npm cache:**
   - Ensures no cached versions interfere

3. **Installs latest version:**
   - Fresh install from JSR
   - Gets version 1.0.12

4. **Creates Git Bash wrapper:**
   - Enables `signaler` command in Git Bash

5. **Verifies installation:**
   - Checks command availability
   - Shows installed version

## After Installation

### Restart Your Terminal

**IMPORTANT:** You must restart your terminal for PATH changes to take effect.

Close and reopen:
- Git Bash
- PowerShell
- CMD

### Verify

```bash
# Check version
signaler

# Should show:
# ┌─────────────────────────────────────────────────────────────┐
# │ Signaler v1.0.12                                            │
# │ ...                                                         │
# └─────────────────────────────────────────────────────────────┘
```

### If Still Showing Old Version

If you still see "ApexAuditor v1.0.0" after restarting:

1. **Check which signaler is running:**
   ```bash
   where.exe signaler  # Windows
   which signaler      # Unix/Mac
   ```

2. **Check the actual file:**
   ```bash
   # In PowerShell
   Get-Content "$env:LOCALAPPDATA\signaler\current\package.json" | Select-String version
   
   # In Git Bash
   cat "$HOME/AppData/Local/signaler/current/package.json" | grep version
   ```

3. **If it shows 1.0.12 but CLI shows 1.0.0:**
   - There might be a cached process
   - Try: `taskkill /F /IM node.exe` (Windows)
   - Then restart terminal again

4. **If it shows an old version:**
   - Run the clean install script again
   - Make sure to restart terminal after

## Troubleshooting

### "signaler: command not found"

**Solution:** Restart your terminal. If still not found:
```bash
# PowerShell
signaler.cmd wizard

# Git Bash
bash "$HOME/AppData/Local/signaler/bin/signaler" wizard
```

### Permission Denied

**Solution:** Run PowerShell as Administrator:
```powershell
# Right-click PowerShell → Run as Administrator
pwsh -ExecutionPolicy Bypass -File clean-install.ps1
```

### npm not found

**Solution:** Install Node.js first:
- Download from: https://nodejs.org/
- Then run the clean install script

## Success Criteria

After clean installation and terminal restart, you should see:

```bash
$ signaler
┌─────────────────────────────────────────────────────────────┐
│ Signaler v1.0.12                                            │  ← Correct name and version
│                                                             │
│ Performance + metrics assistant (measure-first, Lighthouse │
│ optional)                                                   │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

✅ Name: "Signaler" (not "ApexAuditor")  
✅ Version: "v1.0.12" (not "v1.0.0")

---

**Status:** Clean installation script ready  
**Location:** `scripts/clean-install.sh` and `scripts/clean-install.ps1`  
**Next:** Run the script and restart your terminal
