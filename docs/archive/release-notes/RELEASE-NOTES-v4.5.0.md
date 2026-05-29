# Release Notes - v4.5.0

**Date:** 2026-05-29  
**Package:** `@signaler/cli@4.5.0` (JSR + GitHub Release)

## Summary

Signaler 4.5.0 reorganizes `.signaler/` into a **tree layout by default** — grouped by audience (agent, developer, CI), runner (Lighthouse, headers, links, bundle, …), and weight. Developers browse `INDEX.md`; agents and tools use `manifest.json` and existing `query` / `explain` projections.

## Highlights

### Tree artifact layout (default)

- **Root entrypoints:** `INDEX.md`, `manifest.json`, and top-level directories only (no duplicate JSON at root)
- **`agent/`** — lean entrypoints (`index.json`, `analyze.json`, `performance-triage.json`, `entrypoints.json`)
- **`developer/`** — `report.html`, `overview.md`, `triage.md`, side-runner reports under `developer/reports/`
- **`runners/`** — `headers/`, `links/`, `bundle/`, and other side runners
- **`runs/`** — Lighthouse, analyze, and verify pipeline outputs
- **`orchestration/`**, **`gates/`**, **`export/`**, **`archive/`**

### CLI

- **`--artifact-layout tree|flat`** on `signaler audit` and `signaler job run` (default: **`tree`**)
- Env override: `SIGNALER_ARTIFACT_LAYOUT=tree|flat`
- **`--artifact-layout flat`** — deprecated; emits a warning; retained for one release cycle

### Compatibility

- **`signaler query`**, **`explain`**, **`artifact-freshness`**, and **quality-pack** resolve paths via `manifest.json` (tree → legacy flat fallback)
- No breaking changes to query JSON shapes
- CI can upload `gates/`, `agent/`, or paths listed in `manifest.json`

## Install (JSR)

```bash
npx jsr add @signaler/cli@4.5.0
```

## Quick start

```bash
signaler audit --quality-profile web-quality --cwd . --base-url http://127.0.0.1:3000
# Artifacts: .signaler/INDEX.md → developer/report.html
signaler query --view agent --dir .signaler --json
```

## Migration

| Before (4.4) | After (4.5 default) |
|--------------|---------------------|
| `.signaler/agent-index.json` | `.signaler/agent/index.json` |
| `.signaler/links.json` | `.signaler/runners/links/links.json` |
| `.signaler/quality-pack.json` | `.signaler/gates/quality-pack.json` |
| Flat `NAVIGATION.md` file list | Structured `INDEX.md` + `manifest.json` |

Scripts that read flat root paths should switch to tree paths or use `signaler query`. For one release, `manifest.json` includes `legacyPath` for each artifact.

To keep the old flat layout temporarily:

```bash
signaler audit --artifact-layout flat --cwd .
```

## Docs

- Spec: [`docs/specs/artifact-layout-v4.5.md`](../../specs/artifact-layout-v4.5.md)
- Roadmap: [`docs/roadmap/phase4.5-v4.5-artifact-layout.md`](../../roadmap/phase4.5-v4.5-artifact-layout.md)
