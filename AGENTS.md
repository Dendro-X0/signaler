# AGENTS.md

This repository is optimized for direct agent workflows with Signaler.

## Primary Goal

Use Signaler to identify the highest-impact web quality issues and drive fix verification loops.

## Canonical CLI Flow

**New users — zero config (any stack)**

```bash
cd /path/to/your/web-app
signaler bootstrap --audit --yes
```

Signaler scans the directory (routes, ports, auth signals), writes `signaler.config.json`, attaches to a running loopback server, and runs the first audit. Works across Next.js, Nuxt, Remix, SvelteKit, and static SPAs without manual setup.

**One command when config already exists or after bootstrap**

```bash
signaler audit --cwd /path/to/project --base-url http://127.0.0.1:3000
```

If `signaler.config.json` is missing, `signaler audit` auto-writes it from explore (same algorithm as `bootstrap`).

**Bootstrap (explore + config only)**

```bash
signaler explore --cwd /path/to/project
signaler bootstrap --cwd /path/to/project
```

Defaults: **attach** to a running loopback server; discover (**full**) routes via native scan; **in-process** steps. If no server is running, Signaler prints a gentle start command and exits without treating it as a hard error. Opt in to managed serve with `--managed-serve` or `"serve": { "mode": "production" }`. Legacy CI: `SIGNALER_MANAGED_SERVE=1`.

After fixes, rerun with incremental skip:

```bash
signaler audit --cwd /path/to/project --incremental-skip
```

**Full web quality (v5)** — Lighthouse CI gate + headers + links + bundle:

```bash
signaler audit --quality-profile web-quality --cwd /path/to/project --base-url http://127.0.0.1:3000
```

Side runners in quality profiles: **headers**, **links**, **health**, **console**, **measure**, **accessibility**, **bundle** (outputs under `.signaler/runners/` in tree layout).

**Alternative: explicit job preset** (same attach-first / in-process defaults as `audit`)

```bash
signaler job run --preset agent \
  --cwd /path/to/project \
  --base-url http://127.0.0.1:3000
```

Use `--scope quick` only for a capped starter subset. Use `--incremental-skip` after fixes.

**Parallelism:** throughput runs default to **6 workers** on most machines (`audit`, agent preset, and `run` without overrides). Fewer workers do **not** improve accuracy; performance scores often diverge from DevTools — use issue-count triage (`query --view perf`). Lower parallel only for flake/OOM recovery (`--stable`), not score tuning. See `docs/guides/lab-semantics.md`.

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

- **`serve.mode`**: `attach` (default) — probe loopback only; `managed` / `production` / `dev` — Signaler may start a server.
- **`serve.portHints`**: extra ports for `explore` and attach probes.
- **`pages`**: explicit list of paths/devices to audit (written by discover or edited manually).
- **`routes.includePaths` / `routes.excludePaths`**: glob-like filters (`/blog/*`) applied before each run.
- **`discover --scope file --routes-file paths.json`**: replace discovery with a fixed route list.

## Protected routes (production lab auth)

Audit protected pages on a **production build** without editing project `.env` or running dev mode:

```json
{
  "serveEnv": { "DEMO_AUTH_BYPASS": "true" },
  "auth": { "warmupUrl": "/api/demo-auth?callbackUrl=/admin" },
  "perfIncludeYellow": false
}
```

- `serveEnv` — injected into Signaler's managed `start` child only (never written to the repo).
- `auth` — session cookies for preflight + Lighthouse (`cookies`, `cookieFile`, or `warmupUrl`).
- `perfIncludeYellow: false` — **red-only** performance triage (default on lean). TUI shows Red/Yel counts per route; details in `performance-triage.json#/combos`.

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
"qualityPack": {
  "maxHeaderFailures": 0,
  "maxBrokenLinks": 0
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
signaler query --view fix-queue --dir .signaler --json
signaler query --view coverage --dir .signaler
signaler query --view perf --dir .signaler
signaler query --view delta --dir .signaler
signaler explain --id <issue-id> --dir .signaler
```

Do not read the entire `.signaler/` directory. Use projections only.

## Canonical Artifact Read Order (when files are used directly)

Tree layout (default since v4.5): start from `.signaler/INDEX.md` or `manifest.json`.

1. `agent/fix-queue.json` — ranked surgical fix list (path, device, url, savings, pointers)
2. `agent/coverage.json` — scored vs skipped routes
3. `agent/performance-triage.json` (issue-count performance triage; not score parity)
4. `agent/analyze.json` or `runs/analyze/analyze.json` (after `signaler analyze --contract v6`)
5. `agent/index.json` (agent-index)
6. `agent/suggestions.json` only when `explain` or evidence pointers require it

Legacy flat paths (`analyze.json` at root) are removed after tree materialize; use `signaler query` or paths above.

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
