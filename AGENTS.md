# AGENTS.md

This repository is optimized for direct agent workflows with Signaler.

## Primary Goal

Use Signaler to identify the highest-impact web quality issues and drive fix verification loops.

## Canonical CLI Flow

**Preferred (v4+): one-shot audit orchestrator (all routes by default)**

```bash
signaler audit --cwd /path/to/project --base-url http://127.0.0.1:3000
```

Defaults: discover (**full** — all static routes) → run → analyze; managed production serve and in-process steps on by default.

After fixes, rerun with incremental skip:

```bash
signaler audit --cwd /path/to/project --incremental-skip
```

**Alternative: explicit job preset**

```bash
signaler job run --preset agent \
  --managed-serve --in-process \
  --cwd /path/to/project \
  --base-url http://127.0.0.1:3000
```

Use `--scope quick` only for a capped starter subset. Use `--incremental-skip` after fixes.

**Manual steps** (when you need finer control):

```bash
signaler discover --scope quick --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --managed-serve --parallel 6 \
  --artifact-profile lean --ci --no-color --yes
signaler analyze --contract v6 --artifact-profile lean
signaler verify --contract v6
signaler query --view perf --json
```

## Route selection (`signaler.config.json`)

- **`pages`**: explicit list of paths/devices to audit (written by discover or edited manually).
- **`routes.includePaths` / `routes.excludePaths`**: glob-like filters (`/blog/*`) applied before each run.
- **`discover --scope file --routes-file paths.json`**: replace discovery with a fixed route list.

## Incremental skip (rerun after fixes)

Skip combos that already passed in the previous run (reads `.signaler/summary.json` or `results.json`):

```bash
signaler run --config signaler.config.json --incremental-skip
signaler audit --incremental-skip
```

Config criteria (all optional; defaults shown):

```json
"qualityGate": {
  "enabled": true,
  "maxRedPerfIssues": 0,
  "minCategoryScores": { "accessibility": 90, "bestPractices": 90, "seo": 90 }
},
"baselineCompare": {
  "baselineDir": ".signaler-main",
  "maxRedIncrease": 0,
  "requireComparabilityMatch": true
},
"incrementalSkip": {
  "enabled": true,
  "minPerformanceScore": 90,
  "minAccessibilityScore": 90,
  "minBestPracticesScore": 90,
  "minSeoScore": 90,
  "maxFailedAudits": 0,
  "requireNoRuntimeErrors": true
}
```

Combine with `--incremental --build-id <id>` to also reuse Lighthouse cache for unchanged combos.

**PR / changed-files** (requires existing `signaler.config.json`):

```bash
signaler job run --preset pr
signaler job run --preset pr --incremental --build-id "$(git rev-parse --short HEAD)"
```

Roadmap: `docs/roadmap/active-roadmap.md` (Phase 1: `docs/roadmap/phase1-v4.1-adoptability.md`)

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
