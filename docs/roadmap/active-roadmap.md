# Active Roadmap

Status: Active  
Updated: 2026-05-25

## Current focus

**v4.3.0 policy gates** — feature-complete on `main`; release polish and optional CI annotations.

Canonical plan: [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md)

### Phase 3 (shipped on git 4.3.0 line)

Run profiles, qualityGate, baselineCompare, delta comparability, exit-code docs, dogfood workflow.

### Next implementation slice

1. Finalize `RELEASE-NOTES-v4.3.0` and JSR publish
2. Tag `v4.3.0` after green CI (use **Actions → CI → Run workflow** if push did not trigger)
3. Optional: Check Run annotations hardening (4.2.4)

### CI manual trigger

`ci.yml` includes `workflow_dispatch`. On GitHub: **Actions → CI → Run workflow**.

If pushes never trigger workflows, check repo **Settings → Actions** (enabled) and that commits land on `main` or `develop`.

## Shipped — Phase 2 (v4.2.0)

Team CI pack. Details: [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md)

## Next phases (planned)

| Phase | Version | Doc |
|-------|---------|-----|
| 4 | v5.0.0 Quality profiles | [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md) |

## Index

- [`roadmap/README.md`](./README.md)
