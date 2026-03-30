# V3 Contract

Signaler V3 introduces a canonical machine contract for agent/tool integration.

## Canonical Artifacts

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/agent-index.json`

## Canonical Workflow

1. `signaler discover`
2. `signaler run --mode fidelity|throughput --contract v3`
3. `signaler analyze --contract v6`
4. `signaler verify --contract v6`
5. `signaler report`

## `run.json` (V3 fields)

V3 extends `run.json` with:

- `contractVersion`
- `workflow`
- `protocol`
  - `mode`
  - `profile`
  - `throttlingMethod`
  - `parallel`
  - `sessionIsolation`
  - `throughputBackoff`
  - `warmUp`
  - `headless`
  - `runsPerCombo`
  - `captureLevel`
  - `comparabilityHash`
  - `disclaimer`
- `meta`
  - `resolvedParallel`
  - `elapsedMs`
  - `runnerStability` (when parallel throughput path is used)

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
- `externalSignals` metadata block (always emitted in current builds)
  - `enabled`, `inputFiles`, `accepted`, `rejected`, `digest`, `policy`
  - default no-input state: `enabled=false`, empty `inputFiles`, zero counters, `digest=null`

Zero-impact opportunities are filtered from default ranking.

Top-ranked suggestions require non-empty evidence pointers.

## `agent-index.json`

Token-budget entrypoint for AI/agents:

- top suggestion references
- canonical artifact pointers
- comparability hash and mode metadata
- additive `compatibility.legacyToCanonical` mapping for migration-safe tooling
- optional `machineOutput` metadata for profile and token-budget enforcement details

Use this as the first file for AI ingestion.
