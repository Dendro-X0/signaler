# Release Notes - v4.3.0

**Date:** 2026-05-26  
**Package:** `@signaler/cli@4.3.0` (JSR + GitHub Release)

## Summary

Signaler 4.3.0 is the **policy gates** release: named run profiles for CI, configurable quality gates, and baseline-aware PR regression checks with comparability warnings.

## Highlights

### Run profiles

- **`--run-profile`** on `signaler job run` and `signaler audit`:
  - `ci-strict` — full discover, throughput run, `--fail-on-budget`, `--fail-on-quality-gate`, `--fail-on-baseline-compare`
  - `pr-quick` — changed-files run + analyze, baseline compare
  - `release-full` — full discover, **fidelity** mode, parallel 2

### Quality gate (`qualityGate` in config)

- Max red performance issue counts, min category scores, optional `requireHeadersPass`
- Writes `.signaler/quality-gate.json`; exit 1 under `--ci` or `--fail-on-quality-gate`

### Baseline compare (`baselineCompare` in config)

- PR vs main via `signaler query --view delta --baseline <dir>`
- `--fail-on-regression` and comparability warnings in delta JSON
- GitHub Action input `baseline-artifacts-path`

### CI / docs

- Meta-CI **dogfood** workflow (`workflow_dispatch`) for profile smoke checks
- Exit code matrix in [`docs/guides/github-actions.md`](../../guides/github-actions.md)
- [`docs/guides/when-deltas-lie.md`](../../guides/when-deltas-lie.md) for throughput mode and scope caveats

## Install (JSR)

```bash
npx jsr add @signaler/cli@4.3.0
```

## Quick start (CI strict)

```bash
signaler job run --run-profile ci-strict --managed-serve --in-process --base-url http://127.0.0.1:3000
```

Example config:

```json
{
  "qualityGate": {
    "maxRedPerfIssues": 0,
    "minCategoryScores": { "accessibility": 90, "seo": 90 }
  },
  "baselineCompare": {
    "baselineDir": ".signaler-main",
    "maxRedIncrease": 0,
    "requireComparabilityMatch": true
  }
}
```

## Upgrade from 4.2.0

No breaking CLI changes. Bump the Action `cli-version` input to `4.3.0` when using `@signaler/cli` from JSR in CI.
