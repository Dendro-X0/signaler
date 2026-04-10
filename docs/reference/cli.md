# CLI Reference and CI Integration

This document describes non-interactive CLI usage (for scripts/CI) and budget enforcement.

## 1. Commands

The primary CLI binary is `signaler`. A compatibility alias, `signalar`, is also installed by the portable release flow and points to the same CLI.

Recommended global install:

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

Update later:

```bash
signaler upgrade
signalar upgrade
```

Remove the global install later:

```bash
signaler uninstall --global
```

JSR remains useful for package distribution and publishing, but it is not the primary global CLI bootstrap path:

```bash
npx jsr run @signaler/cli <command> [flags]
```

Command help is side-effect free:

- `signaler <command> --help` prints command-scoped help and exits `0`.
- It does not run discovery/audits or prompt for interactive input.
- `signaler help agent` prints an agent-first end-to-end workflow, artifact ingestion order, and automation exit-code contract.
- `signaler help agent --json` prints the same onboarding contract in machine-readable JSON for agent bootstrap scripts.
- `pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json` converts local accessibility output into `accessibility-extended` benchmark input for `--benchmark-signals`.
- `pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json` converts local headers output into `security-baseline` benchmark input for `--benchmark-signals`.
- `pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json` converts local health output into `reliability-slo` benchmark input for `--benchmark-signals`.
- `pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json` converts local results/links output into `seo-technical` benchmark input for `--benchmark-signals`.
- `pnpm run bench:fixture:parity -- --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-parity.json` converts local cross-browser/cross-device snapshots into `cross-browser-parity` benchmark input for `--benchmark-signals`.

Unpublished local workspace flow:

When the latest changes are not yet published, run the local build directly:

```bash
corepack pnpm run build
node ./dist/bin.js discover --scope full
node ./dist/bin.js run --contract v3 --mode throughput --yes
node ./dist/bin.js analyze --contract v6 --json
node ./dist/bin.js verify --contract v6 --runtime-budget-ms 90000 --dry-run --json
```

Install from GitHub Releases:

1. Download the `signaler-<version>.tgz` asset from the GitHub Release.
2. Install it in your project:

```bash
pnpm add -D ./signaler-<version>.tgz
```

Or install system-wide (no registries) using the portable zip installer:

- Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

- macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

Upgrade later:

```bash
signaler upgrade
```

This portable installer creates both:

- `signaler` as the primary launcher
- `signalar` as a compatibility alias

### `shell`

Interactive mode (recommended for local use):

```bash
signaler shell
```

Inside the shell:

- `discover`
- `run`
- `analyze`
- `verify`
- `report`
- `measure`
- `audit` (legacy alias)
- `review` (legacy alias)
- `bundle`
- `health`
- `links`
- `headers`
- `console`
- `open`
- `open-analyze`
- `open-verify`
- `open-triage`
- `open-screenshots`
- `open-diagnostics`
- `open-lhr`
- `open-artifacts`
- `pages` / `routes`
- `add-page`
- `rm-page`
- `clear-screenshots`
- `discover --scope full|quick|file`
- `init` (legacy alias)
- `config <path>`

Notes:

- `discover` is the primary setup command and writes `.signaler/discovery.json`.
- Canonical agent-first loop is `discover -> run -> analyze -> verify -> report`.
- `init` remains a compatibility alias for setup flows.
- `init` will attempt to detect your project type from `package.json`.
- `init` defaults to full-scope discovery; use `init --scope quick` for a starter subset.
- Use `init --advanced` for full manual prompts.
- In monorepos, `init` can scan `apps/*` and `packages/*` and prompt you to choose which app/package to configure.
- `init` can auto-discover routes from the filesystem and top-up from `robots.txt`/`sitemap.xml`.
- `--scope quick` proposes a starter route set; advanced mode supports include/exclude filtering and manual route control.
- Static HTML projects can be detected from HTML files under `dist/`, `build/`, `out/`, `public/`, and `src/`.
- If you use a localhost base URL (e.g. `http://localhost:3000`), ensure the dev server port matches the project you are configuring to avoid overwrites/conflicts when multiple projects are running.
- Confirmation prompts default to **Yes** on Enter (e.g. overwrite).
- `init --run` saves config and immediately executes a canonical first run (`run --contract v3 --mode throughput`).

