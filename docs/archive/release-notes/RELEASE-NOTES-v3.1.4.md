# Release Notes - v3.1.4

Release date: 2026-04-06  
Status: Published patch (JSR)

## Highlights

- Added `install-shim` command to restore direct `signaler` command ergonomics after JSR installs.
- Updated wrapper helper scripts to use `npx jsr run @signaler/cli` proxy behavior.
- Corrected installation and troubleshooting docs for JSR-first usage.

## Quick Start (JSR)

```bash
npx jsr add @signaler/cli
npx jsr run @signaler/cli install-shim
signaler --version
```

If you prefer no shim:

```bash
npx jsr run @signaler/cli --version
```

