# Active Roadmap

Status: Active  
Updated: 2026-05-24

## Current focus

**Phase 2 — v3.4.x: Production serve hardening** (in progress)

Canonical plan: [`version-roadmap.md`](./version-roadmap.md)

### Phase 2 deliverables

| ID | Item | Status |
|----|------|--------|
| 3.4.1 | Webpack build fallback after primary build failure | Done |
| 3.4.2 | Monorepo `nextAppRoot` (`apps/web`) for BUILD_ID + fallback | Done |
| 3.4.3 | `--managed-serve-reuse` for non-2xx servers | Done |
| 3.4.4 | Fresh build detection (BUILD_ID vs package.json mtime) | Done |
| 3.4.5 | Serve plan + probe tests | Done |

### Phase 1 (v3.3.x) — shipped

- Agent preset parallel 6, job exit codes 0/1/2
- Managed serve v1, engine isolation, version roadmap
- Commit: `435f90b`

## Next

Phase 3 (v3.5): discover coverage %, `report --summary`, MDX route improvements

## North-star (stable)

1. One agent command → canonical artifacts → `query` / `explain`
2. Production-like audits via managed serve
3. Quick scope under ~5 minutes when build is cached
4. Issue-count triage over headline scores

## Archive

- Reboot vision: `ROADMAP.md`
- Completed tracks: `docs/archive/roadmaps/`
