# Getting Started

Signaler is a **reliable web lab runner** with an agent-first artifact contract.

This remastered release is designed to be installed and run as a CLI (`signaler`).

Canonical workflow:

1. `init`
2. `run --mode throughput|fidelity`
3. `review`

Legacy aliases remain supported:

- `audit` (legacy alias of `run`)
- `report` (legacy alias of `review`)

Helpful navigation shortcuts:

- `open-triage` opens `.signaler/triage.md`
- **NEW**: Review `.signaler/QUICK-FIXES.md` for immediate action items
- **NEW**: Check `.signaler/AI-SUMMARY.json` for quick AI assessment
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
signaler init
```

## 2. Create a config

Inside the shell:

```text
> init
```

The wizard creates or updates `signaler.config.json`.

Init modes:

- `signaler init` (default quick onboarding)
- `signaler init --quick` (explicit quick mode)
- `signaler init --advanced` (full prompt flow)
- `signaler init --run` (save config and run first audit automatically)

Quick mode behavior:

- auto-detects a likely local base URL (`localhost` common ports)
- prefers current directory as project root
- auto-detects framework from `package.json`
- proposes a starter route set for fast first run
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

Canonical outputs (v3):

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/agent-index.json`

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
- **NEW in v2.0.1**: `.signaler/AI-ANALYSIS.json` (comprehensive AI report)
- **NEW in v2.0.1**: `.signaler/AI-SUMMARY.json` (ultra-condensed AI report)
- **NEW in v2.0.1**: `.signaler/QUICK-FIXES.md` (enhanced developer triage)
- `.signaler/export.json` (unless `audit --no-export`)
- `.signaler/report.html`
- `.signaler/screenshots/` (when `--diagnostics` or `--lhr` is enabled)
- `.signaler/lighthouse-artifacts/diagnostics/` (when `--diagnostics` or `--lhr` is enabled)
- `.signaler/lighthouse-artifacts/diagnostics-lite/` (when `--diagnostics` or `--lhr` is enabled)
- `.signaler/lighthouse-artifacts/lhr/` (when `--lhr` is enabled)
- `.signaler/accessibility-summary.json`
- `.signaler/accessibility/` (axe-core artifacts per page/device)

## 4.1 AI-Optimized Reports (New in v2.0.1)

Signaler now generates AI-optimized reports that provide token-efficient analysis and enhanced developer insights:

### Quick Developer Triage
```text
cat .signaler/QUICK-FIXES.md
```

This enhanced triage report includes:
- **Performance score disclaimers** explaining why scores are lower than DevTools
- **Time estimates** for each recommended fix
- **Specific file paths** and implementation guidance
- **Impact analysis** with concrete metrics

### AI Analysis Integration
```javascript
// Ultra-condensed for quick AI assessment (95% token reduction)
const summary = JSON.parse(fs.readFileSync('.signaler/AI-SUMMARY.json'));
console.log(`Status: ${summary.status}`);
console.log(`Top issue: ${summary.topIssues[0].type}`);

// Comprehensive structured analysis (75% token reduction)
const analysis = JSON.parse(fs.readFileSync('.signaler/AI-ANALYSIS.json'));
analysis.criticalIssues.forEach(issue => {
  console.log(`${issue.severity}: ${issue.title}`);
  console.log(`Fix: ${issue.fixGuidance.implementation}`);
});
```

### Performance Score Context
All reports now include clear disclaimers about performance score accuracy:

- **Headless Chrome environment** produces lower scores than DevTools
- **Batch testing** is optimized for relative comparison, not absolute measurement
- **Use for trend analysis** and identifying optimization opportunities
- **Actual user experience** is better than test results indicate

Notes:

- Start with `triage.md` and `issues.json` when the suite is large.
- For AI/agent ingestion, use `agent-index.json` first.
- For PWA-specific checks (HTTPS, service worker, offline signals), use `pwa.json`.
- Large JSON files may also be written as gzip copies (`*.json.gz`) to reduce disk size.

Speed and output controls:

- `run --focus-worst <n>` re-runs only the worst N combos from the previous run.
- `run --ai-min-combos <n>` limits `ai-fix.min.json` to the worst N combos (default 25).
- `run --no-ai-fix` and `run --no-export` can skip writing large artifacts.
- If parallel mode flakes (Chrome disconnects / Lighthouse target errors), retry with `run --stable` (forces parallel=1).

## 4.2 Review (Report Regeneration)

```text
> review
```

Use `review` to regenerate report outputs from existing `.signaler` artifacts without running Lighthouse again.
Legacy alias: `report`.

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

- `configuration-and-routes.md` for config details.
- `cli-and-ci.md` for non-interactive CLI usage and CI/budgets.
