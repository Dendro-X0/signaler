# Active Roadmap

Status: Active  
Updated: 2026-05-25

## Current focus

**v5.0.0 quality profiles** — `web-quality` bundles Lighthouse ci-strict + headers + links + bundle.

Canonical plan: [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md)

### Phase 4 (in progress on git 5.0.0 line)

- `--quality-profile web-quality` on `audit` / `job run`
- `quality-pack.json` unified exit after side runners
- `qualityPack` config thresholds

### Next implementation slice

1. Agent-index merge for pack findings
2. GitHub Action `quality-profile` input
3. Optional: tag `v5.0.0` after dogfood on a real app

### CI manual trigger

`ci.yml` includes `workflow_dispatch`. On GitHub: **Actions → CI → Run workflow**.

If pushes never trigger workflows, check repo **Settings → Actions** (enabled) and that commits land on `main` or `develop`.

## Shipped — Phase 2 (v4.2.0)

Team CI pack. Details: [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md)

## Next phases (planned)

| Phase | Version | Doc |
|-------|---------|-----|
| 4 | v5.0.0 Quality profiles | [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md) |

## Index

- [`roadmap/README.md`](./README.md)
