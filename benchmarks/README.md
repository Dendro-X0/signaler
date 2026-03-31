# Benchmarks

Phase 0 establishes reproducible speed/reliability baselines before V5 optimization work.

## Commands

```bash
pnpm run bench:phase0
pnpm run bench:phase0:ci
pnpm run bench:phase0:validate
```

Outputs:

- `benchmarks/out/phase0-baseline.json` (machine report)
- `benchmarks/out/phase0-baseline.md` (human summary)

## Phase 4 Network Worker Baseline

```bash
pnpm run bench:phase4
pnpm run bench:phase4:ci
pnpm run bench:phase4:gate
```

Outputs:

- `benchmarks/out/phase4-baseline.json`
- `benchmarks/out/phase4-baseline.md`

## Phase 6 Release Gate

```bash
pnpm run bench:phase6:gate
pnpm run bench:phase6:validate
```

Outputs:

- `benchmarks/out/phase6-release-gate.json`
- `benchmarks/out/phase6-release-gate.md`

## V3 Phase 1 Release Gate

```bash
pnpm run bench:v3:gate
pnpm run bench:v3:validate
```

Outputs:

- `benchmarks/out/v3-release-gate.json`
- `benchmarks/out/v3-release-gate.md`

## V6.3 Evidence Runs

```bash
pnpm run bench:v63:loop
pnpm run bench:v63:lowmem
```

Outputs:

- `benchmarks/out/v63-loop-smoke.json`
- `benchmarks/out/v63-loop-smoke.md`
- `benchmarks/out/v63-low-memory-evidence.json`
- `benchmarks/out/v63-low-memory-evidence.md`

## Workstream J Optional-Input Overhead Evidence

```bash
pnpm run bench:workstream-j:overhead
```

Outputs:

- `benchmarks/out/workstream-j-optional-input-overhead.json`
- `benchmarks/out/workstream-j-optional-input-overhead.md`

## Profile Contract

Profiles live under:

- `benchmarks/profiles/synthetic/*.json`
- `benchmarks/profiles/real/*.json`

Each profile includes:

- `id`, `kind`, `description`
- `projectRoot`
- `baseUrl` (`__SYNTHETIC_BASE_URL__` for synthetic, `${ENV_VAR}` for env-backed real profiles)
- `routes[]` with `{ path, label }`
- `devices[]` and `runModes[]`
- `modeConfig` overrides per run mode
- `exclusionRules` and `expectedDetection` (for discovery accounting)
- `expectedCombos` target

## Environment Profiles

- `ci-linux`: GitHub Actions Node 20.x, observe-only trend reporting.
- `local-6c12t`: manual baseline on a typical 6-core/12-thread developer machine.

## Rust Probe Contract

When `SIGNALER_RUST_DISCOVERY=1`, Phase 0 optionally runs:

```bash
cargo run --manifest-path rust/Cargo.toml -p signaler_hotpath -- discover-scan --profile <path> --out <path>
```

The Rust probe is benchmark-only in Phase 0 and never replaces Node as the source of truth.
