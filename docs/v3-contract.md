# V3 Contract

Signaler V3 introduces a canonical machine contract for agent/tool integration.

## Canonical Artifacts

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/agent-index.json`

## Canonical Workflow

1. `signaler init`
2. `signaler run --mode fidelity|throughput --contract v3`
3. `signaler review`

## `run.json` (V3 fields)

V3 extends `run.json` with:

- `contractVersion`
- `workflow`
- `protocol`
  - `mode`
  - `profile`
  - `throttlingMethod`
  - `parallel`
  - `warmUp`
  - `headless`
  - `runsPerCombo`
  - `captureLevel`
  - `comparabilityHash`
  - `disclaimer`

## `results.json`

Normalized per-combo output containing:

- route/device identity
- scores and metrics
- runtime error fields
- Lighthouse opportunities
- failed audits

## `suggestions.json`

Deterministic ranked suggestions containing:

- `priorityScore`
- `confidence` (`high|medium|low`)
- impact estimates
- evidence pointers
- action steps

Zero-impact opportunities are filtered from default ranking.

## `agent-index.json`

Token-budget entrypoint for AI/agents:

- top suggestion references
- canonical artifact pointers
- comparability hash and mode metadata

Use this as the first file for AI ingestion.
