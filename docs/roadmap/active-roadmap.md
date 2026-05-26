# Active Roadmap

Status: Active  
Updated: 2026-05-25

## Current focus

**Phase 2 — v4.2.0 Team CI pack** (kickoff)

Canonical plan: [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md)  
Strategy: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)  
Action guide: [`../guides/github-actions.md`](../guides/github-actions.md)

### Phase 2 deliverables (in flight)

| ID | Item | Status |
|----|------|--------|
| 4.2.1 | Composite GitHub Action | Done |
| 4.2.2 | Artifact upload in Action | Done |
| 4.2.3 | Job summary (report + perf query) | Done |
| 4.2.5 | GitHub Actions guide + monorepo notes | Done |
| 4.2.6 | Workflow templates (managed serve) | Done |
| 4.2.4 | Check Run annotations | Todo |
| 4.2.7 | CI exit-code documentation | Todo |
| 4.2.8 | Meta-CI dogfood workflow | Todo |

### Next implementation slice

1. Add `signaler-dogfood.yml` (`workflow_dispatch`)
2. Document exit codes for Action failure semantics
3. **JSR publish:** `package.json` + `jsr.json` at **4.2.0** on `main` (done); retag `v4.2.0` to that commit before re-running GitHub Release

## Shipped — Phase 1 (v4.1.x)

Adoptability: B2B docs, CI stability, portable tests, README for teams.  
Git line at **4.1.0**; JSR publish when ready (skip if already satisfied on git only).

Details: [`phase1-v4.1-adoptability.md`](./phase1-v4.1-adoptability.md)

## Shipped — v4.0.0

CLI orchestrator, shell/engine split, managed dev serve, `@signaler/cli/engine`.

## Next phases (planned)

| Phase | Version | Doc |
|-------|---------|-----|
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
