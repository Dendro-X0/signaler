# AGENTS.md

This repository is optimized for direct agent workflows with Signaler.

## Primary Goal

Use Signaler to identify the highest-impact web quality issues and drive fix verification loops.

## Canonical CLI Flow

**Preferred (v3.3+): one-shot agent job with production serve**

```bash
signaler job run --preset agent \
  --managed-serve --in-process \
  --scope quick \
  --cwd /path/to/project \
  --base-url http://127.0.0.1:3000
```

Defaults: discover (quick) → run (throughput, parallel 6, lean) → analyze (v6).  
Override parallel: `--parallel 4` or `SIGNALER_PARALLEL=4`.  
Exit codes: `0` ok; `1` discover/run failed; `2` run ok, analyze failed (use `performance-triage.json`).

**Manual steps** (when you need finer control):

```bash
signaler discover --scope quick --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --managed-serve --parallel 6 \
  --artifact-profile lean --ci --no-color --yes
signaler analyze --contract v6 --artifact-profile lean
signaler verify --contract v6
signaler query --view perf --json
```

**PR / changed-files** (requires existing `signaler.config.json`):

```bash
signaler job run --preset pr
signaler job run --preset pr --incremental --build-id "$(git rev-parse --short HEAD)"
```

Roadmap: `docs/roadmap/version-roadmap.md`

## Agent read API (preferred over raw files)

```bash
signaler query --view agent --dir .signaler
signaler query --view perf --dir .signaler
signaler query --view delta --dir .signaler
signaler explain --id <issue-id> --dir .signaler
```

Do not read the entire `.signaler/` directory. Use projections only.

## Canonical Artifact Read Order (when files are used directly)

1. `analyze.json` (after `signaler analyze --contract v6`)
2. `performance-triage.json` (issue-count performance triage; not score parity)
3. `agent-index.json`
4. `suggestions.json` only when `explain` or evidence pointers require it

## Performance reporting

- Performance: **issue-count triage** (red/yellow). Scores are lab-trend signals only.
- Accessibility / SEO / best practices: category scores (usually DevTools-aligned).

## Analysis Rules

1. Start from `signaler query --view agent` or `analyze.json`.
2. Use `signaler query --view perf` for performance prioritization.
3. Call `signaler explain --id ...` before editing code.
4. Prioritize red issues and high-confidence suggestions with non-zero impact.
5. Use `verify` for pass/fail after fixes.

## Fix Loop

1. Pick one high-confidence issue.
2. Implement the smallest credible fix.
3. Re-run Signaler.
4. Compare `query --view perf` and `verify.json`.
5. Stop if evidence does not support the fix.

## Defaults and Boundaries

- Prefer canonical v3/v6 artifacts over legacy outputs.
- Lean artifact profile is the default for agents (`--artifact-profile lean`).
- Use `--perf-include-yellow` when you need yellow performance issues in triage.
- Cortex is optional and not required for agent operation in this repository.

## Quick References

- `docs/specs/agent-artifact-protocol.md`
- `docs/guides/lab-semantics.md`
- `docs/guides/agent-quickstart.md`
- `docs/examples/agent-prompt-pack.md`
