# ApexAuditor

ApexAuditor is a **measure-first** performance + metrics assistant.

Use it to:

- **Measure fast** (CDP-based): LCP/CLS/INP + screenshot + console errors.
- **Audit deep** (Lighthouse): Performance + Accessibility + Best Practices + SEO.
- **Review results** in a clean, structured console output and an HTML report.

## Most common commands

From your web project root:

```bash
pnpm dlx apex-auditor@latest
```

This is the recommended way to run ApexAuditor because it always uses the latest published version.

Notes:

- `init` can auto-detect your stack from `package.json` (Next.js, Nuxt, Remix/React Router, SvelteKit, SPA).
- In monorepos, `init` can prompt you to pick an app/package under `apps/` or `packages/`.
- `init` can auto-discover routes from the filesystem and top-up from `robots.txt`/`sitemap.xml`. You can optionally filter detected routes with include/exclude patterns and still add manual routes. For larger route sets, the wizard may default filtering to **Yes** and prefill common excludes (framework-specific).
- For static sites, `init` can discover routes from HTML files under `dist/`, `build/`, `out/`, `public/`, and `src/`.
- When using a localhost base URL (e.g. `http://localhost:3000`), make sure the dev server port matches the project you’re configuring (important when multiple projects are running).

Inside the interactive shell:

- **measure**
- **audit**
- **bundle** (scan build output sizes; writes `.apex-auditor/bundle-audit.json`)
- **health** (HTTP status/latency checks; writes `.apex-auditor/health.json`)
- **links** (broken links crawl; writes `.apex-auditor/links.json`)
- **headers** (security headers check; writes `.apex-auditor/headers.json`)
- **console** (console errors + runtime exceptions; writes `.apex-auditor/console.json`)
- **open** (open the latest HTML report)
- **open-triage** (open `.apex-auditor/triage.md`)
- **open-screenshots** (open `.apex-auditor/screenshots/`)
- **open-diagnostics** (open `.apex-auditor/lighthouse-artifacts/diagnostics/`)
- **open-lhr** (open `.apex-auditor/lighthouse-artifacts/lhr/`)
- **open-artifacts** (open `.apex-auditor/lighthouse-artifacts/`)
- **pages** / **routes** (print configured pages/routes from the current config)
- **add-page** (interactive: append a page to `apex.config.json`)
- **rm-page** (interactive: remove a page from `apex.config.json`)
- **clear-screenshots** (remove `.apex-auditor/screenshots/`)
- **init** (launch config wizard)
- **config <path>** (switch config file)

Cancel long-running commands:

- **Esc** (returns you to the shell prompt)

## Install

Install as a dev dependency (recommended):

```bash
pnpm add -D apex-auditor
```

Note: `pnpm apex-auditor` runs the version installed in your current project, which may be older than the latest release.

To always run the latest published version without installing:

Or run without installing:

```bash
pnpm dlx apex-auditor@latest
```

## Outputs

All outputs are written under `.apex-auditor/` in your project.

### `audit` outputs

- `summary.json`
- `summary-lite.json`
- `summary.md`
- `triage.md`
- `issues.json`
- `report.html`
- `screenshots/` (when `audit --diagnostics` or `audit --lhr` is used)
- `lighthouse-artifacts/diagnostics/` (when `audit --diagnostics` or `audit --lhr` is used)
- `lighthouse-artifacts/diagnostics-lite/` (when `audit --diagnostics` or `audit --lhr` is used)
- `lighthouse-artifacts/lhr/` (when `audit --lhr` is used)
- `accessibility-summary.json`
- `accessibility/` (axe-core artifacts per page/device)

Notes:

- **Runs-per-combo is always 1**. Re-run the same command to compare results.
- During an audit you will see a runtime progress line like `page X/Y — /path [device] | ETA ...`.
- After `audit` completes, type `open` to open the latest HTML report.
- Large JSON files may also be written as gzip copies (`*.json.gz`) to reduce disk size.

### `measure` outputs

- `measure-summary.json`
- `measure-summary-lite.json`
- `measure/` (screenshots and artifacts)

### `bundle` outputs

- `bundle-audit.json`

### `health` outputs

- `health.json`

### `links` outputs

- `links.json`

### `headers` outputs

- `headers.json`

### `console` outputs

- `console.json`

## Configuration

ApexAuditor reads `apex.config.json` by default.

Common fields:

- `baseUrl`
- `pages` (routes + devices)
- `throttlingMethod` (`simulate` or `devtools`)
- `cpuSlowdownMultiplier`
- `parallel`
- `warmUp`
- `auditTimeoutMs`
- `incremental` + `buildId`
- `gitIgnoreApexAuditorDir` (auto-add `.apex-auditor/` to `.gitignore`)
- `budgets`

Example:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 4,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "home", "devices": ["mobile", "desktop"] },
    { "path": "/docs", "label": "docs", "devices": ["desktop"] }
  ],
  "budgets": {
    "categories": { "performance": 80, "accessibility": 90, "bestPractices": 90, "seo": 90 },
    "metrics": { "lcpMs": 2500, "inpMs": 200, "cls": 0.1 }
  }
}
```

## CLI tips

- Use `pnpm dlx apex-auditor@latest` to avoid running an older installed version.
- Use `audit --flags` to print all audit flags/options.
- Use `audit --diagnostics` or `audit --lhr` when you want per-combo JSON artifacts and screenshots.
- Start with `triage.md` and `issues.json` when the suite is large.

## Documentation

The docs in `docs/` reflect the current shell-based workflow:

- `docs/getting-started.md`
- `docs/configuration-and-routes.md`
- `docs/cli-and-ci.md`

## Known issues

- **Large-run Lighthouse stability**: very large audits (many page/device combinations) may show higher score variance than manual Lighthouse runs and can intermittently hit worker/Chrome disconnects. Workaround: reduce parallelism (e.g. `--stable`) and retry.

## License

MIT
