# Workstream J Optional-Input Overhead Evidence

Generated: 2026-04-03T04:36:06.959Z
Status: PASS
Workspace: E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\benchmarks\workspaces\workstream-j-optional-input-overhead
Iterations per case: 5

## Timing

| Case | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |
| --- | --- | --- | --- | --- | --- |
| baseline | 13 | 10 | 22 | 8 | 22 |
| benchmark-signals | 14 | 12 | 25 | 7 | 25 |

## Overhead

- median overhead: 2ms (20%)
- p95 overhead: 3ms (13.64%)
- budget max median overhead: 30ms
- budget max p95 overhead: 60ms

## Multi-Benchmark Metadata Snapshot

- baseline enabled: false
- benchmark enabled: true
- benchmark accepted: 2
- benchmark rejected: 1
- benchmark digest: b7ccc8bc5a07f22a8c184af8a8b530b75368d3ea41115a7589d7723bf6a46038

## Assertions

- baselineHasNoBenchmarkMerge: true
- benchmarkHasAcceptedRecords: true
- medianOverheadWithinBudget: true
- p95OverheadWithinBudget: true

- note: This evidence isolates analyze-stage optional benchmark signal overhead.
- note: Lighthouse execution cost is intentionally excluded to keep the measurement deterministic and local.
- note: Benchmark fixtures include accepted and stale records to exercise conservative policy rejection counters.