Deterministic discovery flags (CI/scripts):

- `--base-url <url>`
- `--project-root <path>`
- `--profile <next|nuxt|remix|sveltekit|spa|custom>`
- `--non-interactive`
- `--yes`

### `run` (canonical)

Run Lighthouse audits from a config file:

```bash
signaler run --config signaler.config.json --contract v3 --mode throughput
```

Notes:

- Throughput mode is optimized for broad coverage; fidelity mode targets reproducibility-oriented runs.
- Accessibility is opt-in via `--accessibility-pass`.
- Progress output includes page count + ETA.

Key flags:

- `--ci`
- `--fail-on-budget`
- `--no-color` / `--color`
- `--log-level <silent|error|info|verbose>`
- `--stable` (forces parallel=1)
- `--mobile-only` / `--desktop-only`
- `--parallel <n>`
- `--audit-timeout-ms <ms>`
- `--diagnostics` / `--lhr`
- `--flags` (print audit flags/options and exit)
- `--plan` / `--max-steps <n>` / `--max-combos <n>` / `--yes`
- `--incremental --build-id <id>`
- `--focus-worst <n>` (re-run only the worst N combos from the previous `.signaler/summary.json`)
- `--ai-min-combos <n>` (limit `ai-fix.min.json` to the worst N combos; default 25)
- `--no-ai-fix` (skip writing `ai-fix.json` and `ai-fix.min.json`)
- `--no-export` (skip writing `export.json`)
- `--open`
- `--json`
- `--isolation <shared|per-audit|browser>` (`browser` forces strict relaunch semantics with `parallel=1`)
- `--throughput-backoff <auto|aggressive|off>` (controls adaptive parallel backoff in throughput runs)
- `--artifact-profile <lean|standard|diagnostics>` (machine-output profile, default `lean`)
- `--machine-token-budget <n>` (strict machine-output token budget, default by profile)
- `--external-signals <path>` (repeatable local external-signal files merged into v3 suggestion ranking)
- `--benchmark-signals <path>` (repeatable local benchmark fixture files merged into bounded suggestion ranking + additive `multiBenchmark` metadata; families: accessibility/security/SEO/reliability/parity)

Accessibility fixture helper (local-file adapter path):

```bash
pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json
signaler run --contract v3 --benchmark-signals .signaler/benchmark-accessibility.json
pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json
signaler run --contract v3 --benchmark-signals .signaler/benchmark-security.json
pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json
signaler run --contract v3 --benchmark-signals .signaler/benchmark-reliability.json
pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json
signaler run --contract v3 --benchmark-signals .signaler/benchmark-seo.json
pnpm run bench:fixture:parity -- --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-parity.json
signaler run --contract v3 --benchmark-signals .signaler/benchmark-parity.json
```

Runtime accelerator flags (opt-in):

- `SIGNALER_RUST_DISCOVERY=1` enables Rust route detection path
- `SIGNALER_RUST_PROCESSOR=1` enables Rust summary top-issue processing path
- `SIGNALER_RUST_CORE=0|1` controls Rust core run/reducer path (`0` force Node fallback, `1` force Rust, unset defaults to Rust-first with fallback)
- `SIGNALER_RUST_NETWORK=1` enables Rust network workers globally (`health|headers|links|console`)
- `SIGNALER_RUST_HEALTH=1` enables Rust worker for `health`
- `SIGNALER_RUST_HEADERS=1` enables Rust worker for `headers`
- `SIGNALER_RUST_LINKS=1` enables Rust worker for `links`
- `SIGNALER_RUST_CONSOLE=1` enables Rust worker for `console`
- `SIGNALER_RUST_BENCHMARK=1` enables Rust benchmark-signal normalizer + scoring path (falls back to Node on failure; sidecar commands support `normalize-benchmark|normalize-benchmark-signals` and `score-benchmark|score-benchmark-signals`)

If Rust sidecar execution fails or is unavailable, Signaler falls back to Node automatically and records accelerator metadata (`requested`, `enabled`, `used`, fallback reason, normalization/scoring sidecar commands, sidecar elapsed times, scoring matched-record count, and normalization stats) in `.signaler/run.json` and `.signaler/analyze.json`.

