# Signaler V4 Reset Spec

Status: Draft  
Date: March 3, 2026  
Intent: Redesign Signaler around reliable web lab runs and high-signal outputs before new feature expansion.

## 1. Problem Statement

Signaler has regressed in practical value because:

- Product scope is too broad for current reliability.
- Runner behavior prioritizes throughput over trust by default.
- Discovery defaults can hide full-route coverage.
- Output set is noisy for both developers and AI agents.

V4 resets the product to one core promise:

**Reliable, actionable web quality lab runs at project scale.**

## 2. Product Contract

Primary workflow:

1. `signaler discover`
2. `signaler run --mode fidelity|throughput`
3. `signaler report`

Compatibility aliases remain during migration:

- `init` -> `discover`
- `review` -> `report`

## 3. Command Surface (V4)

### 3.1 `discover`

Purpose: build a deterministic route inventory and audit plan.

Required behavior:

- Detect framework and route sources.
- Provide explicit scope choice:
  - `--scope quick` (starter subset)
  - `--scope full` (all detectable non-dynamic static routes)
  - `--scope file <path>` (user-provided routes)
- Show exact counts:
  - total detected routes
  - selected routes
  - excluded dynamic routes (for example `[slug]`)
  - excluded by filters
- Save output plan artifact:
  - `.signaler/discovery.json`

### 3.2 `run`

Purpose: execute audits under explicit protocol guarantees.

Modes:

- `fidelity` (default for local trust checks)
- `throughput` (default for CI-scale trend checks)

`fidelity` executor requirements:

- Sequential by default (`parallel=1`).
- Fresh browser context per combo.
- Optional full browser relaunch per combo: `--isolation browser`.
- Warm-up support with deterministic policy.
- Strict comparability metadata.

`throughput` executor requirements:

- Bounded parallelism with hard CPU-safe caps.
- Adaptive backoff on worker instability.
- Clear disclaimer that parity with DevTools is not guaranteed.

### 3.3 `report`

Purpose: generate developer-facing and agent-facing summaries from canonical artifacts.

Behavior:

- Print concise shell summary with top priorities.
- Generate:
  - `.signaler/report.md`
  - `.signaler/results.json`
  - `.signaler/suggestions.json`
  - `.signaler/run.json`

## 4. Runner Protocol and Reliability

Each run must include protocol metadata in `run.json`:

- `mode`
- `profile`
- `throttlingMethod`
- `parallel`
- `warmUp`
- `headless`
- `sessionIsolation`
- `runsPerCombo`
- `comparabilityHash`

Comparisons are valid only when `comparabilityHash` matches.

## 5. Actionable Issue Extraction Contract

For each audited combo, Signaler must capture:

- Category scores: `performance`, `accessibility`, `best-practices`, `seo`
- Core metrics: `LCP`, `INP`, `CLS`, `TBT`, `FCP`, `TTFB` when available
- Fixable Lighthouse opportunities with evidence pointers

Filtering rules:

- Exclude zero-impact opportunities from default ranking.
- Exclude unsupported/manual-only audits from actionable ranking.
- Require evidence pointers for any suggestion shown in top results.

## 6. Multi-Standard Coverage (Beyond Lighthouse)

V4 adds first-class non-Lighthouse checks under one contract:

- Accessibility pass (axe-based findings).
- Headers/security checks (for example CSP/HSTS/basic hardening).
- Crawl and indexability checks (robots, sitemap, canonical consistency).
- Link integrity checks for selected routes.

Results are merged into `results.json` and influence `suggestions.json` ranking.

## 7. Resource Control and Performance Budget

Runner resource guarantees:

- CPU-safe auto parallel policy by hardware class.
- Per-run max concurrency cap.
- Optional low-impact mode: `--resource-profile low`.
- Backpressure when system memory drops below threshold.

Operational principle:

- Local default favors stability.
- CI default favors bounded throughput.

## 8. Output Simplification

Canonical artifacts only by default:

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/report.md`

Legacy artifacts are opt-in via compatibility flag and marked deprecated in CLI output.

## 9. Acceptance Criteria

V4 is ready only when all pass:

1. Full discovery mode reproduces expected static route inventory for supported frameworks.
2. Fidelity mode can run sequential audits with browser/context isolation without freezing or killing user Chrome.
3. Shell always prints final summary and output file paths.
4. Suggestions top-N contain no zero-impact rows.
5. Canonical artifacts validate against schema in CI.
6. Median performance drift versus controlled DevTools baseline remains within documented tolerance band.
7. 50-page, dual-device runs are feasible on mainstream 6C/12T machines using CPU-safe defaults.

## 10. Delivery Plan

Phase 0: Contract freeze and docs alignment.

- Publish V4 contract docs and migration notes.
- Freeze command semantics for `discover/run/report`.

Phase 1: Discovery reliability reset.

- Rebuild route inventory and scope controls.
- Add transparent exclusion accounting.

Phase 2: Runner protocol split hardening.

- Implement fidelity isolation executor.
- Enforce throughput resource caps and adaptive backoff.

Phase 3: Output and suggestion rationalization.

- Canonical artifact set only by default.
- Enforce actionable filtering and evidence requirements.

Phase 4: Multi-standard integration and launch gate.

- Integrate accessibility/headers/crawl/link modules into one contract.
- Pass acceptance criteria and release.

## 11. Non-Goals for V4

- No major TUI redesign in the reset cycle.
- No broad AI chat assistant expansion until runner trust and output signal are stable.
- No destructive removal of legacy commands in initial V4 release.

## 12. Migration Notes (Planned)

- `init` and `review` remain as aliases for one transition cycle.
- Existing V3 artifact readers continue via compatibility mode.
- New onboarding and docs use only `discover -> run -> report`.
