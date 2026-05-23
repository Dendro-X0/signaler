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

- Throughput default parallel is conservative (`2` in v3 defaults) and may be capped further by host memory.
- Higher parallelism speeds scans but increases score depression from shared CPU/network contention.
- Use `--stable` or `--parallel 1` when parallel mode flakes; use focused reruns instead of full-suite fidelity.

## Agent workflow

```bash
signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --artifact-profile lean --ci --no-color --yes
signaler analyze --contract v6 --artifact-profile lean
signaler query --view perf
signaler explain --id <top-issue-id>
# implement fix
signaler verify --contract v6
signaler query --view delta
```

Performance actions from `analyze` prefer `performance-triage.json` and verify with **issue-count** deltas when `expectedDirection.issueCount` is `down`.

See also: [Agent Artifact Protocol](../specs/agent-artifact-protocol.md)
