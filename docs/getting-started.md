# Getting Started

Signaler (formerly ApexAuditor) is a **measure-first** performance + metrics assistant.

This remastered release is designed to be installed and run as a CLI (`signaler`).

Typical workflow:

1. Run the interactive shell.
2. Use `measure` for fast feedback.
3. Use `audit` for deep Lighthouse analysis.
4. Use `bundle` to quickly sanity-check build output sizes.
5. Use `health` to validate routes are up and reasonably fast.
6. Type `open` to review the latest HTML report.

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
signaler wizard
```

## 2. Create a config

Inside the shell:

```text
> init
```

The wizard creates or updates `apex.config.json`.

You can also point the shell at a different config file:

```text
> config path/to/apex.config.json
```

## 3. Measure (fast)

```text
> measure
```

This is a CDP-based pass (non-Lighthouse) designed for quick iteration.

Outputs:

- `.signaler/measure-summary.json`
- `.signaler/measure/` (screenshots and artifacts)

## 4. Audit (Lighthouse)

```text
> audit
```

Optional capture flags:

- `audit --diagnostics`: capture DevTools-like Lighthouse tables and save screenshots.
- `audit --lhr`: also save the full Lighthouse result JSON per page/device (implies `--diagnostics`).

During an audit:

- A warm-up step may run first (if enabled).
- You will see a runtime progress line like `page X/Y — /path [device] | ETA ...`.
- Press **Esc** to cancel and return to the shell prompt.

Outputs:

- `.signaler/run.json` (stable run index)
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
- For PWA-specific checks (HTTPS, service worker, offline signals), use `pwa.json`.
- Large JSON files may also be written as gzip copies (`*.json.gz`) to reduce disk size.

Speed and output controls:

- `audit --focus-worst <n>` re-runs only the worst N combos from the previous run.
- `audit --ai-min-combos <n>` limits `ai-fix.min.json` to the worst N combos (default 25).
- `audit --no-ai-fix` and `audit --no-export` can skip writing large artifacts.
- If parallel mode flakes (Chrome disconnects / Lighthouse target errors), retry with `audit --stable` (forces parallel=1).

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
