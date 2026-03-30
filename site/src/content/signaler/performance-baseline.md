# Performance Baseline (Phase 0)

This guide explains how to run and interpret the baseline benchmark harness.

## Run Locally

```bash
pnpm run bench:phase0
pnpm run bench:phase0:validate
```

Outputs:

- `benchmarks/out/phase0-baseline.json`
- `benchmarks/out/phase0-baseline.md`

Optional real-project base URL:

```bash
# Example: next-blogkit-pro dev/prod server URL
set SIGNALER_NEXT_BLOGKIT_BASE_URL=http://127.0.0.1:3000
pnpm run bench:phase0
```

Optional Rust probe:

```bash
set SIGNALER_RUST_DISCOVERY=1
pnpm run bench:phase0
```

Node remains canonical; Rust output is comparison-only in Phase 0.

## Run in CI (Observe-Only)

CI uses:

```bash
pnpm run bench:phase0:ci
```

Current behavior:

- one Node version (`20.x`)
- benchmark report artifacts uploaded
- no PR failure solely due delta regressions

TODO marker already exists in workflow for Phase 1 hard gating.

## Delta Interpretation

Use `phase0-baseline.md` table first:

1. Check `status` by profile/mode.
2. Compare `elapsedMs` and `avgStepMs`.
3. Check `comboCount` and `resolvedParallel`.
4. Review `notes` for runtime errors or missing artifacts.

Treat deltas as meaningful only when:

1. Same environment (`ci-linux` vs `local-6c12t` are not directly comparable).
2. Same profile ID and mode.
3. Similar combo counts and discovery totals.

## Known Noise Factors

- Lighthouse variance (especially on shared CI runners).
- Background CPU contention on local machines.
- Server cold starts and cache state.
- Route-level app variability between commits.

Confidence rule:

- Do not conclude regression from a single noisy run.
- Collect at least 3 samples before hard decisions.

## Phase 1 Onboarding Gate (Blocking)

Phase 1 adds a scripted onboarding E2E gate:

```bash
pnpm run bench:phase1:onboarding
```

Gate assertions:

1. `discover -> run -> report` completes in `<= 10 minutes`.
2. `.signaler/discovery.json` exists and `status != "error"`.
3. `.signaler/run.json` and `.signaler/summary.json` exist.
4. report output exists (`.signaler/report.html`).

CI policy:

- Phase 0 benchmark deltas remain observe-only.
- Phase 1 onboarding gate is blocking.

## Phase 2 Soft Gate (Severe Regressions Only)

Phase 2 adds a soft performance/reliability gate for throughput entries:

```bash
pnpm run bench:phase2:gate
```

Soft-gate fail conditions:

1. `elapsedMs` regression exceeds `max(35%, 60000ms)` for the same profile and mode.
2. `failureRate > 0.20` on throughput entries.
3. benchmark entry status is `error`.
4. required artifacts are missing (`run.json` or `summary.json`).

Moderate regressions are logged as warnings and do not fail CI.
Entries already marked `status=warn` (for example unresolved real-project base URL) are treated as warnings for artifact-missing checks, not severe failures.

## Phase 3 Rust Runtime Flags (Opt-In)

Rust acceleration remains optional in this phase and is guarded by runtime flags:

- `SIGNALER_RUST_DISCOVERY=1`: enable Rust route discovery sidecar path.
- `SIGNALER_RUST_PROCESSOR=1`: enable Rust top-issue processor sidecar path.

Fallback behavior:

1. Node remains authoritative by default.
2. If Rust is unavailable or returns invalid output, Signaler falls back to Node automatically.
3. Fallback reason is captured in runtime metadata in `.signaler/run.json`.

## Phase 4 Rust Network Worker Baseline and Gate

Phase 4 adds benchmark/gate coverage for network commands (`health|headers|links|console`):

```bash
pnpm run bench:phase4
pnpm run bench:phase4:ci
pnpm run bench:phase4:gate
```

Outputs:

- `benchmarks/out/phase4-baseline.json`
- `benchmarks/out/phase4-baseline.md`

Soft-gate severe fail conditions:

1. elapsed regression exceeds `max(35%, 60000ms)` against same command/engine baseline.
2. entry `status=error`.
3. required artifact missing/empty.
4. high error rate (`>0.20`; console uses a higher severe threshold due CDP-noise sensitivity).
