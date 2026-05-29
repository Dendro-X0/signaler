# Phase 4.5 — v4.5.0 Artifact layout

Status: **Shipped** (v4.5.0, 2026-05-29)  
Last updated: 2026-05-29

## Goal

Make `.signaler/` navigable for **developers** and **agents** without listing 30+ flat files. Signaler output should reflect that it is a multi-runner orchestrator, not a Lighthouse CI clone.

Spec: [`../specs/artifact-layout-v4.5.md`](../specs/artifact-layout-v4.5.md)

## Why now (post–v4.4.0)

v4.4.0 stabilized trust signals (`artifactStatus`, links discovery, quality-pack guidance). The remaining friction is **discoverability**:

- IDE file trees show an undifferentiated blob at repo root
- `NAVIGATION.md` lists files but does not categorize by audience or runner
- Side-runner outputs (`headers`, `links`, `bundle`) sit beside Lighthouse bulk
- Agents are told not to read `.signaler/` — but humans and debug workflows still must

## User outcomes

| Audience | Today | v4.5 target |
|----------|-------|-------------|
| **Developer** | Hunt among 30 root files | Open `INDEX.md` → `developer/report.html` |
| **Agent** | `query` only (good) + accidental raw reads | `manifest.json` + `agent/entrypoints.json` as stable fallback |
| **CI** | Upload entire `.signaler` | Upload `gates/`, `agent/`, or manifest-selected paths |

## Phased delivery (all target v4.5.0)

### Slice 1 — Manifest + index (foundation)

- [x] `manifest.json` writer with artifact tags (audience, runner, weight)
- [x] `INDEX.md` replaces flat `NAVIGATION.md` (structured sections, not file dump)
- [x] Wire `artifact-freshness` / `query` to read paths from manifest when present
- [x] Tests: manifest schema, entrypoint resolution

### Slice 2 — Side runners → `runners/`

- [x] `runners/headers/`, `runners/links/`, `runners/bundle/` (json + report md) — via post-run materializer
- [x] Update `quality-pack.ts` path resolution
- [x] Root compatibility stubs (dual-write: flat paths retained at root)

### Slice 3 — Agent + developer entrypoints

- [x] `agent/entrypoints.json` with canonical read order
- [x] Copy lean entrypoints under `agent/` (`index.json`, `analyze.json`, …)
- [x] `developer/` for `report.html`, `overview.md`, `triage.md`, side reports
- [x] Lean profile: stop writing non-entrypoint files to root (tree mode prunes flat copies after materialize)

### Slice 4 — Orchestration + gates

- [x] `orchestration/` for `jobs/`, `discovery.json`, `session.json`
- [x] `gates/` for `quality-pack.json`, `quality-gate.json`, `baseline-compare.json`
- [x] `export/` for export payloads

### Slice 5 — Lighthouse tree + archive (optional in v4.5.0)

- [x] `runs/lighthouse/` for run contract files + copy `lighthouse-artifacts/`, `screenshots/`
- [x] `runs/analyze/`, `runs/verify/`
- [x] `archive/` for legacy standard-profile outputs (`issues.json`, `ai-ledger.json`, …)

If slice 5 slips, ship v4.5.0 with slices 1–4 and defer full Lighthouse tree to v4.5.1.

## CLI surface

| Flag / config | Purpose |
|---------------|---------|
| `--artifact-layout tree\|flat` | Default `tree` in v4.5 |
| `--artifact-profile lean\|standard` | Unchanged; lean minimizes `archive/` |
| Env `SIGNALER_ARTIFACT_LAYOUT` | CI override |

## Compatibility

- **No breaking changes** to `signaler query` public JSON shape
- Root paths remain valid for **one minor** via stub files or dual-write
- GitHub Action artifact upload docs updated with recommended paths
- `.gitignore` snippet for `archive/` and `runs/lighthouse/diagnostics/`

## Exit criteria

- Full `web-quality` audit produces a **tree layout** with ≤5 items at `.signaler/` root (`INDEX.md`, `manifest.json`, top-level dirs only)
- `signaler query --view agent` works unchanged against tree layout
- Dogfood: developer can open `INDEX.md` and reach report + quality-pack without grep
- Agent protocol doc updated: prefer `query`; fallback `agent/entrypoints.json`
- Migration note in CHANGELOG and [`migration-v4.md`](../guides/migration-v4.md)

## Verification

```bash
pnpm build
pnpm exec vitest run test/artifact-freshness.test.ts test/query-cli.test.ts

# Layout smoke (after implementation)
node ./dist/bin.js audit --quality-profile web-quality --scope quick --skip-discover \
  --cwd "<dogfood-app>" --artifact-layout tree
test -f .signaler/manifest.json
test -f .signaler/INDEX.md
test -d .signaler/runners/links
```

## Relationship to v5.0.0

v5.0.0 (quality profiles) shipped after layout dogfood. See [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md).

## Non-goals (v4.5)

- Replacing `query` with directory browsing for agents
- New audit runners
- Bundle byte budgets (still backlog)
