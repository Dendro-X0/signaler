# Signaler Scripts

This directory contains helper scripts for agent bootstrap, release preflight, and shell shims.

## Recommended Path (JSR Install)

After installing via JSR:

```bash
npx jsr add @signaler/cli
```

install a direct `signaler` command once:

```bash
npx jsr run @signaler/cli install-shim
```

This installs lightweight shims that proxy to:

```bash
npx jsr run @signaler/cli <args>
```

## Shell Shim Scripts

### `setup-bash-wrapper.sh`

Creates `signaler` shim in a PATH-friendly directory for Git Bash.

Usage:

```bash
bash setup-bash-wrapper.sh
```

### `setup-bash-wrapper.ps1`

Creates `signaler` and `signaler.cmd` shims in `%APPDATA%\npm`.

Usage:

```powershell
pwsh -ExecutionPolicy Bypass -File setup-bash-wrapper.ps1
```

## Agent Bootstrap Scripts

### `agent-bootstrap.sh`
### `agent-bootstrap.ps1`

Bootstrap the canonical loop:

1. `discover`
2. `run --contract v3 --mode throughput`
3. `report`

## Release Scripts

### `release.js`

Deterministic release preflight runner.

Usage:

```bash
pnpm run release -- --target-version <version>
pnpm run release -- --target-version <version> --require-cross-platform --strict
```

### `jsr-publish.js`

Publish helper with package-root and version-sync checks.

Usage:

```bash
pnpm run jsr:publish -- --dry-run
pnpm run jsr:publish
```

