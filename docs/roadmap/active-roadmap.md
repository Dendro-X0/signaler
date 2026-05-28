# Active Roadmap

Status: Active  
Updated: 2026-05-28

## Current focus

**v4.x hardening release train** — postpone v5.0.0 tag/publish and ship issue-focused stabilization as v4.x.

Canonical plan: [`phase4.4-v4x-stabilization.md`](./phase4.4-v4x-stabilization.md)

### Phase 4.4 (v4.x — ready for dogfood/commit)

- Managed-serve startup diagnostics + actionable timeout hints (done)
- Monorepo bundle detection correctness (done)
- Explicit stale-artifact signaling after failed/incomplete runs (done)
- Links "inconclusive" semantics when no URLs discovered (done)
- Quality-pack onboarding guidance (done)
- Analyze category clarity for SEO/a11y/bp audits (done)

### Next slice

1. Re-dogfood both reference apps with rebuilt CLI
2. Commit + ship as **v4.4.0**
3. Re-evaluate v5.0.0 release after stabilization sign-off

### CI manual trigger

`ci.yml` includes `workflow_dispatch`. On GitHub: **Actions → CI → Run workflow**.

If pushes never trigger workflows, check repo **Settings → Actions** (enabled) and that commits land on `main` or `develop`.

## Deferred — Phase 4 (v5.0.0)

Quality profiles are implemented but release/tag is postponed. Details: [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md)

## Shipped — Phase 2 (v4.2.0)

Team CI pack. Details: [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md)

## Next phases (planned)

| Phase | Version | Doc |
|-------|---------|-----|
| 4.4 | v4.x Stabilization | [`phase4.4-v4x-stabilization.md`](./phase4.4-v4x-stabilization.md) |
| 5 | v5.0.0 Quality profiles (deferred) | [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md) |

## Index

- [`roadmap/README.md`](./README.md)
