# Signaler V6 Blueprint

Status: Draft  
Date: March 15, 2026  
Intent: evolve Signaler from a Lighthouse runner into an agent-first optimization engine with Rust-accelerated core paths.

## 1. Summary

V6 keeps the existing strengths (`discover`, `run`, `report`) and adds two new canonical machine commands:

1. `analyze`: deterministic, token-bounded, evidence-linked action synthesis from canonical artifacts.
2. `verify`: focused rerun and pass/fail delta validation tied to action IDs.

Primary V6 promise:

- agents get high-signal action packets quickly
- findings stay evidence-linked and reproducible
- verification loops are explicit and automatable
- runtime and token overhead remain bounded on mainstream hardware

## 2. Product Contract (V6)

Canonical workflow:

1. `signaler discover`
2. `signaler run --mode throughput|fidelity`
3. `signaler analyze`
4. `signaler verify`

Compatibility:

- `report` remains supported for human-facing summaries.
- legacy aliases and artifacts remain available per existing compatibility flags.

## 3. Command Interfaces (Decision Complete)

## 3.1 `analyze`

Purpose:

- consume existing canonical artifacts
- produce compact, ranked, evidence-linked action packets for agents
- never trigger Lighthouse reruns

CLI:

```bash
signaler analyze \
  --dir .signaler \
  --artifact-profile lean|standard|diagnostics \
  --top-actions 12 \
  --min-confidence medium \
  --token-budget 8000 \
  --external-signals ./signals.json \
  --strict
```

Flags and defaults:

- `--dir <path>`: input/output directory, default `.signaler`
- `--artifact-profile <lean|standard|diagnostics>`: default `lean`
- `--top-actions <n>`: default `12`, range `1..100`
- `--min-confidence <high|medium|low>`: default `medium`
- `--token-budget <n>`: default `8000`, minimum `2000`
- `--external-signals <path>`: repeatable local external-signal file input
- `--strict`: fail on missing required canonical artifacts
- `--json`: print compact command summary JSON to stdout

Inputs (required):

- `run.json`
- `results.json`
- `suggestions.json`
- `agent-index.json`

Inputs (optional):

- `issues.json`
- `discovery.json`
- previous `analyze.json` for drift comparison hints

Outputs:

- `.signaler/analyze.json`
- `.signaler/analyze.md`

Exit codes:

- `0`: analyze completed and output written
- `1`: runtime or contract error
- `2`: strict-mode validation failure (missing artifacts/schema mismatch)

## 3.2 `verify`

Purpose:

- rerun a focused subset derived from analyze actions
- compute deterministic before/after deltas
- produce pass/fail outcomes for agent and CI loops

CLI:

```bash
signaler verify \
  --dir .signaler \
  --from .signaler/analyze.json \
  --action-ids action-1,action-2 \
  --top-actions 1 \
  --verify-mode fidelity \
  --max-routes 10 \
  --strict-comparability \
  --pass-thresholds .signaler/verify-thresholds.json
```

Flags and defaults:

- `--dir <path>`: input/output directory, default `.signaler`
- `--from <path>`: analyze source file, default `.signaler/analyze.json`
- `--action-ids <csv>`: explicit actions to verify
- `--top-actions <n>`: fallback selection when `--action-ids` missing, default `1`
- `--verify-mode <fidelity|throughput>`: default `fidelity`
- `--max-routes <n>`: default `10`, range `1..50`
- `--strict-comparability`: reject verification when comparability hash mismatch
- `--allow-comparability-mismatch`: override strict mode for exploratory checks
- `--pass-thresholds <path>`: optional custom verification thresholds
- `--dry-run`: output verification plan without executing rerun
- `--json`: print compact command summary JSON to stdout

Selection rules:

- if `--action-ids` set: verify those actions only
- else verify top `--top-actions` from `analyze.json`
- route set is the union of each action's affected combos, truncated by `--max-routes`

Outputs:

- `.signaler/verify.json`
- `.signaler/verify.md`
- `.signaler/verify-runs/<verifyRunId>/` (scoped rerun artifacts)

Exit codes:

- `0`: verify run completed and all checks passed
- `1`: runtime/runner/contract error
- `2`: verify run completed but one or more checks failed
- `3`: dry-run completed (`--dry-run`)

## 4. Public Artifacts and Types

## 4.1 `analyze.json` contract

```ts
type AnalyzeReportV6 = {
  schemaVersion: 1;
  generatedAt: string;
  source: {
    dir: string;
    runComparabilityHash: string;
    runMode: "fidelity" | "throughput";
    runProfile: string;
  };
  artifactProfile: "lean" | "standard" | "diagnostics";
  tokenBudget: number;
  rankingPolicy: {
    version: "v6.2";
    formula: "priority = round(basePriority * confidenceWeight * coverageWeight * (1 + externalBoostWeight))";
    confidenceWeights: { high: 1.0; medium: 0.7; low: 0.4 };
  };
  actions: AnalyzeActionV6[];
  summary: {
    totalCandidates: number;
    emittedActions: number;
    droppedZeroImpact: number;
    droppedLowConfidence: number;
    droppedMissingEvidence: number;
  };
};

type AnalyzeActionV6 = {
  id: string;
  sourceSuggestionId?: string;
  title: string;
  category: "performance" | "accessibility" | "best-practices" | "seo" | "reliability";
  priorityScore: number;
  confidence: "high" | "medium" | "low";
  estimatedImpact: {
    timeMs?: number;
    bytes?: number;
    affectedCombos: number;
  };
  affectedCombos: {
    label: string;
    path: string;
    device: "mobile" | "desktop";
  }[];
  evidence: {
    sourceRelPath: string;
    pointer: string;
    artifactRelPath?: string;
  }[];
  action: {
    summary: string;
    steps: string[];
    effort: "low" | "medium" | "high";
  };
  verifyPlan: {
    recommendedMode: "fidelity" | "throughput";
    targetRoutes: string[];
    expectedDirection: {
      score?: "up";
      lcpMs?: "down";
      tbtMs?: "down";
      cls?: "down";
      bytes?: "down";
    };
  };
};
```

