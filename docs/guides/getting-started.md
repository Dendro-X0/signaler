# Getting Started

Signaler is a **reliable web lab runner** with an agent-first artifact contract.

If you are using an editor or terminal agent, start with [`agent-quickstart.md`](agent-quickstart.md).

This remastered release is designed to be installed and run as a CLI (`signaler`).

Canonical workflow:

1. `discover`
2. `run --mode throughput|fidelity`
3. `analyze --contract v6`
4. `verify --contract v6`
5. `report`

CLI onboarding shortcut:

- Run `signaler help agent` for copy/paste agent workflow commands, artifact order, and automation exit codes.
- Use `signaler help agent --json` when your agent runtime prefers structured onboarding metadata.
- Optional benchmark fixture helper: `pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json`
- Optional benchmark fixture helper: `pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json`
- Optional benchmark fixture helper: `pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json`
- Optional benchmark fixture helper: `pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json`
- Optional benchmark fixture helper: `pnpm run bench:fixture:parity -- --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-parity.json`

Legacy aliases remain supported:

- `init` (legacy alias of `discover`)
- `audit` (legacy alias of `run`)
- `review` (legacy alias of `report`)

Helpful navigation shortcuts:

- `open-triage` opens `.signaler/triage.md`
- `open-screenshots` opens `.signaler/screenshots/`
- `open-diagnostics` opens `.signaler/lighthouse-artifacts/diagnostics/`
- `open-lhr` opens `.signaler/lighthouse-artifacts/lhr/`

Optional audits:

- `links` (broken links crawl)
- `headers` (security headers)
- `console` (console errors + runtime exceptions)

## 1. Install / run

Registry-free installation (recommended):

Install the latest tagged GitHub Release in a single command:

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

Upgrade later (no registry):

```bash
signaler upgrade
```

Prerequisites:

- Your app must be reachable at a stable URL (for example `http://localhost:3000`).
- For folder mode, you need a built static output folder (for example `dist/`, `out/`, `build/`).

Recommended first run:

```bash
signaler discover --scope full
```

Local workspace execution (unpublished build):

If your latest CLI changes are only in your local workspace, run the built local binary directly with Node.

Windows (PowerShell, from repo root):

```powershell
corepack pnpm run build
node .\dist\bin.js discover --scope full
node .\dist\bin.js run --contract v3 --mode throughput --yes
node .\dist\bin.js analyze --contract v6 --json
node .\dist\bin.js verify --contract v6 --runtime-budget-ms 90000 --dry-run --json
```

macOS/Linux (from repo root):

```bash
corepack pnpm run build
node ./dist/bin.js discover --scope full
node ./dist/bin.js run --contract v3 --mode throughput --yes
node ./dist/bin.js analyze --contract v6 --json
node ./dist/bin.js verify --contract v6 --runtime-budget-ms 90000 --dry-run --json
```

If you use `--accessibility-pass`, you can convert its output into a local `accessibility-extended` benchmark fixture and feed it back into ranking:

```bash
pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json
node ./dist/bin.js analyze --contract v6 --benchmark-signals .signaler/benchmark-accessibility.json --json
```

If you run `headers`, you can convert `.signaler/headers.json` into a local `security-baseline` benchmark fixture and merge it the same way:

```bash
pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json
node ./dist/bin.js analyze --contract v6 --benchmark-signals .signaler/benchmark-security.json --json
```

If you run `health`, you can convert `.signaler/health.json` into a local `reliability-slo` benchmark fixture:

```bash
pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json
node ./dist/bin.js analyze --contract v6 --benchmark-signals .signaler/benchmark-reliability.json --json
```

SEO benchmark fixture helper (results + optional crawl signals from links):

```bash
pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json
node ./dist/bin.js analyze --contract v6 --benchmark-signals .signaler/benchmark-seo.json --json
```

Cross-browser parity benchmark fixture helper (browser/device snapshots):

