# Release Notes - v3.2.0

Release date: 2026-05-22

## Highlights

Signaler 3.2.0 is an **agent-first** release: one-shot jobs, small JSON projections, and performance **issue-count** triage instead of asking agents to ingest entire `.signaler/` trees or chase headline performance scores.

## Agent workflow

```bash
signaler job run --preset agent --base-url http://127.0.0.1:3000
signaler query --view perf
signaler explain --id <issue-id>
signaler verify --contract v6
signaler query --view delta
```

CI / PR:

```bash
signaler job run --preset ci --base-url http://127.0.0.1:3000
signaler job run --preset pr   # changed-files only; needs existing config
```

## New commands

| Command | Purpose |
|---------|---------|
| `job run --preset agent\|ci\|pr` | File-based multi-step workflows |
| `query --view …` | Compact artifact projections |
| `explain --id …` | Lazy-expand one issue |

## Performance reporting

- `performance-triage.json` classifies performance as red/yellow issue counts.
- `analyze` v6.4 merges triage with suggestions; `verify` can expect `issueCount: down`.

## Distribution

- Portable install scripts (`install.ps1` / `install.sh`) remain primary.
- Optional native launcher in portable zip when built with Rust (`signaler_launcher`).

## Migration

- No breaking changes to v3 artifact schemas.
- CI templates now call `job run --preset ci`; requires JSR/npm package **≥ 3.2.0**.
- Prefer `signaler query` / `explain` over reading full `results.json` in agent prompts.

## Install

```bash
npx jsr add @signaler/cli@3.2.0
# or portable:
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```