Mandatory filtering:

- exclude rows where `timeMs <= 0` and `bytes <= 0`
- exclude rows with empty evidence pointers
- exclude rows below `--min-confidence`

Artifact profile policy:

- `lean`: top 12 actions, max 2 evidence pointers per action
- `standard`: top 25 actions, max 5 evidence pointers per action
- `diagnostics`: top 50 actions, max 10 evidence pointers per action

## 4.2 `verify.json` contract

```ts
type VerifyReportV6 = {
  schemaVersion: 1;
  verifyRunId: string;
  generatedAt: string;
  baseline: {
    dir: string;
    comparabilityHash: string;
    mode: "fidelity" | "throughput";
  };
  rerun: {
    dir: string;
    comparabilityHash: string;
    mode: "fidelity" | "throughput";
    elapsedMs: number;
  };
  comparability: {
    strict: boolean;
    matched: boolean;
    reason?: string;
  };
  checks: VerifyCheckV6[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    skipped: number;
    status: "pass" | "fail";
  };
};

type VerifyCheckV6 = {
  actionId: string;
  actionTitle: string;
  status: "pass" | "fail" | "skipped";
  reason?: string;
  before: {
    score?: number;
    lcpMs?: number;
    tbtMs?: number;
    cls?: number;
    bytes?: number;
  };
  after: {
    score?: number;
    lcpMs?: number;
    tbtMs?: number;
    cls?: number;
    bytes?: number;
  };
  delta: {
    score?: number;
    lcpMs?: number;
    tbtMs?: number;
    cls?: number;
    bytes?: number;
  };
  threshold: {
    minScoreDelta?: number;
    minLcpDeltaMs?: number;
    minTbtDeltaMs?: number;
    minClsDelta?: number;
    minBytesDelta?: number;
  };
  evidence: {
    sourceRelPath: string;
    pointer: string;
    artifactRelPath?: string;
  }[];
};
```

Default pass thresholds:

- score: `delta >= +1`
- LCP: `delta <= -100ms`
- TBT: `delta <= -25ms`
- CLS: `delta <= -0.01`
- bytes: `delta <= -1024`

Rule:

- a check passes when at least one expected metric improves beyond threshold and no key metric regresses beyond threshold.

## 5. Analyze/Verify Data Flow

1. `run` writes canonical baseline artifacts.
2. `analyze` ingests baseline and emits compact `analyze.json` plus markdown digest.
3. `verify` selects actions/routes, executes scoped rerun, and emits deterministic `verify.json`.
4. CI/agents use `verify.json.summary.status` as pass/fail automation signal.

## 6. Rust Core Plan (Decision Complete)

Default runtime policy:

- Rust sidecar enabled by default for hot paths in V6.
- Node fallback is mandatory for every Rust path.
- fallback reason must be emitted in command/runtime metadata.

V6 Rust modules:

1. queue/scheduler execution planner
2. artifact reducer + ranking precompute
3. verify delta comparator

Feature flags:

- `SIGNALER_RUST_CORE=1` force-enable core sidecar in transitional releases
- `SIGNALER_RUST_CORE=0` force-disable and run Node path only

## 7. CI and Release Gates

New CI checks:

- schema validation for `analyze.json` and `verify.json`
- deterministic ranking snapshot tests for `analyze`
- verify pass/fail behavior tests for threshold edge cases
- fallback tests (Rust unavailable, malformed output, timeout)

V6 gate:

- block release if `analyze` or `verify` schema or behavior tests fail
- allow warn-only for manual dogfood evidence tracking

## 8. Test Cases and Scenarios

Contract tests:

1. `analyze` rejects missing canonical inputs under `--strict`.
2. `analyze` never emits empty-evidence actions.
3. `verify` rejects comparability mismatch when strict mode on.
4. `verify` returns exit code `2` when checks fail.

Behavior tests:

1. `analyze --artifact-profile lean` caps action/evidence counts.
2. `verify --dry-run` writes plan and exits `3`.
3. `verify --action-ids` respects explicit action selection.
4. `verify` route selection is deterministic for same inputs.

E2E tests:

1. `discover -> run -> analyze -> verify` succeeds on synthetic fixture in <= 10 minutes.
2. rerun failure still writes valid `verify.json` with failed status.
3. Node fallback path produces functionally equivalent outputs when Rust sidecar unavailable.

## 9. Migration and Rollout

Phase rollout:

1. release `analyze` and `verify` behind `--contract v6` for one minor release
2. promote v6 contract to default in next release
3. keep v3 compatibility outputs for one additional release

Migration mapping:

- old agent entrypoint: `agent-index.json`
- new primary decision packet: `analyze.json`
- old manual rerun loop: `run --focus-worst`
- new verification loop: `verify`

## 10. Assumptions and Defaults

- package identity remains `@signaler/cli`
- canonical v5 commands remain available during v6 rollout
- Rust sidecar remains optional at install-time, required only for acceleration
- external adapters (PSI/CrUX/RUM/WPT) stay optional and non-blocking in initial V6
