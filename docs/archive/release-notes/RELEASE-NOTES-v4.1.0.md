# Release Notes - v4.1.0

**Date:** 2026-05-25  
**Package:** `@signaler/cli@4.1.0` (JSR)

## Summary

Signaler 4.1.0 is an **adoptability and reliability** release after v4.0.0. No breaking CLI changes. Focus: green CI, portable tests, team-facing docs, and JSR publish hygiene.

## Highlights

### Documentation (Phase 1 kickoff)

- B2B / team value guide and v4.1–v5 roadmap (`docs/guides/b2b-team-value.md`, `docs/roadmap/v4-b2b-roadmap.md`).
- Phase 1 adoptability plan and dogfood checklist.
- README **For teams** section with P(ref) trust links and v4 `signaler audit` quick start.

### CI and tests

- Vitest CI mode: serial file runs, mock cleanup, longer timeouts, GitHub Actions log artifacts.
- Managed-serve tests use committed fixtures (no machine-specific `E:/` paths).
- Coverage thresholds realigned to post-v4 baseline (~36% lines).

### Unchanged from 4.0.0

- `signaler audit` orchestrator, managed serve, `@signaler/cli/engine` export.
- Migration: still on v4 — see [`docs/guides/migration-v4.md`](../../guides/migration-v4.md).

## Install (JSR)

```bash
npx jsr add @signaler/cli@4.1.0
pnpm dlx jsr add @signaler/cli@4.1.0
```

## Verification

```bash
signaler --version   # 4.1.0
signaler audit --help
npx jsr run @signaler/cli@4.1.0 -- --version
```

## Upgrade from 4.0.0

Drop-in replacement. Re-run your usual audit or CI preset; no config migration required.
