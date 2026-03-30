# Active Roadmap

This roadmap lists only unfinished or in-progress work. Completed phases/workstreams were moved to `docs/archive/roadmaps/`.

## Release Readiness (Current)

1. Complete cross-platform smoke evidence in CI for the current release candidate.
2. Finalize semver transition from `2.6.4` to `3.0.0-rc.*` and then `3.0.0`.
3. Confirm launch checklist completion in production-like CI context.

## Product Roadmap (Open)

### Workstream J: Benchmark and Spec Coverage Expansion

- [ ] Add field-data adapters (CrUX and first-party RUM) as optional external signals with explicit freshness and confidence policy.
- [ ] Add accessibility coverage expansion aligned to WCAG 2.2 and ARIA Authoring Practices checks.
- [ ] Add security baseline checks aligned to OWASP Top 10 / ASVS-lite and production header policy.
- [ ] Add technical SEO checks aligned to Google Search Essentials and structured-data validity.
- [ ] Add reliability/SLO metrics (availability, error-rate, backend latency) as optional ranking context.
- [ ] Add cross-browser/cross-device comparability snapshots for parity-sensitive routes.

### Workstream K: Rust Performance Path for New Signals

- [ ] Implement Rust normalizer/aggregator for high-volume external records (RUM/CrUX/WPT) with deterministic reduction output.
- [ ] Implement Rust scoring kernel for composite ranking (performance + a11y + security + SEO + reliability weights) with Node fallback.
- [ ] Keep Node/TypeScript control plane for UX, contracts, migration messaging, and policy defaults.
- [ ] Add parity/perf tests proving Rust and Node ranking equivalence under identical inputs.

## Success Gate

- [x] CLI UX hardening baseline is complete.
- [x] Agent contract metadata baseline is complete.
- [x] Loop efficiency/runtime-budget baseline is complete.
- [x] Success-gate evaluator/validator automation is complete.

## Success Criteria (Open)

- [ ] Non-Lighthouse inputs remain opt-in and never block `discover -> run -> analyze -> verify -> report`.
- [ ] Composite ranking remains deterministic with explicit formula/version metadata.
- [ ] Optional external signals stay within documented runtime overhead budgets.
- [ ] At least two real public repos validate improvements over Lighthouse-only ranking.
- [ ] Rust path demonstrates measurable speedup on large multi-source fixtures without contract drift.

## V6 Program Gate (Open)

- [ ] `discover -> run -> analyze -> verify` reproducible in <= 10 minutes on reference fixtures.
- [ ] Median runtime and CPU improve versus the current baseline on medium/large suites.
- [ ] Agent output remains actionable with bounded token footprint in default mode.
- [ ] At least 3 real repos complete 2+ weeks of dogfooding with documented outcomes.
- [ ] Optional adapter path does not regress core reliability.
