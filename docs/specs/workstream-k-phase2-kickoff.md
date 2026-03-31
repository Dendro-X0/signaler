# Workstream K Phase 2 Kickoff Spec (V3.1.x)

Status: Active  
Owner: Signaler core  
Last updated: 2026-03-30

## Goal

Implement a Rust normalizer/aggregator for high-volume optional benchmark inputs so large fixture sets remain deterministic and faster than the Node fallback path.

## Scope

1. Add Rust command surface for benchmark normalization/reduction:
   - `signaler_hotpath normalize-benchmark --in <path> --out <path>`
2. Define a stable reduction contract shared by Node and Rust:
   - normalized mapping keys (`issueId`, `path`, `device`, confidence, weight)
   - deterministic sort order and digest behavior
3. Integrate Node bridge fallback policy:
   - `SIGNALER_RUST_BENCHMARK=1` attempts Rust first
   - automatic Node fallback on any Rust failure
4. Wire into both `run` and `analyze` optional benchmark merge path without changing no-flag behavior.
5. Add parity + perf evidence checks and CI visibility.

## Progress Notes

1. Completed: Rust-first benchmark adapter path (`SIGNALER_RUST_BENCHMARK=1`) now attempts sidecar normalization first and only falls back to Node on failure.
2. Completed: sidecar command alias support for `normalize-benchmark` and `normalize-benchmark-signals`.
3. Completed: deterministic normalization hardening (sorted/deduped evidence + records) with emitted normalizer stats (`recordsCount`, `inputRecordsCount`, `dedupedRecordsCount`, `recordsDigest`).
4. Completed: additive accelerator metadata wiring in `run` and `analyze` artifacts for Rust benchmark path (`requested`, `enabled`, `used`, fallback/elapsed/command/stats).
5. Completed: parity/fallback test expansion for the new Rust benchmark adapter metadata surface.

## Non-Goals

1. Live provider ingestion or remote fetch.
2. Any breaking contract changes to current V3/V6 artifacts.
3. Replacing TypeScript CLI orchestration.

## Deliverables

1. Rust sidecar implementation for benchmark normalization/reduction.
2. Shared Node/Rust contracts for normalized benchmark payloads.
3. Runtime metadata in outputs:
   - accelerator requested/used/fallback reason
   - digest and accepted/rejected counters unchanged from current semantics
4. Tests:
   - Rust/Node parity for identical inputs
   - fallback behavior on sidecar failures
   - deterministic ordering over repeated runs
5. Benchmarks:
   - large synthetic fixture runtime comparison (Node vs Rust path)
   - publishable report in `benchmarks/out/`.

## Acceptance Criteria

1. Optional benchmark ranking output is byte-for-byte deterministic across repeated runs.
2. Rust and Node normalized outputs are equivalent for supported fixture contracts.
3. Rust path shows measurable median speedup on large fixture sets.
4. No regression in default flow when benchmark inputs are omitted.
5. Existing V3/V6 validators and release gates continue to pass.

## Execution Plan

1. Contracts and command scaffold
   - define `src/rust/multi-benchmark-contracts.ts` contract details for normalized output
   - add Rust CLI command and JSON I/O
2. Rust reducer implementation
   - deterministic grouping, confidence gate, weight clamp, digest contribution
3. Node bridge integration
   - update `src/rust/multi-benchmark-adapter.ts` and merge call sites
4. Test and benchmark integration
   - parity + fallback tests
   - runtime benchmark script and evidence artifact
5. Docs and roadmap update
   - reflect completion in `docs/roadmap/active-roadmap.md`
   - update CLI docs for accelerator behavior and troubleshooting
