# Active Roadmap

Status: Active  
Updated: 2026-05-25

## Current focus

**Phase 3 — v4.3.0 Policy gates** (in development)

Canonical plan: [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md)  
Strategy: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)  
CI guide: [`../guides/github-actions.md`](../guides/github-actions.md)

### Phase 3 deliverables (in flight)

| ID | Item | Status |
|----|------|--------|
| 4.3.1 | Named run profiles (`ci-strict`, `pr-quick`, `release-full`) | Done |
| 4.3.4 | Exit code matrix (docs + Action semantics) | Done |
| 4.2.8 | Meta-CI dogfood workflow | Done |
| 4.3.2 | Quality gate block in config | Todo |
| 4.3.3 | Baseline compare in CI | Todo |
| 4.3.5 | Comparability hash in PR output | Todo |
| 4.2.4 | Check Run annotations (optional) | Todo |

### Next implementation slice

1. `qualityGate` schema in `signaler.config.json` + enforce on `run --ci`
2. `--baseline` for `query --view delta` in Action job summary
3. Document “when deltas lie” (throughput, scope, build id)

## Shipped — Phase 2 (v4.2.0)

Team CI pack: composite Action, job summary, workflow templates, portable + Windows installer releases.

Details: [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md)

## Shipped — Phase 1 (v4.1.x) / v4.0.0

See phase docs under [`roadmap/`](./README.md).

## Next phases (planned)

| Phase | Version | Doc |
|-------|---------|-----|
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
