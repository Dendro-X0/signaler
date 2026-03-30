# Signaler v2.6.4 Release Notes

Release date: 2026-03-03

## Highlights

- Init wizard redesigned for faster onboarding.
- Runtime stability fixes for reporting and shell behavior.
- Fidelity runner defaults improved for reproducibility-oriented audits.
- Docs aligned with v3 canonical flow and new init behavior.

## Init Wizard Improvements

- Added mode-aware setup:
  - `signaler init` (default quick mode)
  - `signaler init --quick`
  - `signaler init --advanced`
  - `signaler init --run`
- Added local base URL detection for common localhost ports.
- Added quick starter route selection (public/static-first).
- Added quick plan preview (pages, combos, estimated runtime, artifacts).
- Added post-save prompt to run first canonical audit immediately.

## Runtime and Reliability Fixes

- Fixed ESM runtime crash caused by CommonJS `require` usage in reporting processors.
- Disabled destructive global Chrome cleanup behavior that could kill user-managed Chrome sessions.
- Fixed command completion behavior so non-shell commands do not unexpectedly drop into shell mode.

## Runner Accuracy Controls

- Added `sessionIsolation` support in runtime config:
  - `shared` (default throughput behavior)
  - `per-audit` (fresh session per audit, reproducibility-oriented)
- Updated fidelity defaults:
  - `throttlingMethod=devtools`
  - `parallel=1`
  - `sessionIsolation=per-audit`
  - `runsPerCombo=3` (mode default)
- Added `sessionIsolation` to `comparabilityHash` to prevent invalid cross-run comparisons.

## Canonical Workflow

Continue to use:

1. `signaler init`
2. `signaler run --contract v3 --mode throughput|fidelity`
3. `signaler review`

Legacy aliases remain supported:

- `audit` -> `run`
- `report` -> `review`

