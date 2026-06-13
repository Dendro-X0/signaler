# Release Notes - v5.1.5

**Date:** 2026-05-28  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Aligns Windows Git Bash installs with the PowerShell install location and ships documentation aimed at credible open-source onboarding.

## Fixed

- **`install.sh` on Windows Git Bash** — installs to `%LOCALAPPDATA%\signaler\` instead of `~/.local/share/signaler/`, matching `install.ps1` and `signaler upgrade` / `uninstall --global` path resolution. Writes `signaler.cmd` / `signalar.cmd` launchers in addition to bash wrappers.

## Changed

- **README and docs** — value proposition, 15-minute eval path, install matrix (OS × shell), corrected `audit` vs `run` guidance, distribution limits, Windows upgrade troubleshooting.
- **Docs site** — syncs installation guides; landing hero and quick-start use GitHub Release install commands (not npm/JSR).

## Upgrade

Re-run your original install method with a pinned version:

```bash
SIGNALER_VERSION=5.1.5 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.5"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

If you previously installed via Git Bash into `~/.local/share/signaler/`, remove that directory after reinstalling so lifecycle commands target a single location.
