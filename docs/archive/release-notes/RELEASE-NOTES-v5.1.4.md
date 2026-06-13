# Release Notes - v5.1.4

**Date:** 2026-06-13  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Fixes `signaler upgrade` on Windows when extracting the portable release zip.

## Fixed

- **`signaler upgrade` (Windows)** — `Expand-Archive` was invoked with escaped quotes (`\"C:\...\"`), which PowerShell treated as a `\C:` drive path. Extraction now uses single-quoted `-LiteralPath` / `-DestinationPath` arguments.

## Upgrade

If `signaler upgrade` failed on 5.1.3, re-run the install script:

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

Or after installing 5.1.4:

```bash
signaler upgrade
```
