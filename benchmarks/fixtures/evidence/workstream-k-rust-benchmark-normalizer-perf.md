# Workstream K Rust Benchmark Normalizer Perf Evidence

Generated: 2026-04-05T15:50:25.320Z
Status: PASS
Workspace: E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\benchmarks\workspaces\workstream-k-rust-benchmark-normalizer-perf
Iterations per case: 2
Records per source: 50000

## Fixture

- source files: 5
- input records: 250000
- input files (dedupe exercised): 6

## Timing

| Case | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |
| --- | --- | --- | --- | --- | --- |
| node-normalizer | 2669.28 | 2663.68 | 2674.88 | 2663.68 | 2674.88 |
| rust-normalizer | 2223.5 | 2218 | 2229 | 2218 | 2229 |

## Delta

- median delta (rust - node): -445.68ms (-16.73%)
- p95 delta (rust - node): -445.88ms (-16.67%)

## Adapter Overhead

| Metric | Mean (ms) | Median (ms) | P95 (ms) |
| --- | --- | --- | --- |
| rust-adapter-end-to-end | 3138.01 | 3095.3 | 3180.72 |
| rust-kernel-only | 2223.5 | 2218 | 2229 |

- median adapter overhead (adapter - kernel): 877.3ms
- p95 adapter overhead (adapter - kernel): 951.72ms

## Rust Usage

- rust used iterations: 2/2
- rust fallback iterations: 0/2
- sidecar commands: normalize-benchmark
- fallback reasons: (none)

## Assertions

- nodeOutputStable: true
- rustOutputStable: true
- parityMatched: true
- rustUsedEveryIteration: true

- note: Rust timing row reports sidecar kernel elapsed when available, so normalization kernels are compared apples-to-apples.
- note: Adapter end-to-end timing (including sidecar JSON handoff/parse overhead) is reported separately in the Adapter Overhead section.
- note: This evidence compares benchmark-signal normalization cost only (no Lighthouse run cost included).
- note: Output parity is verified by deterministic digest comparison of normalized records.
- note: Status is fail when Rust falls back in any iteration, which indicates sidecar execution was unavailable for this run.

