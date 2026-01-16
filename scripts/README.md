# Signaler CLI Setup Scripts

This directory contains setup scripts to enable Git Bash support for the Signaler CLI.

## Scripts

### setup-bash-wrapper.sh
Bash script to create a Git Bash wrapper for Signaler CLI.

**Usage:**
```bash
bash setup-bash-wrapper.sh
```

### setup-bash-wrapper.ps1
PowerShell script to create a Git Bash wrapper for Signaler CLI.

**Usage:**
```powershell
pwsh -ExecutionPolicy Bypass -File setup-bash-wrapper.ps1
```

### postinstall.js
Automatic postinstall script (currently not used by JSR installations).

## Why These Scripts?

JSR installations create a `.cmd` wrapper that works in PowerShell and CMD, but not in Git Bash. These scripts create an additional bash wrapper so the CLI works in all shells.

## One-Time Setup

After installing Signaler via `npx jsr add @signaler/cli`, run one of the setup scripts:

```bash
# Option 1: Using bash
bash setup-bash-wrapper.sh

# Option 2: Using PowerShell
pwsh -ExecutionPolicy Bypass -File setup-bash-wrapper.ps1
```

After running the setup, `signaler` will work in:
- Git Bash ✅
- PowerShell ✅
- CMD ✅
- Unix/Mac terminals ✅

## What the Scripts Do

1. Detect the Signaler installation directory
2. Create a bash wrapper script at `C:\Users\$USER\AppData\Local\signaler\bin\signaler`
3. Make it executable
4. The wrapper calls `node` with the actual CLI script

## Manual Setup

If you prefer to create the wrapper manually:

```bash
cat > "C:\Users\$USER\AppData\Local\signaler\bin\signaler" << 'EOF'
#!/usr/bin/env bash
SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
EOF

chmod +x "C:\Users\$USER\AppData\Local\signaler\bin\signaler"
```

## Troubleshooting

### Script not found
Make sure you're in the `signaler/scripts` directory or provide the full path.

### Permission denied
On Unix/Mac, you may need to make the script executable first:
```bash
chmod +x setup-bash-wrapper.sh
./setup-bash-wrapper.sh
```

### Signaler not found
Ensure Signaler is installed first:
```bash
npx jsr add @signaler/cli
```

Then run the setup script.