Canonical outputs (v3):

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/agent-index.json`
- `.signaler/analyze.json` (when `analyze --contract v6` is run)
- `.signaler/analyze.md` (when `analyze --contract v6` is run)
- `.signaler/verify.json` (when `verify --contract v6` is run)
- `.signaler/verify.md` (when `verify --contract v6` is run)

Default v3 output now de-emphasizes heavy legacy AI payloads. Use `--legacy-artifacts` only when you explicitly need `summary-lite.json`, `ai-ledger.json`, or `ai-fix*.json`.

Legacy compatibility outputs:

- `.signaler/summary.json`
- `.signaler/summary-lite.json`
- `.signaler/issues.json`
- `.signaler/pwa.json`
- `.signaler/triage.md`
- `.signaler/red-issues.md`
- `.signaler/ai-ledger.json`
- `.signaler/ai-fix.json` (unless `--no-ai-fix`)
- `.signaler/ai-fix.min.json` (unless `--no-ai-fix`)
- `.signaler/export.json` (unless `--no-export`)
- `.signaler/lighthouse-artifacts/diagnostics/` (when `--diagnostics` or `--lhr`)
- `.signaler/lighthouse-artifacts/diagnostics-lite/` (when `--diagnostics` or `--lhr`)
- `.signaler/lighthouse-artifacts/lhr/` (when `--lhr`)

Note: large JSON artifacts may also be written as gzip copies (`*.json.gz`).

Legacy alias: `audit` remains supported and maps to the same runner.

Exit codes:

- `0`: success
- `1`: failure (runtime error or budgets)
- `130`: cancelled (Ctrl+C). In shell mode, Esc-cancel returns you to the prompt.

### `analyze` (V6-gated machine packet)

Generate deterministic action packets for agents from canonical v3 artifacts:

```bash
signaler analyze --contract v6 --dir .signaler
```

Flags:

- `--dir <path>` (default `.signaler`)
- `--artifact-profile <lean|standard|diagnostics>` (default `lean`)
- `--top-actions <n>` (default `12`, range `1..100`)
- `--min-confidence <high|medium|low>` (default `medium`)
- `--token-budget <n>` (minimum `2000`; default by profile: `lean=8000`, `standard=16000`, `diagnostics=32000`)
- `--external-signals <path>` (repeatable local external-signal files merged into v6 action ranking)
- `--benchmark-signals <path>` (repeatable local benchmark fixture files merged into bounded composite action ranking + additive `multiBenchmark` metadata; families: accessibility/security/SEO/reliability/parity)

Accessibility fixture helper (same input usable for analyze):

```bash
pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json
signaler analyze --contract v6 --benchmark-signals .signaler/benchmark-accessibility.json --json
pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json
signaler analyze --contract v6 --benchmark-signals .signaler/benchmark-security.json --json
pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json
signaler analyze --contract v6 --benchmark-signals .signaler/benchmark-reliability.json --json
pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json
signaler analyze --contract v6 --benchmark-signals .signaler/benchmark-seo.json --json
pnpm run bench:fixture:parity -- --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-parity.json
signaler analyze --contract v6 --benchmark-signals .signaler/benchmark-parity.json --json
```
- `--strict` (missing/invalid required artifact => exit `2`)
- `--json` (compact command summary JSON)

Required input artifacts:

- `run.json`
- `results.json`
- `suggestions.json`
- `agent-index.json`

Outputs:

- `.signaler/analyze.json`
- `.signaler/analyze.md`

Exit codes:

- `0`: success
- `1`: runtime/processing failure
- `2`: strict validation failure

### `verify` (V6-gated focused rerun + checks)

Run selected actions against a focused rerun and evaluate deterministic pass/fail deltas:

```bash
signaler verify --contract v6 --dir .signaler --from .signaler/analyze.json
```

Flags:

- `--dir <path>` baseline artifacts directory (default `.signaler`)
- `--from <path>` analyze source (default `.signaler/analyze.json`)
- `--action-ids <csv>` explicit action IDs
- `--top-actions <n>` fallback selection count (default `1`)
- `--verify-mode <fidelity|throughput>` rerun mode (default `fidelity`)
- `--max-routes <n>` focused route cap (default `10`)
- `--runtime-budget-ms <n>` optional route-budget cap using baseline `run.json` average step timing
- `--strict-comparability`
- `--allow-comparability-mismatch`
- `--pass-thresholds <path>` thresholds JSON override
- `--dry-run`
- `--json` (includes timing/planning fields like `elapsedMs`, `plannedCombos`, `executedCombos`, selected routes)

Outputs:

- `.signaler/verify.json`
- `.signaler/verify.md`
- `.signaler/verify-runs/<verifyRunId>/`

Exit codes:

- `0`: all checks passed
- `1`: runtime/processing error
- `2`: verify checks completed with failures
- `3`: dry-run completed

## 1.1 Recommended speed workflows

For large suites, prefer a two-phase workflow:

1. Broad sweep (fast feedback): set `throttlingMethod: simulate` in `signaler.config.json` and run the full suite.
2. Focused rerun (high-signal): re-run only the worst combos from the previous run using `--focus-worst <n>`. For this focused rerun, you can switch to `throttlingMethod: devtools` for a more DevTools-like rerun.

When you care about token efficiency and disk output size:

- Use `--ai-min-combos <n>` to keep `ai-fix.min.json` small.
- Use `--no-ai-fix` when you only need `issues.json` / `triage.md` and the HTML report.
- Use `--no-export` when you do not need `export.json` links or share payloads.
- Use `agent-index.json` as the canonical one-run AI entry point (v3 contract). Use `ai-ledger.json` only in legacy compatibility workflows.
- Use `issues.json.offenders` to find repeated offenders (e.g. unused JS files) with route + artifact evidence pointers.
- Use `pwa.json` to track PWA checks (HTTPS, service worker, offline signals) across routes.

## Known issues

- **Large-run Lighthouse stability**: very large audits (many page/device combinations) may show higher score variance than manual Lighthouse runs and can intermittently hit worker/Chrome disconnects. Workaround: reduce parallelism (`--stable`) and retry.
- See [`../guides/known-limits.md`](../guides/known-limits.md) for broader operational limits and guardrails.

## Benchmark and Gate Commands

Phase 0 baseline:

```bash
pnpm run bench:phase0
pnpm run bench:phase0:ci
pnpm run bench:phase0:validate
```

Phase 2 soft gate:

```bash
pnpm run bench:phase2:gate
```

Phase 4 network-worker baseline and gate:

```bash
pnpm run bench:phase4
pnpm run bench:phase4:ci
pnpm run bench:phase4:gate
```

### `report` (primary)

Regenerate review/report outputs from existing `.signaler` artifacts (no new Lighthouse run):

```bash
signaler report
```

Legacy alias: `review` remains supported.

### `measure`

Run fast CDP-based metrics:

```bash
signaler measure --config signaler.config.json
```

Note: `measure` is an engine command; when using the launcher, run the engine directly (this will be simplified in a future release).

Key flags:

- `--mobile-only` / `--desktop-only`
- `--parallel <n>`
- `--timeout-ms <ms>`
- `--screenshots`
- `--json`

### `bundle`

Scan build outputs to report total JS/CSS size and the largest files.

```bash
signaler bundle --project-root .
```

Key flags:

- `--project-root <path>`
- `--top <n>`
- `--json`

Output:

- `.signaler/bundle-audit.json`

### `health`

Fast HTTP checks for routes from `signaler.config.json`.

```bash
signaler health --config signaler.config.json
```

Key flags:

- `--config <path>`
- `--parallel <n>`
- `--timeout-ms <ms>`
- `--json`

Output:

- `.signaler/health.json`

### `links`

Sitemap + HTML link extraction to find broken internal links.

```bash
signaler links --config signaler.config.json
```

Key flags:

- `--config <path>`
- `--sitemap <url>`
- `--parallel <n>`
- `--timeout-ms <ms>`
- `--max-urls <n>`
- `--json`

Output:

- `.signaler/links.json`

### `headers`

Security headers presence check per configured route.

```bash
signaler headers --config signaler.config.json
```

Key flags:

- `--config <path>`
- `--parallel <n>`
- `--timeout-ms <ms>`
- `--json`

Output:

- `.signaler/headers.json`

### `console`

Headless Chrome pass that captures console errors and uncaught exceptions.

```bash
signaler console --config signaler.config.json
```

Key flags:

- `--config <path>`
- `--parallel <n>`
- `--timeout-ms <ms>`
- `--max-events <n>`
- `--json`

Output:

- `.signaler/console.json`

## 2. CI mode and budgets

Budgets are configured in `signaler.config.json` under `budgets`.

Run in CI:

```bash
signaler run --contract v3 --mode throughput --ci --no-color
```

Behavior:

- If budgets are configured, Signaler evaluates thresholds and exits non-zero on violations.
- In CI mode, ANSI color is disabled by default unless you pass `--color`.

## 3. GitHub Actions example

Minimal example (start app, wait, run audit):

```yaml
name: Signaler

