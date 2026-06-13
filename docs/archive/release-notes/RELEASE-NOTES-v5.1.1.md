# Release Notes - v5.1.1

**Date:** 2026-05-29  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Install UX patch: visible four-step progress, elapsed timing, and faster dependency installs via bundled `package-lock.json` (`npm ci`).

## Changed

- **`install.sh` / `install.ps1`** — numbered steps (resolve → download → extract → dependencies), download timing, curl progress bar on TTY, npm log output or elapsed counter when piped, total install time summary.
- **`signaler upgrade`** — same dependency progress messages and `npm ci` when lockfile is present.
- **Portable release build** — generates `package-lock.json` in the zip for reproducible, faster end-user installs.
- **Installation docs** — documents expected 5–15 minute first install and why.

## Upgrade from 5.1.0

```bash
signaler upgrade
```

Or re-run the install script for your platform.
