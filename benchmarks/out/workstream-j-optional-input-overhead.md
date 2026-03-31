# Workstream J Optional-Input Overhead Evidence

Generated: 2026-03-31T03:49:24.916Z
Status: PASS
Workspace: E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\benchmarks\workspaces\workstream-j-optional-input-overhead
Iterations per case: 5

## Timing

| Case | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |
| --- | --- | --- | --- | --- | --- |
| baseline | 3.8 | 3 | 7 | 3 | 7 |
| benchmark-signals | 6.2 | 4 | 16 | 3 | 16 |

## Overhead

- median overhead: 1ms (33.33%)
- p95 overhead: 9ms (128.57%)
- budget max median overhead: 30ms
- budget max p95 overhead: 60ms

## Multi-Benchmark Metadata Snapshot

- baseline enabled: false
- benchmark enabled: true
- benchmark accepted: 2
- benchmark rejected: 1
- benchmark digest: 03f7ab49d0f2fbc850bd1f876b80f4c25278d9424fa907c5e42b1e17cf603fe2

## Assertions

- baselineHasNoBenchmarkMerge: true
- benchmarkHasAcceptedRecords: true
- medianOverheadWithinBudget: true
- p95OverheadWithinBudget: true

- note: This evidence isolates analyze-stage optional benchmark signal overhead.
- note: Lighthouse execution cost is intentionally excluded to keep the measurement deterministic and local.
- note: Benchmark fixtures include accepted and stale records to exercise conservative policy rejection counters.

