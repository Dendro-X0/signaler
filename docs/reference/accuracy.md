# Accuracy Spec

This document defines how Signaler evaluates lab accuracy under the current runner model.

## Modes

- `fidelity`: stability-first mode intended for DevTools-like lab validation.
- `throughput`: coverage-first mode intended for CI and trend tracking.

## Comparability Rule

Comparisons are valid only when `run.json.protocol.comparabilityHash` matches between runs.

If hashes do not match, Signaler must skip delta comparisons and print a compatibility warning.

## DevTools Parity Band (Fidelity)

For a fixed environment and route set:

- Performance score median delta vs controlled DevTools baseline: `<= 10 points`
- Performance score p95 delta vs controlled DevTools baseline: `<= 20 points`
- Metric drift checks (relative guardrails):
  - LCP: within `25%`
  - TBT: within `30%`
  - CLS: absolute delta `<= 0.05`

These are default acceptance targets and can be tightened by project-specific policy.

## Throughput Guarantees

`throughput` mode does not claim direct DevTools parity.

It is optimized for:

- broad route/device coverage
- stable trend sensitivity
- deterministic machine-readable artifacts

All throughput runs should include a disclaimer in `run.json.protocol.disclaimer`.

## Known Pitfall: Full-Suite Fidelity With Very Low Parallel

For large suites, forcing very low parallelism (especially `parallel=1` with devtools throttling) can:

- make runs dramatically slower
- increase environment drift during the run (thermal/background/load changes)
- produce lower or less representative performance scores on later combos

This is expected behavior for long-running lab sessions and should not be treated as a reliability fix by default.

Recommended workflow:

1. Run broad coverage in `throughput` mode (`simulate`) for trend detection.
2. Re-run only a focused subset of worst routes in `fidelity` mode for DevTools-like validation.
3. Compare only runs with matching `comparabilityHash`.
