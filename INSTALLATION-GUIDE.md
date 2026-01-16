# Installation Guide - Signaler CLI v1.0.11

## ✅ Successfully Published to JSR

The package has been published to JSR and is ready to use!

**JSR Package:** https://jsr.io/@signaler/cli@1.0.11

## Installation

```bash
npx jsr add @signaler/cli
```

This installs the CLI globally to:
```
C:\Users\Administrator\AppData\Local\signaler\bin\
```

## Git Bash Setup (One-Time)

After installation, run this one-time setup to enable Git Bash support:

### Option 1: Using PowerShell (Recommended)
```powershell
# Download and run the setup script
curl -o setup-bash-wrapper.ps1 https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.ps1
pwsh -ExecutionPolicy Bypass -File setup-bash-wrapper.ps1
```

### Option 2: Using Git Bash
```bash
# Download and run the setup script
curl -o setup-bash-wrapper.sh https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh
bash setup-bash-wrapper.sh
```

### Option 3: Manual Setup
```bash
# Create the bash wrapper manually
cat > "C:\Users\$USER\AppData\Local\signaler\bin\signaler" << 'EOF'
#!/usr/bin/env bash
SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
EOF

# Make it executable
chmod +x "C:\Users\$USER\AppData\Local\signaler\bin\signaler"
```

## Usage

### After Setup - Works Everywhere!

Once you've run the setup script, the CLI works in all shells:

```bash
# Git Bash
signaler wizard
signaler audit

# PowerShell
signaler wizard
signaler audit

# CMD
signaler wizard
signaler audit
```

## Verification

### Check Installation
```bash
# Check if installed
where.exe signaler  # Windows
which signaler      # Unix/Mac

# Test it
signaler --version
```

### Expected Output
You should see the Signaler CLI help text without any errors.

## Using in Your Project

```bash
cd /path/to/your/project
signaler wizard
signaler audit
```

## Troubleshooting

### "signaler: command not found" in Git Bash

**Solution:** Run the setup script (see "Git Bash Setup" above)

```bash
# Quick fix - download and run setup
curl -o setup.sh https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh
bash setup.sh
```

### PowerShell Execution Policy Error

If you get execution policy errors in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then try the installation again.

### Reinstall

If you need to reinstall:

```bash
# Uninstall
npm uninstall -g @signaler/cli

# Clear cache
npm cache clean --force

# Reinstall
npx jsr add @signaler/cli

# Run setup again for Git Bash
bash setup-bash-wrapper.sh
```

## Package Information

- **Name:** @signaler/cli
- **Version:** 1.0.11
- **Published:** January 15, 2026
- **JSR URL:** https://jsr.io/@signaler/cli
- **Repository:** https://github.com/Dendro-X0/signaler

## What's New in v1.0.11

- ✅ Git Bash support via setup script
- ✅ One-time setup creates bash wrapper automatically
- ✅ Works in Git Bash, PowerShell, CMD, and Unix terminals
- ✅ Simple `signaler` command works everywhere after setup
- ✅ No need for aliases or workarounds

## Support

If you encounter issues:

1. Run the setup script for Git Bash support
2. Check this guide for common solutions
3. Check the GitHub repository for updates

---

**Status:** ✅ Package successfully published and working  
**Git Bash:** ✅ Supported via one-time setup script  
**Recommended:** Run the setup script after installation
