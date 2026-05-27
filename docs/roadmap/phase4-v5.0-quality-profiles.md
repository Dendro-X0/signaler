# Phase 4 — v5.0 Quality profiles

Status: **In development** (first slice on `main`; version line opens at **5.0.0** after v4.3.0 ships)  
Last updated: 2026-05-26

## Goal

One command runs Lighthouse policy gates plus existing side runners, producing one pack artifact and one CI exit code.

## First slice (on git `main`, unreleased)

```bash
signaler audit --quality-profile web-quality --cwd /path/to/app --base-url http://127.0.0.1:3000
# or
signaler job run --quality-profile web-quality --managed-serve --in-process
```

**`web-quality`** job steps:

1. `discover` (full) → `run` (ci-strict flags) → `analyze` (v6 lean)
2. `headers` → `links` → `bundle`
3. Post-job **`quality-pack.json`** gate (headers failures, broken links, bundle presence)

## Config

```json
{
  "qualityPack": {
    "maxHeaderFailures": 0,
    "maxBrokenLinks": 0
  }
}
```

## Exit semantics

| Source | When it fails the job |
|--------|------------------------|
| Run step | Budget, quality gate, baseline compare (ci-strict) |
| Side runners | Non-zero step exit (spawn errors) |
| Pack gate | Missing artifacts or thresholds in `quality-pack.json` |

Prior job step failures are preserved; pack gate runs only when the job runner returns.

## Next slices

- [ ] Merge pack findings into `agent-index.json` (single agent read surface)
- [ ] GitHub Action input `quality-profile`
- [ ] Optional bundle byte budgets in `qualityPack`
- [ ] `pr-quality` profile (changed-only + pack)

## Related

- [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)
- [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md)
