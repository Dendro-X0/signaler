# Signaler Scripts

This directory contains helper scripts for agent bootstrap, release preflight, and shell shims.

## Recommended Path (Global Install)

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

Then use:

```bash
signaler <args>
signalar <args>
signaler upgrade
signaler uninstall --global
```

## Lightweight Shim Fallback

If you do not want the portable global install, you can still install small wrappers in a JSR-driven environment:

```bash
npx jsr run @signaler/cli install-shim
```

This shim proxies to:

```bash
npx jsr run @signaler/cli <args>
```

## Shell Shim Scripts

### `setup-bash-wrapper.sh`

Creates `signaler` and `signalar` shims in a PATH-friendly directory for Git Bash.

Usage:

```bash
bash setup-bash-wrapper.sh
```

### `setup-bash-wrapper.ps1`

Creates `signaler`, `signalar`, `signaler.cmd`, and `signalar.cmd` shims in `%APPDATA%\npm`.

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
pnpm run jsr:publish -- --allow-dirty
```

### `create-portable-release.js`

Builds the GitHub Release assets required by the portable installer flow.

Usage:

```bash
pnpm run release:portable -- --version 3.1.5
```

Outputs:

- `release/signaler-<version>-portable.zip`
