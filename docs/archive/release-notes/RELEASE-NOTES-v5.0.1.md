# Release Notes - v5.0.1

**Date:** 2026-06-08  
**Package:** `@signaler/cli@5.0.1` (JSR patch)

## Summary

Patch release fixing **CLI distribution and installation** for JSR consumers and Git Bash on Windows. No audit/orchestration behavior changes from 5.0.0.

## Fixed

- **JSR project install** — `src/cli-entry.ts` is the supported Node entrypoint; `import.meta.main` and Git Bash path normalization prevent silent no-op runs.
- **JSR publish payload** — stop shipping `dist/` in JSR tarballs (JSR rewrites those imports to `npm:` URLs, which Node cannot load).
- **`install-shim`** — resolves project-local `@signaler/cli/src/cli-entry.js` or portable global install instead of broken `npx jsr run`.
- **Documentation** — [Installation guide](../../guides/installation.md) documents correct JSR add commands and Git Bash vs PowerShell installers.

## Install

**Global (Git Bash / macOS / Linux):**

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

**Project (JSR):**

```bash
npx jsr add @signaler/cli@5.0.1 --pnpm
```

```json
"scripts": {
  "signaler": "node node_modules/@signaler/cli/src/cli-entry.js"
}
```

## Upgrade from 5.0.0

- No config or artifact contract changes.
- Re-run `npx jsr add @signaler/cli@5.0.1 --pnpm` in consuming projects.
- Replace any `dist/bin.js` or `npx jsr run` shim usage with `src/cli-entry.js`.
