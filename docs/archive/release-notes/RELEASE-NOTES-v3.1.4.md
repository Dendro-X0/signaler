# Release Notes - v3.1.4

Release date: 2026-04-06  
Status: Published patch

## Highlights

- GitHub Releases are now the primary global distribution channel for Signaler.
- Added `install-shim` command to restore direct `signaler` command ergonomics after JSR installs.
- Added portable installer scripts for direct global installation:
  - `release-assets/install.ps1`
  - `release-assets/install.sh`
- Corrected installation and troubleshooting docs so global install now points to the portable installer path, with `install-shim` retained as a fallback.
- Added compatibility launcher alias:
  - `signalar`

## Quick Start (Global Install)

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
```

If you need a lightweight JSR-oriented wrapper instead:

```bash
npx jsr run @signaler/cli install-shim
```