```bash
pnpm run bench:fixture:parity -- --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-parity.json
node ./dist/bin.js analyze --contract v6 --benchmark-signals .signaler/benchmark-parity.json --json
```

## 2. Discover routes and create config

Inside the shell:

```text
> discover --scope full
```

Discovery creates or updates `signaler.config.json` and writes `.signaler/discovery.json`.

Discovery scopes:

- `signaler discover --scope full` (recommended for complete static route inventory)
- `signaler discover --scope quick` (starter subset for fast onboarding)
- `signaler discover --scope file --routes-file routes.txt` (explicit route list)

Compatibility setup alias remains supported:

- `signaler init` (default full-scope discovery alias of `discover`)
- `signaler init --advanced` (full prompt flow)
- `signaler init --run` (save config and run first audit automatically)

Discovery behavior:

- auto-detects a likely local base URL (`localhost` common ports)
- prefers current directory as project root
- auto-detects framework from `package.json`
- supports full-route and starter-route scopes
- shows a short run plan preview before handoff
- asks whether to run the first canonical audit immediately

You can also point the shell at a different config file:

```text
> config path/to/signaler.config.json
```

## 3. Measure (fast)

```text
> measure
```

This is a CDP-based pass (non-Lighthouse) designed for quick iteration.

Outputs:

- `.signaler/measure-summary.json`
- `.signaler/measure/` (screenshots and artifacts)

## 4. Run (Lighthouse)

```text
> run --contract v3 --mode throughput
```

Optional capture flags:

- `run --diagnostics`: capture DevTools-like Lighthouse tables and save screenshots.
- `run --lhr`: also save the full Lighthouse result JSON per page/device (implies `--diagnostics`).

During a run:

- A warm-up step may run first (if enabled).
- You will see a runtime progress line like `page X/Y - /path [device] | ETA ...`.
- Press **Esc** to cancel and return to the shell prompt.

Fidelity hardening option:

- `run --mode fidelity --isolation browser` forces strict browser relaunch semantics with `parallel=1` for maximum reproducibility.

Throughput stability option:

- `run --mode throughput --throughput-backoff aggressive` reduces parallelism faster when worker failures are detected.

