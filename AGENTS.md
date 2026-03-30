# AGENTS.md

This repository is optimized for direct agent workflows with Signaler.

## Primary Goal

Use Signaler to identify the highest-impact web quality issues and drive fix verification loops.

## Canonical CLI Flow

Run this sequence unless project docs define a specific variant:

```bash
signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --ci --no-color --yes
signaler report
```

## Canonical Artifact Read Order

Read these files in order:

1. `.signaler/agent-index.json`
2. `.signaler/suggestions.json`
3. `.signaler/issues.json`
4. `.signaler/results.json`
5. `.signaler/run.json`

Do not ingest the entire `.signaler/` directory by default.

## Analysis Rules

1. Start from `agent-index.json`.
2. Follow evidence pointers before proposing fixes.
3. Prioritize suggestions with:
   - high confidence
   - broad combo impact
   - non-zero time or bytes impact
4. Treat throughput performance scores as trend-oriented.
5. Use focused fidelity reruns only for parity-sensitive verification.

## Fix Loop

1. Pick one high-confidence issue.
2. Implement the smallest credible fix.
3. Re-run Signaler.
4. Compare updated canonical artifacts.
5. Stop and report if evidence does not support the fix.

## Defaults and Boundaries

- Prefer canonical v3 artifacts over legacy outputs.
- Keep changes focused; do not rewrite broad unrelated areas.
- Use Rust flags only when explicitly requested or when benchmarking accelerator behavior.
- Cortex is optional and not required for agent operation in this repository.

## Quick References

- `docs/guides/agent-quickstart.md`
- `docs/examples/agent-prompt-pack.md`
