# Release Notes - v5.0.2

**Date:** 2026-06-09  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Distribution release: **npm and JSR are deprecated**. GitHub Release portable zip, Windows installer, and `install.sh` / `install.ps1` are the only supported install paths.

Includes 5.0.1 install fixes (`cli-entry`, Git Bash paths, install-shim).

## Changed

- **Distribution policy** — registry channels abandoned; see [distribution policy](../../specs/distribution-policy.md).
- **GitHub Action** — installs from GitHub Release via `install.sh`, not `npx jsr run`.
- **Documentation** — installation, release playbook, and troubleshooting updated for native packaging only.

## Install

**Git Bash / macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
```

**Windows PowerShell:**

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

Or download `signaler-5.0.2-portable.zip` / `signaler-5.0.2-windows-setup.exe` from [GitHub Releases](https://github.com/Dendro-X0/signaler/releases).

## Upgrade from 5.0.1

```bash
signaler upgrade
```

Or re-run the install script for your platform.
