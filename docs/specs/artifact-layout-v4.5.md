# Artifact layout v4.5

Status: Draft (v4.5.0 target)  
Last updated: 2026-05-29  
Related: [`agent-artifact-protocol.md`](./agent-artifact-protocol.md) · [`phase4.5-v4.5-artifact-layout.md`](../roadmap/phase4.5-v4.5-artifact-layout.md)

## Problem

After a full `signaler audit --quality-profile web-quality`, `.signaler/` can contain **30+ files at the root** mixing:

- Lighthouse run outputs (`results.json`, `report.html`, …)
- v6 analyze outputs (`analyze.json`)
- Side runners (`headers.json`, `links.json`, `bundle-audit.json`)
- Orchestration (`job-latest.json`, `jobs/`)
- Legacy / standard-profile bulk (`issues.json`, `ai-ledger.json`, …)

Developers and agents are forced to browse an flat archive. Signaler is an **orchestrator**, not Lighthouse CI; output layout should reflect **audience**, **runner**, and **weight**.

## Design principles

1. **Projections first** — agents use `signaler query` / `explain`; the tree is for IDE browsing and debugging.
2. **Two human entrypoints** — `INDEX.md` (developers) and `manifest.json` (machines).
3. **Runner-oriented grouping** — Lighthouse pipeline vs side runners vs gates vs orchestration.
4. **Lean by default** — `--artifact-profile lean` writes only entrypoints + essentials; bulk lives under `archive/`.
5. **Compatibility** — `--artifact-layout flat|tree` with deprecated root stubs during migration.

## Classification model

Every artifact carries metadata in `manifest.json`:

| Dimension | Values |
|-----------|--------|
| **audience** | `agent`, `developer`, `ci`, `diagnostics`, `legacy` |
| **runner** | `lighthouse`, `analyze`, `verify`, `headers`, `links`, `bundle`, `measure`, `console`, `accessibility`, `orchestration`, `gate`, `export` |
| **contract** | `v3`, `v6`, `job-v1`, `runner-v1`, optional |
| **weight** | `entrypoint`, `summary`, `bulk`, `diagnostics` |

## Target layout (`tree`)

```text
.signaler/
├── INDEX.md                 # developer start (replaces flat NAVIGATION.md)
├── manifest.json            # machine index: paths, tags, freshness, read order
│
├── agent/                   # token-bounded agent surface (lean)
│   ├── README.md
│   ├── entrypoints.json     # ordered read list + pointers
│   ├── index.json           # agent-index (or symlink/stub)
│   ├── analyze.json
│   ├── performance-triage.json
│   ├── suggestions.json       # when explain needs evidence
│   ├── quality-pack.json    # after web-quality
│   └── job-latest.json
│
├── developer/               # human reports
│   ├── README.md
│   ├── report.html
│   ├── overview.md
│   ├── triage.md
│   ├── summary.md
│   └── reports/
│       ├── headers.report.md
│       ├── links.report.md
│       └── bundle.report.md
│
├── runs/                    # Lighthouse + analyze/verify pipeline
│   ├── lighthouse/
│   │   ├── run.json
│   │   ├── results.json[.gz]
│   │   ├── performance-triage.json
│   │   ├── suggestions.json
│   │   ├── diagnostics-lite/
│   │   ├── diagnostics/
│   │   └── screenshots/
│   ├── analyze/
│   │   ├── analyze.json
│   │   └── analyze.md
│   └── verify/
│       └── verify.json
│
├── runners/                 # non-Lighthouse Signaler runners
│   ├── headers/
│   ├── links/
│   ├── bundle/
│   ├── measure/
│   ├── console/
│   └── accessibility/
│
├── orchestration/
│   ├── job-latest.json      # duplicate stub ok during migration
│   ├── jobs/<jobId>/
│   ├── discovery.json
│   └── session.json
│
├── gates/
│   ├── quality-pack.json
│   ├── quality-gate.json
│   └── baseline-compare.json
│
├── export/
│   ├── export.json
│   └── export-bundle.json
│
└── archive/                 # legacy + standard-profile bulk
    ├── issues.json
    ├── ai-ledger.json
    └── …
```

## `manifest.json` schema (v1)

```json
{
  "schemaVersion": 1,
  "layoutVersion": 1,
  "layout": "tree",
  "artifactProfile": "lean",
  "generatedAt": "ISO-8601",
  "freshness": {
    "state": "fresh",
    "jobId": "job-…",
    "trustArtifacts": true
  },
  "entrypoints": {
    "agent": ["agent/entrypoints.json"],
    "developer": ["developer/report.html", "developer/overview.md"],
    "ci": ["gates/quality-pack.json"]
  },
  "artifacts": [
    {
      "id": "agent-index",
      "path": "agent/index.json",
      "audience": "agent",
      "runner": "lighthouse",
      "contract": "v3",
      "weight": "entrypoint"
    }
  ]
}
```

`query --view agent` and `artifact-freshness.ts` should prefer `manifest.json` paths when present.

## Migration

| Flag | Behavior |
|------|----------|
| `--artifact-layout tree` | v4.5 default |
| `--artifact-layout flat` | current behavior; emit deprecation warning |
| Root stubs | One release: write stub JSON at legacy paths pointing to new paths |

Config (optional later):

```json
{
  "artifactLayout": "tree"
}
```

## Out of scope (v4.5)

- Pre-rendered `agent/projections/` cache (v4.6+)
- Moving all Lighthouse bulk in phase 1 (phased: side runners first)
- Breaking `query` / Action artifact upload paths without compatibility stubs

## Read order (unchanged semantics)

Agents:

1. `signaler query --view agent`
2. `signaler query --view perf`
3. `signaler explain --id …`

Developers:

1. `INDEX.md` → `developer/report.html` → `developer/triage.md`
