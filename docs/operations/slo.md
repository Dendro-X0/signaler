# SLO Definitions (Phase 0 Baseline)

This document defines the baseline formulas and target bands used for benchmark and gate evaluation.

Phase 0 policy:

- Observe-only in CI (no hard regression gate yet).
- Every benchmark run must emit `benchmarks/out/phase0-baseline.json`.

## Environments

- `ci-linux`: GitHub Actions, Node 20.x.
- `local-6c12t`: developer machine profile (6 cores / 12 threads).

## Core Metrics

For each report entry:

1. `elapsedMs`
2. `avgStepMs`
3. `comboCount`
4. `resolvedParallel`
5. `runnerStability` (if present)
6. discovery totals
7. artifact sizes

Derived formulas:

- `elapsedPerComboMs = elapsedMs / max(comboCount, 1)`
- `failureRate = totalFailures / max(totalAttempts, 1)`
- `retryRate = totalRetries / max(totalAttempts, 1)`
- `parallelDrop = initialParallel - finalParallel`
- `discoverySelectionRate = selected / max(detected, 1)`

## Phase 0 Target Bands (Tracking, Not Gating)

- Throughput stability:
  - `failureRate <= 0.10` target
  - `parallelDrop <= 2` target
- Fidelity consistency:
  - `resolvedParallel = 1` target
  - warm-up enabled target
- Discovery accounting:
  - all exclusion buckets reported (`excludedDynamic`, `excludedByFilter`, `excludedByScope`)
- Artifact integrity:
  - `run.json` and `summary.json` sizes must be `> 0`

If a target is missed in Phase 0, the status is reported as `warn`; CI still passes.

## Phase 1 Gate Prep

Phase 1 will convert these tracking bands into hard regression gates once baseline confidence is stable across repeated CI samples.
