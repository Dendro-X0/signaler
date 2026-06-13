# Features

This document summarizes the Signaler CLI feature set (**v5.0**). See also [v5 showcase](/docs/signaler/v5-showcase).

## Quality profiles (v5)

- `--quality-profile web-quality` — full discover + ci-strict Lighthouse + side runners + `gates/quality-pack.json`
- `--quality-profile pr-quality` — changed-only Lighthouse + same side runners
- Side runners in profile order: headers, links, health, console, measure, accessibility, bundle
- `signaler accessibility` — standalone axe-core pass (also in profiles)

## Core Auditing

- One-shot orchestrator: `signaler audit` (discover → run → analyze)
- Lighthouse runner: `signaler run`
- Agent projections: `signaler query`, `signaler explain`
- Review: `signaler report` (`review` is a legacy alias)
- Route/device batching from `signaler.config.json`
- Auto-tuned parallel workers (with `--parallel` override)
- Stability fallback via `--stable`
- Capture modes:
  - `--diagnostics` for diagnostics artifacts
  - `--lhr` for full Lighthouse Result JSON

## Additional Runners

Orchestrated by quality profiles or run standalone:

- `headers`, `links`, `health`, `console`, `measure`, `accessibility`, `bundle`
- `measure`: fast CDP-based metrics
- `quick`: bundled fast pack (measure + headers + links + bundle + accessibility)

## Artifact layout (v4.5+)

- Default **tree** layout: `agent/`, `developer/`, `runners/`, `gates/`, `runs/`, `INDEX.md`, `manifest.json`
- `--artifact-layout flat` deprecated

## Interactive Workflows

- `discover` for route setup (`init` / `wizard` / `guide` are legacy aliases)
- `shell` as interactive command hub
- `quick` for fast multi-check workflows
- `folder` for static output auditing

## Reporting Outputs

**Agents:** `signaler query --view agent|perf` (prefer over reading the full tree).

**Tree layout paths (examples):**

- `agent/index.json`, `agent/analyze.json`, `agent/performance-triage.json`
- `developer/report.html`, `developer/reports/*.report.md`
- `gates/quality-pack.json`, `gates/quality-gate.json`
- `runs/lighthouse/run.json`, `runs/lighthouse/results.json`

Legacy flat-root names still resolve via `manifest.json` during migration.

## CI and Budgets

- `--ci` mode for automation-friendly behavior
- `--fail-on-budget` for budget gating
- Category and metric budgets in `signaler.config.json`

## Cortex (AI Remediation)

- `signaler cortex` interactive dashboard
- Provider configuration (OpenAI, Anthropic, Google, local/Ollama)
- Context engine and issue triage flows
- Patch and test-generation building blocks

## Programmatic API

- Exported via `@signaler/cli/api`
- `createSignalerAPI()` with `audit`, `createConfig`, `validateConfig`, `getVersion`

## Notes

If docs in older release notes conflict with current behavior, prioritize:

1. `README.md`
2. `docs/reference/cli.md`
3. `docs/reference/configuration.md`
4. `docs/reference/api.md`