on:
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: corepack enable
      - run: pnpm install
      - run: pnpm build
      - run: pnpm start &
      - run: npx wait-on http://localhost:3000
      - run: pnpm exec signaler discover --scope full --non-interactive --yes --base-url http://localhost:3000
      - run: pnpm exec signaler run --contract v3 --mode throughput --ci --no-color --yes
      - run: pnpm exec signaler report
```

## 4. Baseline benchmark harness (observe-only)

Use these commands to capture speed/reliability baseline artifacts before optimization work:

```bash
pnpm run bench:phase0
pnpm run bench:phase0:validate
```

CI-oriented run:

```bash
pnpm run bench:phase0:ci
```

Outputs:

- `benchmarks/out/phase0-baseline.json`
- `benchmarks/out/phase0-baseline.md`

Optional real profile base URL (for `real-next-blogkit-pro`):

```bash
set SIGNALER_NEXT_BLOGKIT_BASE_URL=http://127.0.0.1:3000
pnpm run bench:phase0
```

Optional Rust comparison probe (benchmark-only in Phase 0):

```bash
set SIGNALER_RUST_DISCOVERY=1
pnpm run bench:phase0
```

Notes:

- Phase 0 CI is observe-only and does not hard-fail PRs on benchmark deltas.
- Node remains the source-of-truth execution path; Rust is comparison-only in this phase.

## 5. Soft gate (severe-only)

CI now includes a soft gate evaluator:

```bash
pnpm run bench:phase2:gate
```

This gate fails only on severe conditions:

1. `elapsedMs` regression > `max(35%, 60000ms)` for same profile/mode.
2. throughput `failureRate > 0.20`.
3. benchmark entry `status=error`.
4. missing required artifacts (`run.json` or `summary.json`).

Moderate regressions are warnings only.

## 6. Rust parity tests

Parity and fallback behavior checks:

```bash
pnpm run test:rust:parity
```

## 7. Release gate

Release readiness evaluator:

```bash
pnpm run bench:phase6:cross-platform-evidence -- --os <ubuntu-latest|windows-latest|macos-latest> --out-json benchmarks/out/cross-platform-smoke-<os>.json
pnpm run test:phase6:gate
pnpm run bench:phase6:gate
pnpm run bench:phase6:validate
```

Outputs:

- `benchmarks/out/phase6-release-gate.json`
- `benchmarks/out/phase6-release-gate.md`
- `benchmarks/out/cross-platform-smoke-*.json`
- `benchmarks/out/cross-platform-smoke-*.md`

Phase 6 gate is blocking for missing required docs/artifacts, CI prerequisites, and (in CI mode) missing/invalid cross-platform smoke evidence artifacts. Dogfood evidence remains warn-only/manual during this phase.

## 8. Release-standardization gate

Release-standardization gate evaluator:

```bash
pnpm run bench:v3:phase1
pnpm run bench:v3:gate
pnpm run bench:v3:validate
```

Outputs:

- `benchmarks/out/v3-release-gate.json`
- `benchmarks/out/v3-release-gate.md`

Dogfood evidence helper:

```bash
pnpm run v3:dogfood:list
pnpm run v3:dogfood upsert --repo <repo> --owner <owner> --start <YYYY-MM-DD> --end <YYYY-MM-DD> --notes "<notes>"
pnpm run v3:repo-validation:list
pnpm run v3:repo-validation upsert --repo <repo> --owner <owner> --url <https://github.com/org/repo> --date <YYYY-MM-DD> --lighthouse-resolved <n> --signaler-resolved <n> --notes "<notes>"
```

Machine-readable evidence sources:

- `release/v3/dogfood-evidence.json`
- `release/v3/repo-validation-evidence.json`

Release manifest generation:

```bash
pnpm run v3:manifest generate \
  --version 3.1.3 \
  --channel rc \
  --asset dist/signaler-3.1.3.tgz \
  --gate benchmarks/out/v3-release-gate.json \
  --gate benchmarks/out/v63-success-gate.json \
  --out release/v3/release-manifest.generated.json
