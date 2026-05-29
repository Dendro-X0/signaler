# Signaler V5 Phase 0 Baseline

Generated: 2026-03-23T09:56:48.743Z

| Env | Profile | Mode | Status | Elapsed (ms) | Avg Step (ms) | Combos | Parallel |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| ci-linux | synthetic-medium | throughput | ok | 147353 | 3683.825 | 40 | 3 |
| ci-linux | synthetic-small | throughput | ok | 59768 | 5976.8 | 10 | 2 |
| ci-linux | real-next-blogkit-pro | throughput | warn | 0 | 0 | 0 | 0 |

## Summary

- total: 3
- ok: 2
- warn: 1
- error: 0

## Notes

- [real-next-blogkit-pro/throughput] Skipped run: unresolved base URL for profile real-next-blogkit-pro.
- [real-next-blogkit-pro/throughput] Provide env var from profile baseUrl token before running this benchmark.
- [real-next-blogkit-pro/throughput] Missing .signaler/run.json
- [real-next-blogkit-pro/throughput] Missing .signaler/summary.json

## TODO

- Phase 1: convert observe-only deltas into hard regression gates.
