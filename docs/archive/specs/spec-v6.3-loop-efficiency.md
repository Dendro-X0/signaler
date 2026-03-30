# Spec: V6.3 Loop Efficiency and Runtime Cost Controls

Status: Implemented (March 21, 2026)  
Date: March 21, 2026  
Owners: Runner + Verify maintainers  
Depends on: Workstream H in `v6.3-adoption-roadmap.md`

## 1. Summary

This spec improves practical runtime efficiency for developer and agent loops without changing trust boundaries:

- Keep throughput for detection.
- Keep verify for focused validation.
- Add better runtime planning and budgeted route selection.

## 2. Baseline (Measured)

Measured on March 21, 2026 against `next-blogkit-pro`:

- `run` throughput (24 combos): ~300.6s
- `verify` throughput (top-actions=2, 20 combos): ~237.6s
- `analyze` lean: ~2.4s

The major runtime cost remains Lighthouse reruns; planning must reduce unnecessary verify scope.

## 3. Goals

- Add deterministic verify planning by runtime budget.
- Improve output predictability for low-memory environments.
- Improve orchestration metadata for agents and CI scripts.

## 4. Non-Goals

- No replacement of existing `--top-actions`/`--max-routes` controls.
- No hidden auto-tuning that changes comparability semantics.
- No change to pass/fail verification criteria.

## 5. Functional Requirements

## 5.1 Verify runtime budget flag

Add optional flag:

```bash
signaler verify --runtime-budget-ms <n>
```

Behavior:

- Use baseline `run.json` timing (`averageStepMs`) to estimate rerun cost.
- Trim selected verify routes to stay within budget when needed.
- Keep route ordering deterministic (highest-priority evidence first).
- Emit explicit note in `verify.json.summary.warnings` when trimming occurs.

## 5.2 Plan transparency

`verify --dry-run --json` should include:

- selected action ids
- candidate routes before trimming
- selected routes after trimming
- estimated runtime ms
- budget used (explicit flag or inferred default)

## 5.3 Command summary timing metadata

Compact command JSON outputs should include:

- `elapsedMs`
- `plannedCombos` (where applicable)
- `executedCombos` (where applicable)

Applies to:

- `analyze --json`
- `verify --json`

## 5.4 Low-memory messaging

When runtime profile forces low parallelism, CLI should print:

- reason (`low-memory`, etc.)
- expected throughput tradeoff
- one actionable alternative (for example, narrowed route set or focused verify flags)

## 6. Technical Design

## 6.1 Verify route budgeter

Add a deterministic planner utility:

1. Build candidate route list from selected actions (existing behavior).
2. Estimate cost per combo from baseline `averageStepMs`.
3. Compute max combos from `runtime-budget-ms`.
4. Trim to top routes by action priority + evidence density.
5. Preserve stable ordering for identical inputs.

Fallback:

- If baseline timing unavailable, use conservative default estimate and emit warning.

## 6.2 JSON command envelope

Extend compact command result payload shape with optional fields:

```ts
type CommandSummary = {
  command: string;
  status: "ok" | "fail";
  elapsedMs?: number;
  plannedCombos?: number;
  executedCombos?: number;
};
```

This remains additive and backward-compatible.

## 7. Validation Plan

1. Budget planner tests:
   - budget trims routes deterministically
   - identical input yields identical route selection
2. Dry-run JSON tests:
   - includes before/after route counts and estimated runtime
3. Summary JSON tests:
   - includes `elapsedMs` for `analyze`/`verify`
4. Low-memory message tests:
   - emits reason + actionable guidance
5. Regression tests:
   - no budget flag preserves current behavior
   - comparability checks and exit-code semantics unchanged

## 8. Success Criteria

- Focused verify loops are more predictable before execution.
- Agent orchestration can auto-select scoped verify runs based on time budget.
- No regressions in verification determinism or CI signaling (`exit 0/1/2/3` semantics).

## 9. Implementation Status

- Implemented: `verify --runtime-budget-ms <n>` with deterministic route trimming based on baseline `averageStepMs` and conservative fallback estimate when missing.
- Implemented: compact command summary timing metadata for `analyze --json` and `verify --json` (`elapsedMs`, plus `plannedCombos`/`executedCombos` where applicable).
- Implemented: low-memory guidance messaging with explicit speed-vs-stability actions in CLI output.
- Implemented: measured low-memory evidence runner (`bench:v63:lowmem`) emitting:
  - `benchmarks/out/v63-low-memory-evidence.json`
  - `benchmarks/out/v63-low-memory-evidence.md`
- Implemented: local unpublished-build workflow docs using `node ./dist/bin.js ...` command examples.
