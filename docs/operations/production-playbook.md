# Production Playbook

This playbook defines the default operating model for running Signaler in real projects and CI pipelines.

## Baseline Setup

1. Configure canonical workflow once:
   - `signaler discover --scope full`
   - `signaler run --contract v3 --mode throughput`
   - `signaler report`
2. Keep one canonical AI entrypoint:
   - `.signaler/agent-index.json`
3. Keep v3 artifacts as default machine contract:
   - `run.json`, `results.json`, `suggestions.json`, `agent-index.json`

## Run Cadence

1. Pull requests:
   - Throughput run on changed routes (or full quick scope if route diff is unavailable).
   - Command baseline: `signaler run --contract v3 --mode throughput --ci --no-color --yes`
2. Main branch/nightly:
   - Full throughput run across configured suite.
   - Publish `.signaler/*` artifacts for traceability.
3. Weekly parity checks:
   - Fidelity reruns on worst-N routes only (never full-suite fidelity).
   - Suggested pattern:
     - `signaler run --contract v3 --mode throughput`
     - `signaler run --contract v3 --mode fidelity --focus-worst 10`

## Regression Triage Policy

Use `agent-index.json` first, then follow pointers into `suggestions.json`, `issues.json`, and diagnostics artifacts.

Severity policy:

1. `P0` (block release):
   - runtime errors on core routes
   - severe CI budget failures
   - broken route discovery/reporting outputs
2. `P1` (fix in current sprint):
   - sustained throughput regressions above gate thresholds
   - high-impact suggestions with strong evidence affecting many routes
3. `P2` (backlog):
   - low-impact or route-specific degradations with stable user-facing metrics

## Operator Defaults

- Prefer throughput for trend detection and broad coverage.
- Use fidelity selectively for parity validation.
- Do not lower parallel to 1 for full suites unless required for debugging instability.
- Keep Rust accelerators optional; Node remains canonical path unless explicitly enabled.