Canonical outputs (v3):

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/agent-index.json`

V6 analyze outputs:

- `.signaler/analyze.json`
- `.signaler/analyze.md`
- `.signaler/verify.json`
- `.signaler/verify.md`

Legacy compatibility outputs (still available):

- `.signaler/summary.json`
- `.signaler/summary-lite.json`
- `.signaler/summary.md`
- `.signaler/triage.md`
- `.signaler/issues.json`
- `.signaler/red-issues.md`
- `.signaler/pwa.json`
- `.signaler/ai-fix.json` (unless `audit --no-ai-fix`)
- `.signaler/ai-fix.min.json` (unless `audit --no-ai-fix`)
- `.signaler/export.json` (unless `audit --no-export`)
- `.signaler/report.html`
- `.signaler/screenshots/` (when `--diagnostics` or `--lhr` is enabled)
- `.signaler/lighthouse-artifacts/diagnostics/` (when `--diagnostics` or `--lhr` is enabled)
- `.signaler/lighthouse-artifacts/diagnostics-lite/` (when `--diagnostics` or `--lhr` is enabled)
- `.signaler/lighthouse-artifacts/lhr/` (when `--lhr` is enabled)
- `.signaler/accessibility-summary.json`
- `.signaler/accessibility/` (axe-core artifacts per page/device)

Notes:

- Start with `triage.md` and `issues.json` when the suite is large.
- For AI/agent ingestion, use `agent-index.json` first.
- For V6 agent loops, use `analyze.json` then `verify.json`.
- For a copy-paste agent workflow and prompt pack, use `agent-quickstart.md`.
- For PWA-specific checks (HTTPS, service worker, offline signals), use `pwa.json`.
- Large JSON files may also be written as gzip copies (`*.json.gz`) to reduce disk size.

Speed and output controls:

- `run --focus-worst <n>` re-runs only the worst N combos from the previous run.
- `run --ai-min-combos <n>` limits `ai-fix.min.json` to the worst N combos (default 25).
- `run --no-ai-fix` and `run --no-export` can skip writing large artifacts.
- If parallel mode flakes (Chrome disconnects / Lighthouse target errors), retry with `run --stable` (forces parallel=1).

## 4.2 Analyze (Agent Packet)

```text
> analyze --contract v6
```

`analyze` consumes canonical v3 artifacts and emits a deterministic, token-budgeted action packet for agents.

Useful flags:

- `--artifact-profile lean|standard|diagnostics` (default `lean`)
- `--top-actions <n>` (default `12`)
- `--min-confidence high|medium|low` (default `medium`)
- `--token-budget <n>` (min `2000`; default by profile: `lean=8000`, `standard=16000`, `diagnostics=32000`)
- `--external-signals <path>` (repeatable local external-signal files merged into ranking)
- `--benchmark-signals <path>` (repeatable local benchmark fixture files for bounded composite ranking context + additive metadata; families: accessibility/security/SEO/reliability/parity)
- `--strict` (exit `2` on missing/invalid required v3 artifacts)
- `--json` (compact machine summary to stdout)

## 4.3 Verify (Focused Rerun + Delta Checks)

```text
> verify --contract v6
```

`verify` runs a focused rerun for selected actions/routes and emits pass/fail checks in `.signaler/verify.json`.

Useful flags:

- `--action-ids <csv>` (explicit actions from `analyze.json`)
- `--top-actions <n>` (default `1`)
- `--verify-mode fidelity|throughput` (default `fidelity`)
- `--max-routes <n>` (default `10`)
- `--runtime-budget-ms <n>` (optional route-budget cap using baseline average step timing)
- `--strict-comparability` (fail when comparability hash differs)
- `--allow-comparability-mismatch` (override strict mode)
- `--pass-thresholds <path>` (JSON threshold overrides)
- `--dry-run` (write plan artifacts and exit code `3`)
- `--json` (compact machine summary with timing/planning fields)

## 4.4 Review (Report Regeneration)

```text
> report
```

Use `report` to regenerate report outputs from existing `.signaler` artifacts without running Lighthouse again.
Legacy alias: `review`.

## 5. Bundle (build output sizes)

```text
> bundle
```

Output:

- `.signaler/bundle-audit.json`

## 5.1 Folder mode (static builds)

Folder mode can serve a static build output and run audits against auto-detected routes.

```bash
signaler folder --root ./dist
```

For very large sites you can also run bundle-only mode (skips Lighthouse):

```bash
signaler folder --root ./dist --bundle-only
```

## 6. Health (HTTP checks)

```text
> health
```

Output:

- `.signaler/health.json`

## 7. Links (broken links crawl)

```text
> links
```

Output:

- `.signaler/links.json`

## 8. Headers (security headers)

```text
> headers
```

Output:

- `.signaler/headers.json`

## 9. Console (runtime errors)

```text
> console
```

Output:

- `.signaler/console.json`

Notes:

- **Runs-per-combo is always 1**. Re-run the same command to compare results.
- The report includes Performance, Accessibility, Best Practices, and SEO.

## 10. Open the report

```text
> open
```

## 11. Next steps

- `../reference/configuration.md` for config details.
- `../reference/cli.md` for non-interactive CLI usage and CI/budgets.
- `../operations/performance-baseline.md` for Phase 0 benchmark baseline commands and interpretation.
- `../operations/slo.md` for baseline SLO formulas and thresholds.

## 12. Phase 0 benchmark baseline

Run the benchmark harness:

```bash
pnpm run bench:phase0
pnpm run bench:phase0:validate
```

CI observe-only run:

```bash
pnpm run bench:phase0:ci
```

Outputs:

- `benchmarks/out/phase0-baseline.json`
- `benchmarks/out/phase0-baseline.md`

