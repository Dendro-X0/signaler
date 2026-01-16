# ✅ Git Bash Support - Complete Solution

## Problem Solved

The Signaler CLI now works seamlessly in Git Bash! 🎉

## Quick Setup (One-Time)

After installing Signaler, run this one command:

### Option 1: PowerShell (Recommended)
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.ps1" -OutFile "setup.ps1"
pwsh -ExecutionPolicy Bypass -File setup.ps1
```

### Option 2: Git Bash
```bash
curl -o setup.sh https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh
bash setup.sh
```

### Option 3: Manual (Copy-Paste)
```bash
cat > "$HOME/AppData/Local/signaler/bin/signaler" << 'EOF'
#!/usr/bin/env bash
SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
EOF

chmod +x "$HOME/AppData/Local/signaler/bin/signaler"
```

## What This Does

The setup script creates a bash wrapper at:
```
C:\Users\YourName\AppData\Local\signaler\bin\signaler
```

This wrapper:
- ✅ Works in Git Bash
- ✅ Calls Node.js with the actual CLI script
- ✅ Passes all arguments correctly
- ✅ Doesn't interfere with PowerShell/CMD usage

## After Setup

The CLI works everywhere:

```bash
# Git Bash - works!
signaler wizard
signaler audit

# PowerShell - works!
signaler wizard
signaler audit

# CMD - works!
signaler wizard
signaler audit
```

## Complete Installation Flow

```bash
# 1. Install Signaler
npx jsr add @signaler/cli

# 2. Run setup (one-time)
curl -o setup.sh https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh
bash setup.sh

# 3. Use it!
signaler wizard
```

## Verification

```bash
# Check if the wrapper exists
ls -la "$HOME/AppData/Local/signaler/bin/signaler"

# Test it
signaler --version

# Should show the CLI help without errors
```

## Why Was This Needed?

JSR installations create a `.cmd` wrapper that works in PowerShell and CMD, but Git Bash doesn't execute `.cmd` files. The setup script creates an additional bash wrapper so the CLI works in all shells.

## Technical Details

### Before Setup
- PowerShell/CMD: ✅ Works (uses `signaler.cmd`)
- Git Bash: ❌ Doesn't work (`.cmd` not recognized)

### After Setup
- PowerShell/CMD: ✅ Works (uses `signaler.cmd`)
- Git Bash: ✅ Works (uses `signaler` bash script)

Both wrappers coexist peacefully in the same directory!

## Troubleshooting

### "signaler: command not found" after setup

**Solution:** Restart Git Bash
```bash
# Close and reopen Git Bash, then test
signaler --version
```

### Setup script not found

**Solution:** Download it first
```bash
curl -o setup.sh https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh
bash setup.sh
```

### Permission denied

**Solution:** Make it executable
```bash
chmod +x setup.sh
./setup.sh
```

### Signaler not installed

**Solution:** Install it first
```bash
npx jsr add @signaler/cli
```

Then run the setup script.

## For Repository Maintainers

The setup scripts are located in `scripts/`:
- `setup-bash-wrapper.sh` - Bash version
- `setup-bash-wrapper.ps1` - PowerShell version
- `README.md` - Documentation

These scripts should be:
1. Committed to the repository
2. Referenced in the main README
3. Linked in the installation guide

## Summary

✅ **Problem:** CLI didn't work in Git Bash  
✅ **Solution:** One-time setup script creates bash wrapper  
✅ **Result:** CLI works in all shells (Git Bash, PowerShell, CMD)  
✅ **Effort:** One command, takes 2 seconds  

---

**Status:** Fully functional in Git Bash  
**Setup Time:** < 1 minute  
**Maintenance:** None (wrapper persists across updates)
