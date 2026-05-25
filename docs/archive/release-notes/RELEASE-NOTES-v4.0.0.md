# Release Notes - v4.0.0

**Date:** 2026-05-24  
**Package:** `@signaler/cli@4.0.0` (JSR + npm metadata)

## Summary

Signaler 4.0.0 is a **CLI surface and onboarding** release. `signaler audit` is now the end-to-end agent path (discover → run → analyze), managed serve can start **`pnpm dev`** automatically, and throughput performance is labeled **P(ref)** so it is not confused with Chrome DevTools scores.

## Highlights

### CLI (breaking)

- **`signaler audit`** — orchestrator (discover → run v3 → analyze v6). No longer an alias of `run`.
- **`signaler run`** — Lighthouse runner only (previous `audit` behavior).
- Shell argv dispatch in `src/shell/`; `bin.ts` delegates to `dispatchShellCommand`.
- **`@signaler/cli/engine`** export for programmatic jobs and managed serve.

### Onboarding

- Interactive shell: `discover` → `audit` (see `docs/guides/greenfield-wizard.md`).
- Wizard first audit uses **`--managed-serve-mode auto`** (dev server first, production fallback).
- Default discover scope **full** for audits (all static routes).
- Route plan filters and **incremental skip** for passing combos.

### Performance UX

- Default parallel **4–6** on capable hardware (was often capped at 2).
- **P(ref)** labeling in CLI, `report.html`, and `agent-index.json` (`performanceScoreSemantics`).
- Throughput vs fidelity guidance in trust notes and reports.

## Migration

See [`docs/guides/migration-v4.md`](../../guides/migration-v4.md).

| v3 habit | v4 canonical |
|----------|----------------|
| `signaler audit` (Lighthouse only) | `signaler run` |
| Full agent loop | `signaler audit` or `signaler job run --preset agent` |

## Install (JSR)

```bash
npx jsr add @signaler/cli@4.0.0
# or
pnpm dlx jsr add @signaler/cli@4.0.0
```

After install, use `signaler install-shim` for global `signaler` on PATH (see README).

## Verification

```bash
signaler --version   # 4.0.0
signaler audit --help
pnpm run release:preflight
```
