# Spec: Workstream J Implementation Plan

Status: In Progress (Phase J1+J2 complete, J3 composite ranking complete on run+analyze, J4 Rust benchmark normalizer + parity harness complete, overhead evidence integrated, fixture adapters in place for accessibility/security/reliability/SEO/parity)
Date: 2026-03-29
Owners: CLI core, contracts, benchmarks
Depends on: V3.0.0 release line and Workstream D external-signal foundation

## 1. Goal

Deliver Workstream J as a staged expansion from Lighthouse-only triage to deterministic multi-source ranking, while keeping the core `discover -> run -> analyze -> verify -> report` loop opt-in safe.

## 2. Current Baseline

Implemented baseline (already shipped in repository):

1. Local-file `ExternalSignalsFileV1` contract.
2. Repeatable `--external-signals` flag on `run` and `analyze`.
3. Conservative merge gate (high confidence, mapped issue/path, freshness, evidence required).
4. Additive artifact metadata (`externalSignals`) with digest and policy.

This baseline satisfies the Workstream J field-data adapter prerequisite for CrUX/RUM fixtures.

## 3. Phased Delivery

### Phase J1: Accessibility/Security/SEO Contracts and Fixtures

Scope:

1. Add typed fixture contracts for:
   - accessibility-extended
   - security-baseline
   - seo-technical
2. Add local adapter loader + validator shared by `run` and `analyze`.
3. Emit additive metadata blocks in machine artifacts without changing default ranking.

Acceptance:

1. Contract validator tests for valid/invalid fixtures by family.
2. `run` and `analyze` preserve baseline ordering when only metadata mode is enabled.
3. No schema regressions for existing V3/V6 validators.

Progress notes:

1. Completed: `--benchmark-signals <path>` (repeatable) on `run` and `analyze`.
2. Completed: additive `multiBenchmark` metadata block in `suggestions.json` and `analyze.json`.
3. Completed: conservative policy loader/validator tests and deterministic digest coverage.
4. Completed: J2 family contract extension for `reliability-slo` and `cross-browser-parity`.
5. Completed: J3 run+analyze composite ranking with bounded benchmark-family boost and explicit formula/version metadata.
6. Completed: optional benchmark boost integration for run-side suggestion ranking (bounded + deterministic).
7. Completed: J4 scaffold for optional rust benchmark loader adapter with fallback-safe behavior.
8. Completed: Rust `normalize-benchmark` / `normalize-benchmark-signals` command path in `signaler_hotpath` with contract-compatible output and deterministic fallback semantics.
9. Completed: cargo-gated Rust/Node parity harness for benchmark normalization (`test/rust-benchmark-parity.test.ts`).
10. Completed: runtime overhead benchmark evidence runner for optional benchmark-input path (`pnpm run bench:workstream-j:overhead` -> `benchmarks/out/workstream-j-optional-input-overhead.{json,md}`).
11. Completed: V6.3 success-gate integration for Workstream J overhead evidence (`workstream-j-overhead-evidence`) with warn-only fallback when evidence is missing/malformed.
12. Completed: Rust benchmark adapter now executes Rust-first (without eager Node parsing) and records additive accelerator metadata (`requested`, `enabled`, `used`, fallback reason, sidecar command, normalize stats) in run/analyze artifacts.
13. Completed: CI phase benchmark job emits Workstream J optional-input overhead evidence artifacts for downstream gate visibility.
14. Completed: accessibility-extended contract/parser expansion for WCAG 2.2 + APG-aligned metrics (`focusAppearanceIssueCount`, `focusNotObscuredIssueCount`, `targetSizeIssueCount`, `draggingAlternativeIssueCount`, `apgPatternMismatchCount`, `keyboardSupportIssueCount`) across Node and Rust normalization paths.
15. Completed: local accessibility fixture adapter (`scripts/build-accessibility-benchmark-fixture.ts`) that converts `.signaler/accessibility-summary.json` (+ optional `issues.json` route mapping) into `MultiBenchmarkSignalsFileV1` (`accessibility-extended`) with deterministic WCAG/APG metric mapping and evidence pointers.
16. Completed: local security fixture adapter (`scripts/build-security-benchmark-fixture.ts`) that converts `.signaler/headers.json` (+ optional `issues.json` route mapping) into `MultiBenchmarkSignalsFileV1` (`security-baseline`) with deterministic OWASP/ASVS-lite header-policy metrics (`missingHeaderCount`, `tlsConfigIssueCount`, `cookiePolicyIssueCount`, `mixedContentCount`) and evidence pointers.
17. Completed: local reliability fixture adapter (`scripts/build-reliability-benchmark-fixture.ts`) that converts `.signaler/health.json` (+ optional `issues.json` route mapping) into `MultiBenchmarkSignalsFileV1` (`reliability-slo`) with deterministic availability/error/latency metrics (`availabilityPct`, `errorRatePct`, `latencyP95Ms`) and evidence pointers.
18. Completed: local SEO fixture adapter (`scripts/build-seo-benchmark-fixture.ts`) that converts `.signaler/results.json` (+ optional `.signaler/links.json` crawlability augmentation and optional `issues.json` route mapping) into `MultiBenchmarkSignalsFileV1` (`seo-technical`) with deterministic SEO metrics (`indexabilityIssueCount`, `canonicalMismatchCount`, `structuredDataErrorCount`, `crawlabilityIssueCount`) and evidence pointers.
19. Completed: local cross-browser parity fixture adapter (`scripts/build-cross-browser-benchmark-fixture.ts`) that converts local snapshot reports (`.signaler/cross-browser-snapshots.json`) into `MultiBenchmarkSignalsFileV1` (`cross-browser-parity`) with deterministic route/device variance metrics (`scoreVariancePct`, `lcpDeltaMs`, `clsDelta`) and evidence pointers for parity-sensitive ranking.
20. Completed: dedicated Workstream J gate evaluator/validator (`bench:workstream-j:gate`, `bench:workstream-j:validate`) with schema output artifacts (`benchmarks/out/workstream-j-gate.{json,md}`) and deterministic summary validation.
21. Completed: Workstream J gate integrated into CI release-gate stage with artifact upload visibility for benchmark-coverage readiness.
19. Completed: local cross-browser parity fixture adapter (`scripts/build-cross-browser-benchmark-fixture.ts`) that converts `.signaler/cross-browser-snapshots.json` (+ optional `issues.json` route mapping) into `MultiBenchmarkSignalsFileV1` (`cross-browser-parity`) with deterministic route/device variance metrics (`scoreVariancePct`, `lcpDeltaMs`, `clsDelta`) and evidence pointers.

