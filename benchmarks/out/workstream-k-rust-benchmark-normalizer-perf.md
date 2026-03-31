# Workstream K Rust Benchmark Normalizer Perf Evidence

Generated: 2026-03-31T10:13:43.104Z
Status: PASS
Workspace: E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\benchmarks\workspaces\workstream-k-rust-benchmark-normalizer-perf
Iterations per case: 6
Records per source: 200

## Fixture

- source files: 5
- input records: 1000
- input files (dedupe exercised): 6

## Timing

| Case | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |
| --- | --- | --- | --- | --- | --- |
| node-normalizer | 16.33 | 12.54 | 29.97 | 11.38 | 29.97 |
| rust-normalizer | 382.82 | 371.05 | 426.03 | 355.68 | 426.03 |

## Delta

- median delta (rust - node): 358.51ms (2858.93%)
- p95 delta (rust - node): 396.06ms (1321.52%)

## Rust Usage

- rust used iterations: 6/6
- rust fallback iterations: 0/6
- sidecar commands: normalize-benchmark
- fallback reasons: (none)

## Assertions

- nodeOutputStable: true
- rustOutputStable: true
- parityMatched: true
- rustUsedEveryIteration: true

- note: This evidence compares benchmark-signal normalization cost only (no Lighthouse run cost included).
- note: Output parity is verified by deterministic digest comparison of normalized records.
- note: Status is fail when Rust falls back in any iteration, which indicates sidecar execution was unavailable for this run.

