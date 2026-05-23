# Agent Artifact Protocol

Status: Active  
Last updated: 2026-05-22

## Goal

Give coding agents a **small, stable read surface** for Signaler outputs. The `.signaler/` directory is an internal archive; agents should use **projections** via `query` / `explain`.

## Format: JSON (with strict projections)

JSON remains the canonical machine format because:

1. Agents and CI already parse JSON reliably.
2. Schema validation and versioning are straightforward.
3. Projections can stay token-bounded.

Markdown (`analyze.md`, `report.html`) is for humans only unless explicitly requested.

## Mandatory read order

After `signaler run --contract v3`:

1. `signaler query --view agent --dir .signaler`
2. `signaler query --view perf --dir .signaler` (performance issue-count triage)
3. `signaler explain --id <issue-id>` only when implementing a fix

After `signaler analyze --contract v6`:

1. `signaler query --view agent` (prefers `analyze.json`)
2. `signaler verify --contract v6` when validating fixes

## Forbidden by default

Do not ingest these unless a pointer or human task requires it:

- entire `.signaler/` directory listings
- `results.json` full payload
- `issues.json`, `summary.json`, legacy AI artifacts
- Lighthouse raw JSON (`--lhr`) unless debugging

## Performance reporting model

Performance uses **issue-count triage** (`performance-triage.json`):

| Severity | Meaning |
| --- | --- |
| red | Critical failing audits or high-impact opportunities |
| yellow | Needs improvement (optional via `--perf-include-yellow`) |
| green | Passed (omitted from actionable list) |

Category scores for **accessibility**, **SEO**, and **best practices** remain 0–100 scores in `results.json` and usually align with DevTools.

Performance **scores are trend/lab signals**, not DevTools parity targets.

## One-shot job API

```bash
signaler job run --preset agent --base-url http://127.0.0.1:3000
signaler job status --dir .signaler
```

See `docs/specs/engine-job-protocol.md`.

## CLI projection API

```bash
signaler query --view agent [--dir .signaler] [--top 12] [--json]
signaler query --view actions [--top 12]
signaler query --view perf [--top 12]
signaler query --view run
signaler query --view delta [--dir .signaler]
signaler query --view delta --baseline-dir .signaler --compare-dir .signaler-verify
signaler query --view evidence --id <issue-id>

signaler explain --id <suggestion-or-issue-id> [--dir .signaler] [--json]
```

## Write-time caps (lean profile defaults)

- Zero-impact opportunities removed before write
- Per-combo opportunity and failed-audit caps by `--artifact-profile`
- Yellow performance issues omitted when `--no-perf-include-yellow` (lean default)

## Future

Optional MCP wrapper may expose the same `query` / `explain` commands without changing artifacts.