```

Release manifest packaging-policy smoke (Phase 2 baseline):

```bash
pnpm run v3:manifest:smoke
pnpm run v3:manifest:validate
```

Push/release preflight (docs + gate + manifest readiness):

```bash
pnpm run release -- --target-version 3.1.3
```

Strict mode (fail if cross-platform smoke evidence is missing):

```bash
pnpm run release -- --target-version 3.1.3 --require-cross-platform --strict
```

JSR publish helper (runs build + validates package/jsr context before publish):

```bash
pnpm run jsr:publish
```

## 9. Success gate

Workstream J benchmark-coverage gate:

```bash
pnpm run bench:workstream-j:gate
pnpm run bench:workstream-j:validate
```

Outputs:

- `benchmarks/out/workstream-j-gate.json`
- `benchmarks/out/workstream-j-gate.md`

Success gate evaluator:

```bash
pnpm run bench:v63:loop
pnpm run bench:v63:lowmem
pnpm run bench:workstream-k:rust-benchmark
pnpm run bench:v63:gate
pnpm run bench:v63:validate
```

Outputs:

- `benchmarks/out/v63-loop-smoke.json`
- `benchmarks/out/v63-loop-smoke.md`
- `benchmarks/out/v63-low-memory-evidence.json`
- `benchmarks/out/v63-low-memory-evidence.md`
- `benchmarks/out/workstream-k-rust-benchmark-normalizer-perf.json`
- `benchmarks/out/workstream-k-rust-benchmark-normalizer-perf.md`
- `benchmarks/out/v63-success-gate.json`
- `benchmarks/out/v63-success-gate.md`

`bench:v63:loop` runs a tiny local canonical loop smoke (`discover -> run -> analyze -> verify --dry-run -> report`) against an in-process local server and emits reproducible evidence artifacts.

The gate is blocking for missing canonical-flow docs, missing local unpublished-build workflow docs, missing Workstream H runtime-budget/timing integration, and missing regression test coverage. Manual evidence checks remain warn-only, including Workstream J optional-input overhead and Workstream K Rust normalizer perf/parity evidence.

## 10. GitHub workflow templates

Reusable templates are available under:

- `.github/workflow-templates/signaler-audit-pnpm.yml`
- `.github/workflow-templates/signaler-audit-npm.yml`
- `.github/workflow-templates/signaler-audit-yarn.yml`

Each template runs canonical CI flow:

1. start app
2. wait for base URL
3. `discover`
4. `run --contract v3 --mode throughput`
5. `report`
6. upload `.signaler/*` artifacts

## 11. Agent bootstrap (copy/paste)

Use this block to bootstrap a coding agent quickly:

```bash
# 1) Produce canonical artifacts
signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --ci --no-color --yes
signaler analyze --contract v6
signaler verify --contract v6
signaler report

# 2) Feed these files to the agent in order
# .signaler/analyze.json
# .signaler/verify.json
# .signaler/agent-index.json
# .signaler/suggestions.json
# .signaler/issues.json
# .signaler/results.json
# .signaler/run.json
```

Agent rules:

1. Start from `agent-index.json` and follow evidence pointers.
2. Prioritize high-confidence, high-impact suggestions.
3. Implement one small fix at a time, then rerun Signaler.
4. Use focused `--mode fidelity --focus-worst <n>` reruns only when parity-sensitive validation is required.

One-command script variants:

- `bash scripts/agent-bootstrap.sh`
- `powershell -ExecutionPolicy Bypass -File scripts/agent-bootstrap.ps1`
- `corepack pnpm run agent:bootstrap:sh`
- `corepack pnpm run agent:bootstrap:ps`

