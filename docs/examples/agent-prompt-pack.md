# Agent Prompt Pack

Use these prompts to get editor and terminal agents productive with Signaler quickly.

All variants assume the same operating model:

1. run Signaler (prefer `job run --preset agent`)
2. read **projections** (`query` / `explain`) or canonical artifacts
3. follow evidence pointers
4. implement the smallest credible fix
5. `verify` and compare `query --view delta`

## Shared setup note

Use this context with any model:

```text
Signaler is an agent-first web lab runner.

Canonical workflow:
1. signaler job run --preset agent --base-url http://127.0.0.1:3000
   (or: discover → run --contract v3 --artifact-profile lean → analyze --contract v6)
2. signaler query --view agent --dir .signaler
3. signaler query --view perf --dir .signaler
4. signaler explain --id <issue-id> --dir .signaler

After a fix:
1. signaler verify --contract v6
2. signaler query --view delta --dir .signaler

Rules:
- Do not ingest the whole .signaler directory by default.
- Performance: issue-count triage (red/yellow), not headline Lighthouse score parity.
- Accessibility / SEO / BP: category scores.
- Treat throughput runs as trend-oriented.
- Use focused fidelity reruns only after a likely fix is identified.
```

## Codex prompt

```text
Use Signaler as the primary audit tool for this repository.

First:
1. Run `signaler job run --preset agent` if fresh artifacts are missing.
2. Run `signaler query --view agent` and `signaler query --view perf`.
3. Call `signaler explain --id <id>` before proposing code changes.

Then:
1. Identify the smallest high-confidence fix with the best expected impact.
2. Implement only that fix.
3. Re-run Signaler and use `signaler verify --contract v6`.
4. Compare `signaler query --view delta` for pass/fail evidence.
```

## Claude prompt

```text
You are working in a repo audited by Signaler.

Start from:
- signaler query --view agent
- signaler query --view perf

Do not read full results.json unless explain points you there.

Prioritize:
- red performance issues
- high-confidence suggestions with non-zero timeMs or bytes impact

Fix loop:
1. one fix
2. verify --contract v6
3. query --view delta
4. stop if evidence does not support the change
```

## Cursor / generic agent prompt

```text
Signaler artifacts live in .signaler/. Use projections:

signaler query --view agent|perf|actions|delta
signaler explain --id <issue-id>

PR-scoped audit (existing config):
signaler job run --preset pr

Read AGENTS.md and docs/guides/agent-quickstart.md for repo defaults.
```
