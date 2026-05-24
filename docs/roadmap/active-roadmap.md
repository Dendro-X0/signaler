# Active Roadmap

Status: Active  
Updated: 2026-05-24

## Current focus

**Phase 1 — v3.3.x: Agent happy path**

Canonical plan: [`version-roadmap.md`](./version-roadmap.md)

### In progress / next implementation

| ID | Item | Status |
|----|------|--------|
| 3.3.1 | Agent preset `--parallel` (default `SIGNALER_PARALLEL` or 6) | In progress |
| 3.3.2 | Job exit codes 0 / 1 / 2 | In progress |
| 3.3.3 | Managed-serve build failure hints | In progress |
| 3.3.4 | `AGENTS.md` golden-path command | Pending |
| 3.3.5 | Dogfood gate (blogkit + ecommerce) | Manual ✓ (2026-05-24) |

### Recently shipped (v3.2.x)

- Engine contracts bootstrap (`src/engine-contracts/`)
- Engine isolation + in-process job runner
- Managed production serve v1 + auto port
- `run --managed-serve`; analyze soft-fail when triage exists

## North-star (stable)

1. One agent command → `.signaler/agent-index.json` + triage + analyze
2. Production-like audits via managed serve
3. Quick scope under ~5 minutes when build is cached
4. Issue-count triage over headline scores

## Deferred

- Desktop / VS Code primary shell → `docs/specs/desktop-implementation-plan.md`
- Full `cli.ts` split → Phase 4 (v4.0)
- Distribution push/tag/assets → user-scheduled

## Archive

- Reboot vision: `ROADMAP.md` (product shell questions)
- Completed tracks: `docs/archive/roadmaps/`
