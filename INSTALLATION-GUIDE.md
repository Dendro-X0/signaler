# Installation Guide - Signaler CLI v1.0.10

## ✅ Successfully Published to JSR

The package has been published to JSR and is ready to use!

**JSR Package:** https://jsr.io/@signaler/cli@1.0.10

## Installation

```bash
npx jsr add @signaler/cli
```

This installs the CLI globally to:
```
C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd
```

## Usage

### Option 1: Use in PowerShell (Recommended)

The `.cmd` wrapper works perfectly in PowerShell:

```powershell
# Open PowerShell
signaler --version
signaler wizard
signaler audit
```

### Option 2: Use in Git Bash (Direct Node Execution)

Since `.cmd` files don't work well in Git Bash, run the CLI directly with Node:

```bash
# From anywhere (using the installed version)
node "C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd"

# Or use the wrapper scripts in the signaler directory
cd signaler
./run.sh wizard
./run.ps1 audit
```

### Option 3: Run from Source (Development)

```bash
cd signaler
node dist/bin.js wizard
node dist/bin.js audit
```

## Verification

### In PowerShell:
```powershell
where.exe signaler
# Should show: C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd

signaler --version
# Should show help text
```

### In Git Bash:
```bash
# Check installation
ls -la "C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd"

# Run directly
node "C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd" --version
```

## Using in Your Project

### PowerShell:
```powershell
cd C:\path\to\your\project
signaler wizard
```

### Git Bash:
```bash
cd /c/path/to/your/project
node "C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd" wizard
```

Or create an alias in your `.bashrc`:
```bash
alias signaler='node "C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd"'
```

Then you can use:
```bash
signaler wizard
signaler audit
```

## Troubleshooting

### "signaler: command not found" in Git Bash

This is expected - `.cmd` files don't work in Git Bash. Use one of these solutions:

1. **Switch to PowerShell** (recommended)
2. **Run with Node directly:** `node "C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd"`
3. **Create a Bash alias** (see above)
4. **Use the wrapper scripts** in the signaler directory

### PowerShell Execution Policy Error

If you get execution policy errors in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then try the installation again.

### Reinstall

If you need to reinstall:

```bash
# Uninstall (in PowerShell)
npm uninstall -g @signaler/cli

# Clear cache
npm cache clean --force

# Reinstall
npx jsr add @signaler/cli
```

## Package Information

- **Name:** @signaler/cli
- **Version:** 1.0.10
- **Published:** January 15, 2026
- **JSR URL:** https://jsr.io/@signaler/cli
- **Repository:** https://github.com/Dendro-X0/signaler

## What's New in v1.0.10

- ✅ Verified JSR package with proper shebang
- ✅ Resolved Bun runtime error (old executable issue)
- ✅ All tests passing (27/27)
- ✅ Clean package with no circular dependencies
- ✅ Comprehensive documentation

## Support

If you encounter issues:

1. Check this guide for common solutions
2. Try running directly with Node.js
3. Use PowerShell instead of Git Bash
4. Check the GitHub repository for updates

---

**Status:** ✅ Package successfully published and working  
**Recommended:** Use PowerShell for the best experience
