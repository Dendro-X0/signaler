# Root Cause: Bun Build Script

## What Created the Problem

The script `scripts/build-standalone-bun.sh` (commit `15cc8e9`, January 14, 2026) executed:
```bash
bun build ./dist/bin.js --compile --outfile standalone-binaries/signaler
```

This created a broken executable at `B:\-\BUN\root\signaler-windows-x64.exe` with hardcoded paths that don't exist.

## Why It Was Abandoned

Commit `67b6fd7` (January 14, 2026):
```
fix: switch from Bun to pkg for standalone executables
- Bun compilation failed with locale path resolution issues
```

The project switched to `pkg` because Bun's compiler has a bug with Lighthouse dependencies.

## Current Status

**The issue persists despite:**
- Complete Bun uninstallation
- PATH cleanup
- System restart
- Fresh JSR installation

**The executable remains at:** `B:\-\BUN\root\signaler-windows-x64.exe`

**This is a system-level issue that cannot be fixed through code changes.**

See `KNOWN-ISSUES.md` for complete details.
