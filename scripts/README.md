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

### agent-bootstrap.md
Copy/paste bootstrap blocks for agents (bash + PowerShell) that run:

1. `discover`
2. `run --contract v3 --mode throughput`
3. `report`

### agent-bootstrap.sh
Executable bash bootstrap helper for the same canonical sequence.

**Usage:**
```bash
bash agent-bootstrap.sh
```

### agent-bootstrap.ps1
Executable PowerShell bootstrap helper for the same canonical sequence.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File agent-bootstrap.ps1
```

### v3-release-manifest.ts
Generate a machine-readable V3 release manifest from known assets and gate reports.

**Usage:**
```bash
pnpm run v3:manifest generate --version 3.0.0-rc.1 --channel rc --asset <path> --gate <path>
```

### v3-release-manifest-smoke.ts
Create a local `.tgz` package artifact and emit/validate `release/v3/release-manifest.generated.json`.

**Usage:**
```bash
pnpm run v3:manifest:smoke
```

### v3-release-manifest-validate.ts
Validate manifest schema + packaging policy (`.tgz`, required gates, checksums, install helper scripts).

**Usage:**
```bash
pnpm run v3:manifest:validate
```

### release.js
Deterministic V3 release preflight runner.

It validates:

1. version sync (`package.json` + `jsr.json`)
2. required docs/release assets
3. gate report statuses (`v3`, `phase6`, `v6.3`)
4. optional cross-platform smoke evidence

It also emits a machine-readable report at `release/v3/release-preflight.json` (default).

**Usage:**
```bash
pnpm run release -- --target-version 3.0.0-rc.1
pnpm run release -- --target-version 3.0.0-rc.1 --require-cross-platform --strict
pnpm run release -- --dry-run
```

Package-script aliases (from repo root):

```bash
corepack pnpm run agent:bootstrap:sh
corepack pnpm run agent:bootstrap:ps
```

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
