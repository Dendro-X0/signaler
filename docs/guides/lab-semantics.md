# Lab Semantics (Scan vs Check vs Verify)

Signaler runs are **lab experiments**, not user-session replays.

## Modes

| Mode | CLI | Purpose |
| --- | --- | --- |
| **Scan** | `run --mode throughput` | Rank routes/issues quickly across many combos |
| **Check** | `run --mode fidelity` | Narrower, more stable reruns on worst routes |
| **Verify** | `verify --contract v6` | Pass/fail after a fix under the same comparability hash |

## Performance scores vs issue-count triage

- **Do not** expect batch performance scores to match a one-off DevTools run (often 10–30 points lower under parallel load).
- **Do** use `performance-triage.json` and `signaler query --view perf` for actionable red/yellow issues.
- **Do** use score deltas only within the same mode/profile/hash.

Accessibility, SEO, and best-practices category scores are more stable vs DevTools and remain score-based.

## Parallelism guidance

- **Default:** throughput runs use **6 parallel workers** on most machines (`signaler audit` and `signaler run` without overrides). Set `SIGNALER_PARALLEL=6` or pass `--parallel 6` explicitly.
- **Accuracy:** reducing parallel workers does **not** improve measurement accuracy. Lower parallelism only trades speed for stability when workers crash or memory is exhausted.
- **DevTools divergence:** lab scores under throughput + simulated throttling often differ from DevTools; that is expected — prioritize issue-count triage over chasing score parity.
- **When to lower parallel:** only for flake recovery (`--stable` / `--parallel 1`) or genuine OOM — not to “improve” scores.
- **Runtime backoff:** throughput mode may reduce active workers on low memory or worker failures. Backoff protects stability; it does not make results more accurate. Audits default to **production serve** (`next build` + `start`); use `--managed-serve-mode dev` only for local dev-server smoke runs.
- **Large suites:** use `--plan` to preview; use `discover --scope quick` for smoke runs; use `--focus-worst` for targeted reruns instead of full-suite single-threaded fidelity.

```bash
# Recommended default (6 workers)
signaler audit --cwd /path/to/project --base-url http://127.0.0.1:3000

# Explicit throughput run after discover
signaler run --contract v3 --mode throughput --parallel 6 --artifact-profile lean --ci --no-color --yes
```

## Agent workflow

```bash
signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --parallel 6 --artifact-profile lean --ci --no-color --yes
signaler analyze --contract v6 --artifact-profile lean
signaler query --view perf
signaler explain --id <top-issue-id>
# implement fix
signaler verify --contract v6
signaler query --view delta
```

Performance actions from `analyze` prefer `performance-triage.json` and verify with **issue-count** deltas when `expectedDirection.issueCount` is `down`.

See also: [Agent Artifact Protocol](../specs/agent-artifact-protocol.md)
