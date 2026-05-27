# Active Roadmap

Status: Active  
Updated: 2026-05-25

## Current focus

**v4.3.0 release** — Phase 3 policy gates shipped on git; tag + JSR when CI is green.

Canonical plan: [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md)

### Phase 3 (v4.3.0 — shipped)

Run profiles, qualityGate, baselineCompare, delta comparability, exit-code docs, dogfood workflow.

### Phase 4 (v5.0 — next, partial on main)

First slice `--quality-profile web-quality` exists in code but is **Unreleased** until Phase 4 exit criteria. See [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md).

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
