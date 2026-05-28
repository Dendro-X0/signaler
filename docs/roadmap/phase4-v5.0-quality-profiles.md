# Phase 4 — v5.0 Quality profiles

Status: **Deferred** (implemented, release postponed)  
Last updated: 2026-05-28

## Goal

One command runs Lighthouse policy gates plus existing side runners, producing one pack artifact and one CI exit code.

## Implemented on v5.0.0 line (not released)

```bash
signaler audit --quality-profile web-quality --cwd /path/to/app --base-url http://127.0.0.1:3000
```

**`web-quality`** job steps:

1. `discover` (full) → `run` (ci-strict flags) → `analyze` (v6 lean)
2. `headers` → `links` → `bundle`
3. Post-job **`quality-pack.json`** gate + **agent-index** pack pointers

## Done

- [x] `--quality-profile web-quality` on `audit` / `job run`
- [x] `--quality-profile pr-quality` (changed-only + pack)
- [x] `qualityPack` config + `quality-pack.json`
- [x] Agent-index merge for pack + side-runner entrypoints
- [x] GitHub Action `quality-profile` input

## Follow-up

- [ ] Optional bundle byte budgets in `qualityPack`
- [ ] Revalidate release readiness after v4.x stabilization (`phase4.4-v4x-stabilization.md`)

## Related

- [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)
- [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md)
