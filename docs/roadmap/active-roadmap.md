# Active Roadmap

Status: Active  
Updated: 2026-05-25

## Current focus

**Phase 1 — v4.1.x Adoptability** (kickoff)

Canonical plan: [`phase1-v4.1-adoptability.md`](./phase1-v4.1-adoptability.md)  
Strategy: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)  
Positioning: [`../guides/b2b-team-value.md`](../guides/b2b-team-value.md)

### Phase 1 deliverables (in flight)

| ID | Item | Status |
|----|------|--------|
| 4.1.7 | Portable test fixtures (no `E:/` paths in CI) | Done |
| 4.1.8 | Roadmap docs + active roadmap sync | Done |
| 4.1.1 | Patch release on JSR (`4.0.1` / `4.1.0`) | Todo |
| 4.1.2 | Trust doc on README + site (P ref, throughput) | In progress |
| 4.1.3 | Team onboarding cross-links | In progress |
| 4.1.4 | JSR install smoke documented | Todo |
| 4.1.5 | CI template audit (`preset ci`) | Todo |
| 4.1.6 | Dogfood checklist | Done |

### First implementation slice (start here)

1. README “For teams” + trust links → [`phase1-v4.1-adoptability.md`](./phase1-v4.1-adoptability.md#kickoff--first-implementation-slice)
2. Run [`dogfood-checklist.md`](../operations/dogfood-checklist.md) on one reference app
3. Bump `4.1.0` when doc slice + green CI land

## Shipped — v4.0.0

| ID | Item | Status |
|----|------|--------|
| 4.0.1 | Remove `audit` → `run` alias | Done |
| 4.0.2 | `signaler audit` orchestrator | Done |
| 4.0.3 | Shell owns argv/dispatch | Done |
| 4.0.4 | `@signaler/cli/engine` export | Done |
| 4.0.5 | v4 migration guide | Done |
| — | JSR `@4.0.0` publish | Done |
| — | CI green (test matrix + coverage) | Done |

Historical phases (v3.3–v3.5): [`version-roadmap.md`](./version-roadmap.md)

## Next phases (planned)

| Phase | Version | Doc |
|-------|---------|-----|
| 2 | v4.2.0 Team CI pack | [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md) |
| 3 | v4.3.0 Policy gates | [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md) |
| 4 | v5.0.0 Quality profiles | [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md) |

## North-star (stable)

1. One agent command → canonical artifacts → `query` / `explain`
2. Production-like audits via managed serve
3. Quick scope under ~5 minutes when build is cached
4. Issue-count triage over headline scores
5. Teams install from JSR / CI without support chat

## Index

- [`roadmap/README.md`](./README.md)

## Archive

- Reboot vision: `ROADMAP.md` (repo root)
- Completed tracks: `docs/archive/roadmaps/`
