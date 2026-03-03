# Features

This document summarizes the current Signaler CLI feature set.

## Core Auditing

- Canonical Lighthouse runner: `run` (`audit` remains a legacy alias)
- Canonical review command: `review` (`report` remains a legacy alias)
- Route/device batching from `signaler.config.json`
- Auto-tuned parallel workers (with `--parallel` override)
- Stability fallback via `--stable`
- Capture modes:
  - `--diagnostics` for diagnostics artifacts
  - `--lhr` for full Lighthouse Result JSON

## Additional Runners

- `measure`: fast CDP-based metrics
- `bundle`: JS/CSS bundle-size scan
- `health`: HTTP status and latency checks
- `links`: broken-link checks
- `headers`: security header checks
- `console`: console/runtime error capture

## Interactive Workflows

- `init` for project setup and route detection (`wizard` remains available)
- `shell` as interactive command hub
- `quick` for fast multi-check workflows
- `folder` for static output auditing

## Reporting Outputs

Typical `.signaler/` outputs include:

- `run.json`, `results.json`, `suggestions.json`, `agent-index.json` (canonical v3)
- `summary.json`, `summary-lite.json`, `summary.md`
- `report.html`
- `triage.md`
- `issues.json`
- `red-issues.md`
- `ai-ledger.json`
- `AI-ANALYSIS.json`, `AI-SUMMARY.json`, `QUICK-FIXES.md`

Optional/flag-dependent outputs include diagnostics, screenshots, LHR files, and export bundles.

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
2. `docs/cli-and-ci.md`
3. `docs/configuration-and-routes.md`
4. `docs/api-reference.md`