### Phase J2: Reliability/SLO and Cross-Browser Snapshot Inputs

Scope:

1. Add reliability fixture contract (`availability`, `errorRate`, `latencyP95Ms`).
2. Add parity snapshot fixture contract across browser/device.
3. Add comparability digest coverage for all enabled optional inputs.

Acceptance:

1. Deterministic digest tests for same input set and ordering.
2. Policy rejection tests for stale, unmapped, or incomplete records.
3. Runtime overhead benchmark report for optional-input path.

### Phase J3: Composite Ranking Integration (Node First)

Scope:

1. Introduce explicit composite ranking formula/version in `analyze.json`.
2. Apply bounded family-weight contributions with deterministic tie-break rules.
3. Keep optional-input behavior fully non-blocking by default.

Acceptance:

1. Deterministic ranking tests (repeat runs produce identical order).
2. Family-weight clamp tests and total boost cap tests.
3. Backward-compatible additive contract validation.

### Phase J4: Rust Acceleration Path

Scope:

1. Implement Rust normalizer + aggregator for high-volume optional records.
2. Implement Rust composite scoring kernel with Node fallback.
3. Add parity harness for Rust/Node output equivalence.

Acceptance:

1. Rust/Node equivalence tests on shared fixture sets.
2. Perf evidence showing reduced CPU/runtime on large suites.
3. Fallback path tests for missing/disabled Rust binary.

### Phase J5: Success Gate and Documentation Hardening

Scope:

1. Add Workstream J benchmark gate evaluator/validator.
2. Add docs for developer and agent usage with local fixtures.
3. Add CI templates for optional-input regression checks.

Acceptance:

1. New gate outputs and schema validators pass in CI.
2. Canonical docs include complete local-first workflows.
3. At least two public repos validate prioritization improvements.

## 4. Execution Notes

1. Keep all new inputs opt-in and local-file first.
2. Keep all artifact additions additive only.
3. Prefer deterministic policy-bounded ranking before any model-assisted heuristics.
