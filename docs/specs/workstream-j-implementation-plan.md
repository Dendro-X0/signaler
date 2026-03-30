# Spec: Workstream J Implementation Plan

Status: In Progress
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
