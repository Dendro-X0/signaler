# V4 Contract (Phase 0 Freeze)

Status: Frozen for implementation planning  
Date: March 3, 2026

This document is the normative contract for the V4 reset cycle.

## 1. Canonical Workflow

1. `signaler discover`
2. `signaler run --mode fidelity|throughput`
3. `signaler report`

Compatibility aliases during migration:

- `init` -> `discover`
- `review` -> `report`

## 2. Command Semantics

### `discover`

- Discovers framework-aware routes.
- Supports explicit scope:
  - `--scope quick`
  - `--scope full`
  - `--scope file <path>`
- Emits `.signaler/discovery.json` with:
  - total detected routes
  - selected routes
  - excluded dynamic routes
  - excluded by filter/user rules

### `run`

- Executes selected routes in two modes:
  - `fidelity`: reproducibility-first
  - `throughput`: coverage-first
- Emits protocol metadata in `.signaler/run.json`.
- Comparison allowed only when `comparabilityHash` matches.

### `report`

- Prints shell summary.
- Generates canonical artifacts for developer + agent use.

## 3. Canonical Artifacts (Default)

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/report.md`

Default behavior in V4 should prioritize this set only.
Legacy artifacts stay available via compatibility mode during transition.

## 4. Suggestion Quality Rules

- Zero-impact opportunities are excluded from default ranking.
- Top suggestions require evidence pointers.
- Suggestions are deterministic for the same input/protocol.

## 5. Reliability Rules

- `fidelity` defaults to low parallelism and strict isolation-friendly behavior.
- `throughput` must enforce CPU-safe bounds for common developer hardware.
- Runner must not terminate unrelated user Chrome sessions.
- Successful runs must always print final shell summary and output paths.

## 6. Scope Boundary (V4 Cycle)

In scope:

- Discovery reliability
- Runner stability and protocol clarity
- Output simplification and signal quality
- Multi-standard checks merged into one contract

Out of scope:

- Major TUI redesign
- New chat-first AI surfaces
- Large feature additions not tied to reliability/signal quality
