# Release Notes - v4.3.0

**Status:** In development  
**Package:** `@signaler/cli@4.3.0` (JSR + GitHub Release when shipped)

## Summary

Signaler 4.3.0 is the **policy gates** release: named run profiles for CI, quality gates in config (planned), and baseline-aware PR failure semantics (planned).

## Added (in progress)

- **`--run-profile`** on `signaler job run` and `signaler audit`:
  - `ci-strict` — full discover, throughput run, `--fail-on-budget`
  - `pr-quick` — changed-files run + analyze (no discover)
  - `release-full` — full discover, **fidelity** mode, parallel 2
- Meta-CI **dogfood** workflow (`workflow_dispatch`) for profile smoke checks

## Planned before GA

- Quality gate block in `signaler.config.json`
- Baseline compare for PR CI (`query --view delta` + `--baseline`)
- Exit code matrix in docs and GitHub Action annotations

## Upgrade from 4.2.0

```bash
npx jsr add @signaler/cli@4.3.0
```

```bash
# CI strict gate (replaces manual preset + flags)
signaler job run --run-profile ci-strict --managed-serve --in-process --base-url http://127.0.0.1:3000
```
