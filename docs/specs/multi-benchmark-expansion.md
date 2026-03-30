# Spec: V6.4 Multi-Benchmark Expansion (Rust-First)

Status: In Progress  
Date: March 23, 2026  
Owners: Core CLI + Rust runtime  
Depends on: success-gate adoption completion

## 1. Summary

V6.4 expands Signaler from Lighthouse-dominant lab analysis to a multi-source quality engine while preserving:

1. deterministic agent contracts,
2. local-first execution,
3. optional external inputs,
4. Rust-first performance on heavy data paths.

The default workflow remains unchanged:

1. `signaler discover`
2. `signaler run`
3. `signaler analyze`
4. `signaler verify`
5. `signaler report`

## 2. Why This Matters

Lighthouse remains a core benchmark, but it is not enough alone for production decision quality. High-value adjacent signals include:

1. field CWV (CrUX/RUM),
2. accessibility conformance depth (WCAG 2.2/APG),
3. security baseline coverage (OWASP Top 10/ASVS-lite),
4. technical SEO and structured-data integrity,
5. reliability and latency SLO context,
6. cross-browser parity signals.

## 3. Scope

## 3.1 In Scope

1. Add optional adapter contracts for non-Lighthouse signal families.
2. Merge accepted signals into ranking with explicit policy gates.
3. Emit additive metadata for comparability and source provenance.
4. Move heavy normalization/scoring paths to Rust with Node fallback.

## 3.2 Out of Scope

1. Replacing Lighthouse run engine.
2. Hosted SaaS monitoring backend.
3. Breaking schema changes for existing v3/v6 consumers.

## 4. Signal Families (Planned)

1. `field-web-vitals`: CrUX/RUM p75 metrics and trend deltas.
2. `accessibility-extended`: WCAG 2.2/APG-focused checks not covered in Lighthouse default categories.
3. `security-baseline`: headers/cookies/TLS/config findings mapped to OWASP categories.
4. `seo-technical`: indexability, canonical consistency, robots/sitemap/meta/schema checks.
5. `reliability-slo`: route-level availability/error/latency context.
6. `cross-browser-parity`: route/device/browser variance snapshots.

## 5. Contract Direction

All additions remain additive:

1. Keep existing required fields in `run.json`, `suggestions.json`, `analyze.json`, `verify.json`.
2. Add optional `multiBenchmark` metadata block in machine artifacts:
   - `enabled`
   - `sources`
   - `accepted`
   - `rejected`
   - `digest`
   - `policy`
   - `rankingVersion`
3. Preserve explicit formula text and version marker in `analyze.json.rankingPolicy`.

## 6. Ranking Policy (Draft)

1. Compute existing base priority as-is.
2. Apply bounded additive multipliers from accepted non-Lighthouse signals.
3. Clamp each source-family contribution and total composite boost.
4. Emit per-source contribution metadata for traceability.
5. Keep deterministic ordering on tied scores (stable sort by id/path/device).

## 7. Rust-First Implementation Plan

## 7.1 Rust Modules

1. `signal-normalizer`:
   - parse/validate external records
   - enforce freshness/confidence/pointer policy
   - emit normalized intermediate rows
2. `signal-aggregator`:
   - route/device/issue grouping
   - bounded streaming reductions
   - deterministic source contribution summaries
3. `ranking-kernel`:
   - composite score calculation
   - deterministic tie-break ordering
   - parity-tested against Node fallback

## 7.2 Node Responsibilities

1. CLI UX and command parsing
2. config and docs integration
3. contract emission and migration messaging
4. fallback path when Rust feature flags are disabled

## 8. Validation Plan

1. Contract tests:
   - valid/invalid fixtures per signal family
   - additive schema compatibility checks
2. Determinism tests:
   - identical input => identical ranking and digest
3. Policy tests:
   - stale/low-confidence/unmapped signals rejected and counted
4. Rust parity tests:
   - Rust vs Node output equivalence for normalization and ranking
5. Performance tests:
   - runtime and memory gates on medium/large fixture sets

## 9. Success Criteria

1. Multi-source path is opt-in and non-blocking by default.
2. Machine artifacts stay readable for agents within documented token budgets.
3. Composite ranking improves issue prioritization quality in dogfood repos.
4. Rust path provides measurable speedup on large multi-source fixtures.
5. No regressions in existing v3/v6 workflow semantics.

## 10. Rollout

1. Stage 1: fixture-only adapters + metadata scaffolding.
2. Stage 2: ranking integration under conservative policy defaults.
3. Stage 3: Rust normalizer/aggregator default-on with Node fallback.
4. Stage 4: release gate validation and public benchmark report.

Execution detail and acceptance gates are tracked in:

- `docs/specs/workstream-j-implementation-plan.md`
