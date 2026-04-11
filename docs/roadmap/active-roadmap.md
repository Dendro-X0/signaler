# Active Roadmap

This roadmap lists only unfinished or in-progress work. Completed phases/workstreams were moved to `docs/archive/roadmaps/`.

## Release Readiness (Current)

1. Complete cross-platform smoke evidence in CI for GA (`Windows/macOS/Linux` artifacts).
2. Publish `@signaler/cli@3.1.6` to JSR from a browser-authenticated environment.
3. Confirm launch checklist completion in production-like CI context.

## Product Roadmap (Open)

### Workstream J: Benchmark and Spec Coverage Expansion

- [x] Add field-data adapters (CrUX and first-party RUM) as optional external signals with explicit freshness and confidence policy.
- [x] Phase J1 scaffold: add typed local benchmark fixture contracts (`accessibility-extended`, `security-baseline`, `seo-technical`) with optional `--benchmark-signals` loader and additive `multiBenchmark` artifact metadata.
- [x] Phase J2 scaffold: extend benchmark fixture contracts with `reliability-slo` and `cross-browser-parity` families plus deterministic metadata digest coverage.
- [x] Phase J3 (run + analyze): bounded composite benchmark boosts with explicit ranking formula/version metadata and deterministic ordering.
- [x] Optional-input runtime overhead evidence runner added (`bench:workstream-j:overhead`) with machine + markdown outputs in `benchmarks/out/`.
- [x] Success-gate integration added for Workstream J overhead evidence (`workstream-j-overhead-evidence`, warn-only when absent).
- [x] CI benchmark job emits Workstream J overhead evidence artifacts for release/gate visibility.
- [x] Expand `accessibility-extended` fixture contract + Node/Rust normalization for WCAG 2.2 + APG-aligned metric fields.
- [x] Add accessibility signal providers/adapters and checks aligned to WCAG 2.2 and ARIA Authoring Practices.
- [x] Add security baseline checks aligned to OWASP Top 10 / ASVS-lite and production header policy.
- [x] Add technical SEO checks aligned to Google Search Essentials and structured-data validity.
- [x] Add reliability/SLO metrics (availability, error-rate, backend latency) as optional ranking context.
- [x] Add cross-browser/cross-device comparability snapshots for parity-sensitive routes.
- [x] Execute the phased implementation plan in `docs/specs/workstream-j-implementation-plan.md`.

### Workstream K: Rust Performance Path for New Signals

- [x] Phase K1 scaffold: add optional `SIGNALER_RUST_BENCHMARK=1` adapter path with deterministic Node fallback semantics and fallback tests.
- [x] Add Rust normalizer perf/parity evidence runner (`bench:workstream-k:rust-benchmark`) plus warn-level success-gate/release-preflight visibility and CI artifact emission.
- [x] Execute Phase K2 kickoff spec in `docs/specs/workstream-k-phase2-kickoff.md`.
- [x] Implement Rust normalizer/aggregator for high-volume external records (RUM/CrUX/WPT) with deterministic reduction output.
- [x] Implement Rust scoring kernel for composite ranking (performance + a11y + security + SEO + reliability weights) with Node fallback.
- [x] Keep Node/TypeScript control plane for UX, contracts, migration messaging, and policy defaults.
- [x] Add parity/perf tests proving Rust and Node ranking equivalence under identical inputs.

## Success Gate

- [x] CLI UX hardening baseline is complete.
- [x] Agent contract metadata baseline is complete.
- [x] Loop efficiency/runtime-budget baseline is complete.
- [x] Success-gate evaluator/validator automation is complete.

## Success Criteria (Open)

- [x] Non-Lighthouse inputs remain opt-in and never block `discover -> run -> analyze -> verify -> report`.
- [x] Composite ranking remains deterministic with explicit formula/version metadata.
- [x] Optional external signals stay within documented runtime overhead budgets.
- [x] At least two real public repos validate improvements over Lighthouse-only ranking.
- [x] Rust path demonstrates measurable speedup on large multi-source fixtures without contract drift.

## V6 Program Gate (Open)

- [x] `discover -> run -> analyze -> verify` reproducible in <= 10 minutes on reference fixtures.
- [ ] Median runtime and CPU improve versus the current baseline on medium/large suites.
- [x] Agent output remains actionable with bounded token footprint in default mode.
- [x] At least 3 real repos complete 2+ weeks of dogfooding with documented outcomes.
- [x] Optional adapter path does not regress core reliability.

## Evidence Snapshot (2026-04-06)

- `pnpm.cmd run bench:v63:loop`: pass (`elapsedMs=14636`, `maxAllowedMs=600000`) in `benchmarks/out/v63-loop-smoke.json`.
- `pnpm.cmd run test:phase6:smoke`: pass (`29` tests) including deterministic analyze/verify and token-budget coverage.
- `pnpm.cmd run bench:workstream-j:overhead`: pass (`medianOverheadMs=2`, `p95OverheadMs=3`) within budgets.
- `pnpm.cmd run test:rust:parity`: pass (`24` tests) across Rust parity/fallback/reliability checks.
- `pnpm.cmd run bench:workstream-k:rust-benchmark`: pass with parity/fallback evidence and measurable kernel speedup (`medianMs -445.68`, `p95Ms -445.88`, `medianPct -16.73`).
- `pnpm.cmd run release -- --target-version 3.1.6`: warn-only preflight pass with all blocking checks green; the only remaining warning is missing CI-generated cross-platform smoke evidence files.
