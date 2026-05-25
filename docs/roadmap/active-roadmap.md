# Active Roadmap

Status: Active  
Updated: 2026-05-24

## Current focus

**Phase 4 — v4.0.0: CLI surface cleanup** (in progress)

Canonical plan: [`version-roadmap.md`](./version-roadmap.md)

### Phase 4 deliverables

| ID | Item | Status |
|----|------|--------|
| 4.0.1 | Remove `audit` → `run` alias | Done |
| 4.0.2 | `signaler audit` orchestrator (discover + managed-serve + run + analyze) | Done |
| 4.0.3 | Shell owns argv/dispatch (`src/shell/`) | Done |
| 4.0.4 | `@signaler/cli/engine` programmatic export | Done |
| 4.0.5 | v4 migration guide | Done |
| — | Split `cli.ts` below ~2k lines | Deferred |

### Phase 3 (v3.5.x) — shipped

- Discover coverage, `report --summary`, MDX routes, agent-index job exit codes
- Commit: `66cef7e`

### Phase 2 (v3.4.x) — shipped

- Managed serve hardening — commit: `a42fdfc`

## Next

- Dogfood `signaler audit` on ecommerce monorepo
- Optional: extract `cli.ts` run modules; version bump 4.0.0

## North-star (stable)

1. One agent command → canonical artifacts → `query` / `explain`
2. Production-like audits via managed serve
3. Quick scope under ~5 minutes when build is cached
4. Issue-count triage over headline scores

## Archive

- Reboot vision: `ROADMAP.md`
- Completed tracks: `docs/archive/roadmaps/`
